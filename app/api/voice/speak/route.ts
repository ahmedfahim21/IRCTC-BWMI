import type { NextRequest } from "next/server";
import { speak, isVoiceEnabled } from "@/lib/voice/sarvam";
import { handler, json, badRequest } from "@/lib/api/http";

/** Speak a line of assistant text — already in the target language. */
export const POST = handler(async (request: NextRequest) => {
  if (!isVoiceEnabled()) return badRequest("Voice is not configured on this server");

  const body = (await request.json()) as { text?: string; languageCode?: string };
  const text = body.text?.trim();
  if (!text) return badRequest("text is required");

  const languageCode = body.languageCode ?? "en-IN";
  const voice = await speak(text, languageCode);

  return json({ text, languageCode: voice.languageCode, audio: voice.audio });
});
