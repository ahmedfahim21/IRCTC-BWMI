import { jsonSchema, tool, type ToolSet } from "ai";

const object = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object" as const,
  properties,
  required,
  additionalProperties: false,
});
const str = (description: string, extra: Record<string, unknown> = {}) => ({ type: "string", description, ...extra });

export const UI_ACTION_NAMES = [
  "navigate",
  "set_search",
  "open_train",
  "select_class",
  "select_berth",
  "set_passengers",
  "set_contact",
  "set_options",
  "confirm",
  "highlight",
] as const;

export type UiActionName = (typeof UI_ACTION_NAMES)[number];

export function isUiAction(name: string): name is UiActionName {
  return (UI_ACTION_NAMES as readonly string[]).includes(name);
}

export function clientUiTools(): ToolSet {
  return {
    navigate: tool({
      description: "Open a path in the app (search, train, booking draft, trip, map, home).",
      inputSchema: jsonSchema(object({ href: str("Path, e.g. /search?from=NDLS&to=MAS") }, ["href"])),
    }),
    set_search: tool({
      description: "Write origin, destination, date and quota into the URL and open results.",
      inputSchema: jsonSchema(
        object(
          {
            from: str("Origin station code or city:Name token"),
            to: str("Destination station code or city:Name token"),
            date: str("YYYY-MM-DD"),
            quota: str("Quota code", { enum: ["GN", "TQ", "PT", "LD", "SS"] }),
          },
          ["from", "to", "date"]
        )
      ),
    }),
    open_train: tool({
      description: "Open a train's route page.",
      inputSchema: jsonSchema(object({ number: str("Five-digit train number"), date: str("Optional journey date") }, ["number"])),
    }),
    select_class: tool({
      description: "Highlight a travel class on the current search or booking.",
      inputSchema: jsonSchema(
        object({ classCode: str("Class code", { enum: ["1A", "2A", "3A", "3E", "SL", "CC", "EC", "2S"] }) }, ["classCode"])
      ),
    }),
    select_berth: tool({
      description: "Choose a berth on the visible coach diagram. Prefers berthType when given (LB, MB, UB, SL, SU).",
      inputSchema: jsonSchema(
        object({
          coach: str("Coach code, e.g. B3"),
          berth: { type: "integer", description: "Berth number" },
          berthType: str("Optional berth type to prefer", { enum: ["LB", "MB", "UB", "SL", "SU", "WS", "AS", "CB"] }),
        }, ["coach", "berth"])
      ),
    }),
    set_passengers: tool({
      description: "Fill the passenger list on the current booking draft.",
      inputSchema: jsonSchema(
        object({
          passengers: {
            type: "array",
            items: object(
              {
                name: str("Name as on ID"),
                age: { type: "integer" },
                gender: str("Gender", { enum: ["male", "female", "other"] }),
              },
              ["name", "age", "gender"]
            ),
          },
        }, ["passengers"])
      ),
    }),
    set_contact: tool({
      description: "Fill phone and email on the current booking draft.",
      inputSchema: jsonSchema(object({ phone: str("10-digit mobile"), email: str("Email, optional") }, ["phone"])),
    }),
    set_options: tool({
      description:
        "Toggle booking options on the checkout screen: meals, travel insurance, keep-together, auto-upgrade.",
      inputSchema: jsonSchema(
        object({
          addMeals: { type: "boolean", description: "Order meals to the seat" },
          travelInsurance: { type: "boolean", description: "Add travel insurance" },
          keepTogether: { type: "boolean", description: "Keep passengers in the same coach" },
          autoUpgrade: { type: "boolean", description: "Auto-upgrade if a higher class has space" },
        })
      ),
    }),
    confirm: tool({
      description: "Confirm the current held booking. Payment is simulated.",
      inputSchema: jsonSchema(object({})),
    }),
    highlight: tool({
      description: "Highlight a train on the map or results list.",
      inputSchema: jsonSchema(object({ trainNumber: str("Five-digit train number") }, ["trainNumber"])),
    }),
  };
}

export const AGENT_EVENT = "irctc:agent-action";
export const VOICE_TRANSCRIPT_EVENT = "irctc:voice-transcript";

export function emitVoiceTranscript(transcript: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VOICE_TRANSCRIPT_EVENT, { detail: { transcript } }));
}
