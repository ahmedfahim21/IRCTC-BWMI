import type { NextRequest } from "next/server";
import { speak, translateText, isVoiceEnabled } from "@/lib/voice/sarvam";
import { handler, json, badRequest } from "@/lib/api/http";

/** Speak a line of text — used to read results back without a new recording. */
export const POST = handler(async (request: NextRequest) => {
  if (!isVoiceEnabled()) return badRequest("Voice is not configured on this server");

  const body = (await request.json()) as { text?: string; languageCode?: string };
  const text = body.text?.trim();
  if (!text) return badRequest("text is required");

  const languageCode = body.languageCode ?? "en-IN";
  const spoken = await translateText(text, languageCode);
  const voice = await speak(spoken, languageCode);

  return json({ text: spoken, languageCode: voice.languageCode, audio: voice.audio });
});
