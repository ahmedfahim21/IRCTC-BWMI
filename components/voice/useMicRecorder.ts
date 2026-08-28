"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MicPhase = "idle" | "listening" | "thinking" | "error";

export interface MicTranscription {
  transcript: string;
  languageCode: string;
  confidence: number | null;
}

/** Stop on its own after this much quiet, so nobody has to hunt for the button. */
const SILENCE_MS = 1400;
const MAX_RECORDING_MS = 12_000;

interface ListenResponse {
  transcript?: string;
  languageCode?: string;
  confidence?: number | null;
  error?: string;
}

/**
 * Push-to-talk mic for chat. Records WebM/Opus (or MP4 on Safari), sends one
 * clip to /api/voice/listen, and returns a native-script transcript.
 */
export function useMicRecorder(onResult: (result: MicTranscription) => void) {
  const [phase, setPhase] = useState<MicPhase>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const frame = useRef<number>(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

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
        const body = (await response.json()) as ListenResponse;
        if (!response.ok) throw new Error(body.error ?? "Could not understand that");

        const transcript = body.transcript?.trim();
        if (!transcript) throw new Error("Could not hear anything in that recording");

        onResultRef.current({
          transcript,
          languageCode: body.languageCode ?? "en-IN",
          confidence: body.confidence ?? null,
        });
        setPhase("idle");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Something went wrong");
        setPhase("error");
      }
    },
    []
  );

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      stream.current = media;

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
      setError(
        denied
          ? "Microphone access was blocked. Allow it in your browser settings to use voice."
          : "Couldn't reach the microphone."
      );
      setPhase("error");
    }
  }, [cleanup, send, stop]);

  const reset = useCallback(() => {
    setError(null);
    setPhase("idle");
  }, []);

  const toggle = useCallback(() => {
    if (phase === "listening") stop();
    else if (phase === "idle" || phase === "error") void start();
  }, [phase, start, stop]);

  return {
    phase,
    level,
    error,
    listening: phase === "listening",
    busy: phase === "thinking",
    start,
    stop,
    toggle,
    reset,
  };
}
