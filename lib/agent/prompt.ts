import { serverInstructions } from "@/lib/mcp/tools";
import { todayIso } from "@/lib/domain/time";
import type { AgentAppState } from "./agentStore";

function renderAppState(appState: AgentAppState | null | undefined): string {
  if (!appState) return "Route: unknown. No search or booking context yet.";

  const lines: string[] = [`Route: ${appState.route || "/"}`];

  if (appState.search) {
    lines.push(
      `Search form: ${appState.search.from} → ${appState.search.to} on ${appState.search.date} (${appState.search.quota}).`
    );
  }

  if (appState.searchResults) {
    const { from, to, date, quota, highlightedTrain, trains } = appState.searchResults;
    const trainSummary =
      trains.length === 0
        ? "no trains on screen"
        : trains
            .slice(0, 6)
            .map((train, index) => {
              const marker = highlightedTrain === train.number ? "*" : "";
              return `${index + 1}. ${train.number} ${train.name} [${train.classes.join(", ")}]${marker}`;
            })
            .join("; ");
    lines.push(`Search results: ${from} → ${to} on ${date} (${quota}). Trains: ${trainSummary}.`);
    if (highlightedTrain) lines.push(`Highlighted train: ${highlightedTrain}.`);
  }

  if (appState.booking) {
    const booking = appState.booking;
    const pax =
      booking.passengers.length === 0
        ? "none yet"
        : booking.passengers.map((p) => `${p.name || "(unnamed)"} ${p.age}${p.gender[0]}`).join(", ");
    const berths =
      booking.berthSelections.length === 0
        ? "none chosen"
        : booking.berthSelections.map((b) => `${b.coach}-${b.berth}`).join(", ");
    lines.push(
      `Booking draft ${booking.draftId}: train ${booking.trainNumber} in ${booking.classCode}. Hold expires ${booking.holdExpiresAt ?? "unknown"}.`,
      `Passengers: ${pax}. Contact: ${booking.contact.phone || "missing"} / ${booking.contact.email || "no email"}.`,
      `Options: meals=${booking.options.addMeals}, insurance=${booking.options.travelInsurance}, together=${booking.options.keepTogether}, auto-upgrade=${booking.options.autoUpgrade}.`,
      `Berths: ${berths}. Active coach: ${booking.activeCoach ?? "none"}.`
    );
  }

  if (appState.berths) {
    const free = Object.entries(appState.berths.freeByCoach)
      .map(([coach, count]) => `${coach}:${count} free`)
      .join(", ");
    lines.push(`Coach diagram: ${appState.berths.coaches.join(", ")}. Free berths: ${free || "unknown"}.`);
  }

  return lines.join("\n");
}

export function buildChatSystemPrompt(appState?: AgentAppState | null): string {
  return (
    serverInstructions() +
    ` Today is ${todayIso()}. Treat “tomorrow” as the next calendar day after that, never a date in another year.` +
    " Talk like a booking clerk at a window: short, specific, no filler." +
    " Ask a short question when a city has more than one station, when the date is missing, or when they have not said a class." +
    " If they change a station or the whole journey mid-conversation, look up the new pair and call set_search again — do not keep searching the old pair." +
    " After a server tool, always drive the UI with navigate, set_search, open_train, select_class, select_berth, set_passengers, set_contact, set_options, confirm, or highlight so the screens move with you." +
    " When they ask for meals, insurance, keep-together or auto-upgrade, call set_options so the switches on the booking screen move." +
    " After start_booking, navigate to the draft so the berth map is on screen. Never claim a real ticket was issued." +
    " Trust the On screen right now block for what the user can see. If a UI action fails, read the tool result and explain honestly." +
    "\n\nOn screen right now:\n" +
    renderAppState(appState)
  );
}

export { renderAppState };
