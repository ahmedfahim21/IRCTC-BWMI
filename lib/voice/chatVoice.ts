import type { UIMessage } from "ai";

/** Text parts from one assistant message — tool cards are not spoken aloud. */
export function assistantMessageText(message: UIMessage): string {
  if (message.role !== "assistant") return "";
  return (message.parts ?? [])
    .filter((part): part is { type: "text"; text: string } => part.type === "text" && Boolean(part.text))
    .map((part) => part.text)
    .join("\n")
    .trim();
}

/** Text parts only — tool cards are not spoken aloud. */
export function lastAssistantText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const text = assistantMessageText(messages[index]);
    if (text) return text;
  }
  return "";
}

export async function speakAssistantText(text: string, languageCode: string): Promise<HTMLAudioElement> {
  const response = await fetch("/api/voice/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, languageCode }),
  });
  const body = (await response.json()) as { audio?: string; error?: string };
  if (!response.ok || !body.audio) {
    throw new Error(body.error ?? "Could not speak that reply");
  }
  const audio = new Audio(`data:audio/wav;base64,${body.audio}`);
  await audio.play();
  return audio;
}
