import type { NextRequest } from "next/server";
import { transcribe, isVoiceEnabled } from "@/lib/voice/sarvam";
import { handler, json, badRequest } from "@/lib/api/http";

/** Transcribe a short recording into native script for chat input. */
export const POST = handler(async (request: NextRequest) => {
  if (!isVoiceEnabled()) {
    return badRequest("Voice is not configured on this server. Set SARVAM_API_KEY to enable it.");
  }

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) return badRequest("An audio recording is required");
  if (audio.size < 1200) return badRequest("That recording was too short to hear anything");

  const heard = await transcribe(audio);

  return json({
    transcript: heard.transcript,
    languageCode: heard.languageCode,
    confidence: heard.confidence,
  });
});
