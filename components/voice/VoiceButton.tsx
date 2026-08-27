"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mic, Square, Volume2, X } from "lucide-react";
import { api } from "@/lib/apiClient";
import { cn } from "@/components/ui/cn";

type Phase = "idle" | "listening" | "thinking" | "answered" | "error";

interface VoiceResult {
  transcript: string;
  languageCode: string;
  intent: { kind: string; href?: string; reply: string };
  spokenReply: string;
  audio: string | null;
}

/** Stop on its own after this much quiet, so nobody has to hunt for the button. */
const SILENCE_MS = 1400;
const MAX_RECORDING_MS = 12_000;

/**
 * Speak to navigate. Records, sends one turn to the server, then acts on what
 * came back and reads the answer aloud in whatever language was spoken.
 *
 * Recorded as WebM/Opus — about a fifth the size of WAV, which is the
 * difference between usable and not on a slow connection.
 */
export function VoiceButton() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(0);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const frame = useRef<number>(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: ({ signal }) => api.status(signal),
    staleTime: 5 * 60_000,
  });

  const cleanup = useCallback(() => {
    cancelAnimationFrame(frame.current);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void audioContext.current?.close().catch(() => {});
    audioContext.current = null;
    setLevel(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const send = useCallback(
    async (blob: Blob) => {
      setPhase("thinking");
      try {
        const form = new FormData();
        form.append("audio", blob, "speech.webm");
        const response = await fetch("/api/voice/listen", { method: "POST", body: form });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not understand that");

        const voiceResult = body as VoiceResult;
        setResult(voiceResult);
        setPhase("answered");

        if (voiceResult.audio) {
          player.current?.pause();
          const audio = new Audio(`data:audio/wav;base64,${voiceResult.audio}`);
          player.current = audio;
          void audio.play().catch(() => {});
        }

        // Give the reply a moment to start before the page changes under it.
        if (voiceResult.intent.href) {
          timers.current.push(setTimeout(() => router.push(voiceResult.intent.href!), 700));
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Something went wrong");
        setPhase("error");
      }
    },
    [router]
  );

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      stream.current = media;

      // Safari has no WebM; it records to MP4. The server normalises whichever
      // container comes back, so we just take the best one on offer.
      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((candidate) =>
          MediaRecorder.isTypeSupported(candidate)
        ) ?? "";
      const recording = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
      recorder.current = recording;
      chunks.current = [];

      recording.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      recording.onstop = () => {
        cleanup();
        const blob = new Blob(chunks.current, { type: mimeType || "audio/webm" });
        if (blob.size < 1200) {
          setError("That was too short to hear. Hold on a moment longer.");
          setPhase("error");
          return;
        }
        void send(blob);
      };

      recording.start();
      setPhase("listening");

      // Level meter, and auto-stop once the speaking clearly stops.
      const context = new AudioContext();
      audioContext.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(media).connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let quietSince: number | null = null;
      let hasSpoken = false;

      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (const value of buffer) sum += (value - 128) ** 2;
        const rms = Math.sqrt(sum / buffer.length) / 128;
        setLevel(Math.min(1, rms * 6));

        if (rms > 0.045) {
          hasSpoken = true;
          quietSince = null;
        } else if (hasSpoken) {
          quietSince ??= performance.now();
          if (performance.now() - quietSince > SILENCE_MS) {
            stop();
            return;
          }
        }
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);

      timers.current.push(setTimeout(stop, MAX_RECORDING_MS));
    } catch (cause) {
      cleanup();
      const denied = cause instanceof DOMException && cause.name === "NotAllowedError";
      setError(denied ? "Microphone access was blocked. Allow it in your browser settings to use voice." : "Couldn't reach the microphone.");
      setPhase("error");
    }
  }, [cleanup, send, stop]);

  // Voice is optional; without a key the control would do nothing, so hide it.
  if (!status?.voice) return null;

  const listening = phase === "listening";
  const busy = phase === "thinking";

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[3.75rem] z-40 flex flex-col items-end gap-2 p-4 sm:bottom-0 sm:p-6">
        {(result || error) && (
          <div className="pointer-events-auto w-full max-w-sm self-stretch rounded-xl border border-border bg-surface p-3.5 shadow-[var(--shadow-lg)] sm:self-end">
            <div className="mb-1.5 flex items-start gap-2">
              <Volume2 className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
              <div className="min-w-0 flex-1">
                {result && (
                  <>
                    <p className="text-[0.75rem] text-faint">You said</p>
                    <p className="text-[0.875rem] text-text">{result.transcript}</p>
                    <p className="mt-2 text-[0.8125rem] leading-relaxed text-dim">{result.spokenReply}</p>
                  </>
                )}
                {error && <p className="text-[0.8125rem] leading-relaxed text-danger">{error}</p>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError(null);
                  setPhase("idle");
                }}
                aria-label="Dismiss"
                className="shrink-0 rounded-md p-1 text-faint transition-colors hover:text-text"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={listening ? stop : start}
          disabled={busy}
          aria-label={listening ? "Stop listening" : "Search by voice"}
          className={cn(
            "pointer-events-auto relative flex size-14 items-center justify-center rounded-full shadow-[var(--shadow-lg)] transition-colors",
            listening ? "bg-danger text-[color:var(--surface)]" : "bg-brand text-on-brand",
            busy && "opacity-70"
          )}
        >
          {listening && (
            <span
              className="absolute inset-0 rounded-full bg-danger opacity-30"
              style={{ transform: `scale(${1 + level * 0.7})`, transition: "transform 80ms linear" }}
              aria-hidden
            />
          )}
          <span className="relative">
            {busy ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : listening ? (
              <Square className="size-4 fill-current" aria-hidden />
            ) : (
              <Mic className="size-5" aria-hidden />
            )}
          </span>
        </button>

        <p aria-live="polite" className="sr-only">
          {listening ? "Listening" : busy ? "Working that out" : result ? result.spokenReply : ""}
        </p>
      </div>

      {listening && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[9.5rem] z-40 flex justify-center px-4 sm:bottom-24">
          <p className="rounded-full bg-surface px-3 py-1.5 text-[0.75rem] text-dim shadow-[var(--shadow-md)]">
            Listening — say something like &ldquo;trains from Delhi to Mumbai tomorrow&rdquo;
          </p>
        </div>
      )}
    </>
  );
}
