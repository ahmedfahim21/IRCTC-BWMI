import { isLive, quotaStatus } from "@/lib/railradar/source";
import { isVoiceEnabled } from "@/lib/voice/sarvam";
import { handler, json } from "@/lib/api/http";

/**
 * What's real and what's modelled, so the UI can say so instead of implying
 * everything is live. Never returns the API key or any part of it.
 */
export const GET = handler(async () => {
  const live = isLive();
  const quota = live ? await quotaStatus() : null;

  return json({
    live,
    voice: isVoiceEnabled(),
    chatLive: Boolean(process.env.ANTHROPIC_API_KEY) && process.env.CHAT_FAKE !== "1",
    quota,
    sources: {
      stationSearch: live ? "live" : "generated",
      trainSchedule: live ? "live" : "generated",
      runningStatus: live ? "live" : "generated",
      coachComposition: live ? "live" : "generated",
      platformPosition: live ? "live" : "generated",
      /** Affordable live: one upstream call returns a fortnight. */
      dateStrip: live ? "live" : "generated",
      /** The seats endpoint is per train per class; a results page would cost dozens of calls. */
      availabilityMatrix: "generated",
      confirmationOdds: "generated",
      fares: "generated",
      berthMap: "generated",
      bookings: "generated",
    },
  });
});
