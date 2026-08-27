import { describe, expect, it } from "vitest";
import { normalizeAudioType } from "@/lib/voice/sarvam";

/**
 * Sarvam matches the upload's content type exactly, so a codec parameter — which
 * is what every browser's MediaRecorder attaches — gets a 400 back. These lock
 * in the normalisation that strips it.
 */
describe("audio type normalisation", () => {
  it("strips the codec parameter every browser attaches", () => {
    expect(normalizeAudioType("audio/webm;codecs=opus")).toEqual({ contentType: "audio/webm", extension: "webm" });
    expect(normalizeAudioType("audio/ogg;codecs=opus")).toEqual({ contentType: "audio/ogg", extension: "ogg" });
    expect(normalizeAudioType("audio/mp4;codecs=mp4a.40.2")).toEqual({ contentType: "audio/mp4", extension: "m4a" });
  });

  it("passes through the containers Sarvam already accepts", () => {
    expect(normalizeAudioType("audio/webm").contentType).toBe("audio/webm");
    expect(normalizeAudioType("audio/wav").contentType).toBe("audio/wav");
    expect(normalizeAudioType("audio/mpeg").contentType).toBe("audio/mpeg");
  });

  it("remaps a mic-only recording that got labelled as video", () => {
    expect(normalizeAudioType("video/webm;codecs=opus")).toEqual({ contentType: "audio/webm", extension: "webm" });
    expect(normalizeAudioType("video/mp4")).toEqual({ contentType: "audio/mp4", extension: "m4a" });
  });

  it("folds the aliases onto one canonical type", () => {
    expect(normalizeAudioType("audio/x-wav").contentType).toBe("audio/wav");
    expect(normalizeAudioType("audio/wave").contentType).toBe("audio/wav");
    expect(normalizeAudioType("audio/mp3").contentType).toBe("audio/mpeg");
    expect(normalizeAudioType("audio/x-m4a").contentType).toBe("audio/mp4");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(normalizeAudioType("  AUDIO/WEBM ; codecs=opus ").contentType).toBe("audio/webm");
  });

  it("falls back to WebM for anything unlabelled or unknown", () => {
    for (const input of ["", "application/octet-stream", "audio/flac"]) {
      expect(normalizeAudioType(input), input).toEqual({ contentType: "audio/webm", extension: "webm" });
    }
  });

  it("never returns a type carrying a parameter", () => {
    const inputs = ["audio/webm;codecs=opus", "audio/ogg;codecs=vorbis", "audio/mp4;codecs=mp4a", "video/webm", ""];
    for (const input of inputs) {
      expect(normalizeAudioType(input).contentType, input).not.toContain(";");
    }
  });
});
