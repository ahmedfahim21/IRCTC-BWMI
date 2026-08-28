/**
 * Sarvam speech services.
 *
 * STT uses Saaras v3 in transcribe mode so the user's native script lands in
 * chat. TTS reads assistant replies aloud in the same language when requested.
 *
 * The key is server-side only and never reaches the browser.
 */
const BASE = "https://api.sarvam.ai";

/** Sarvam model IDs — keep in sync with Sarvam dashboard deprecations. */
export const SAARAS_MODEL = "saaras:v3" as const;
export const SAARAS_STT_MODE = "transcribe" as const;
export const BULBUL_MODEL = "bulbul:v3" as const;
export const BULBUL_SPEAKER = "shubh" as const;

export function voiceModels() {
  return {
    stt: SAARAS_MODEL,
    sttMode: SAARAS_STT_MODE,
    tts: BULBUL_MODEL,
    ttsSpeaker: BULBUL_SPEAKER,
  };
}

export function isVoiceEnabled(): boolean {
  return Boolean(process.env.SARVAM_API_KEY);
}

function key(): string {
  const value = process.env.SARVAM_API_KEY;
  if (!value) throw new Error("SARVAM_API_KEY is not configured");
  return value;
}

export class SarvamError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "SarvamError";
  }
}

async function unwrap(response: Response, what: string) {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new SarvamError(`Sarvam ${what} failed (${response.status}): ${detail.slice(0, 200)}`, response.status);
  }
  return response.json();
}

/**
 * Sarvam validates the upload's content type by exact string match, and every
 * browser's MediaRecorder attaches a codec parameter — Chrome sends
 * `audio/webm;codecs=opus`, Firefox `audio/ogg;codecs=opus`. Both are rejected
 * outright while the bare base type is accepted, so strip the parameter and
 * give the file an extension that matches.
 *
 * Audio-only recordings are sometimes labelled `video/webm` when the caller
 * didn't constrain the mime type; that's the same container and is remapped.
 */
const AUDIO_TYPES: Record<string, { contentType: string; extension: string }> = {
  "audio/webm": { contentType: "audio/webm", extension: "webm" },
  "video/webm": { contentType: "audio/webm", extension: "webm" },
  "audio/ogg": { contentType: "audio/ogg", extension: "ogg" },
  "video/ogg": { contentType: "audio/ogg", extension: "ogg" },
  "audio/mp4": { contentType: "audio/mp4", extension: "m4a" },
  "audio/x-m4a": { contentType: "audio/mp4", extension: "m4a" },
  "video/mp4": { contentType: "audio/mp4", extension: "m4a" },
  "audio/mpeg": { contentType: "audio/mpeg", extension: "mp3" },
  "audio/mp3": { contentType: "audio/mpeg", extension: "mp3" },
  "audio/wav": { contentType: "audio/wav", extension: "wav" },
  "audio/x-wav": { contentType: "audio/wav", extension: "wav" },
  "audio/wave": { contentType: "audio/wav", extension: "wav" },
};

export function normalizeAudioType(rawType: string): { contentType: string; extension: string } {
  const base = (rawType ?? "").split(";")[0].trim().toLowerCase();
  // WebM is what MediaRecorder produces nearly everywhere, so it's the safest
  // guess when a browser hands us something unlabelled.
  return AUDIO_TYPES[base] ?? { contentType: "audio/webm", extension: "webm" };
}

export interface Transcription {
  /** Native-script transcript in the language spoken. */
  transcript: string;
  /** BCP-47 of the language actually spoken, e.g. "hi-IN". */
  languageCode: string;
  confidence: number | null;
}

export async function transcribe(audio: Blob): Promise<Transcription> {
  const { contentType, extension } = normalizeAudioType(audio.type);
  const payload =
    audio.type === contentType ? audio : new Blob([await audio.arrayBuffer()], { type: contentType });

  const form = new FormData();
  form.append("file", payload, `speech.${extension}`);
  form.append("model", SAARAS_MODEL);
  form.append("mode", SAARAS_STT_MODE);

  const response = await fetch(`${BASE}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": key() },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });

  const body = await unwrap(response, "speech-to-text");
  return {
    transcript: (body.transcript ?? "").trim(),
    languageCode: body.language_code ?? "en-IN",
    confidence: typeof body.language_probability === "number" ? body.language_probability : null,
  };
}

/** Supported by Sarvam TTS. Anything else falls back to English. */
const SPEAKABLE = new Set([
  "en-IN", "hi-IN", "bn-IN", "gu-IN", "kn-IN", "ml-IN",
  "mr-IN", "od-IN", "pa-IN", "ta-IN", "te-IN",
]);

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (targetLanguage === "en-IN" || !SPEAKABLE.has(targetLanguage)) return text;
  try {
    const response = await fetch(`${BASE}/translate`, {
      method: "POST",
      headers: { "api-subscription-key": key(), "Content-Type": "application/json" },
      body: JSON.stringify({
        input: text,
        source_language_code: "en-IN",
        target_language_code: targetLanguage,
        model: "mayura:v1",
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = await unwrap(response, "translate");
    return body.translated_text || text;
  } catch {
    // Speaking English is a fine outcome; failing the whole turn is not.
    return text;
  }
}

export interface Speech {
  /** base64-encoded WAV. */
  audio: string;
  languageCode: string;
}

export async function speak(text: string, languageCode = "en-IN"): Promise<Speech> {
  const target = SPEAKABLE.has(languageCode) ? languageCode : "en-IN";
  const response = await fetch(`${BASE}/text-to-speech`, {
    method: "POST",
    headers: { "api-subscription-key": key(), "Content-Type": "application/json" },
    body: JSON.stringify({
      // Keep it short: TTS latency scales with length and this is spoken aloud.
      text: text.slice(0, 2500),
      target_language_code: target,
      speaker: BULBUL_SPEAKER,
      model: BULBUL_MODEL,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const body = await unwrap(response, "text-to-speech");
  const audio = Array.isArray(body.audios) ? body.audios[0] : body.audio;
  if (!audio) throw new SarvamError("Sarvam returned no audio", 502);
  return { audio, languageCode: target };
}
