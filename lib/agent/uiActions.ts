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

export type UiActionDefinition = {
  name: UiActionName;
  description: string;
  inputSchema: ReturnType<typeof object>;
  readOnly?: boolean;
};

export const UI_ACTION_DEFINITIONS: UiActionDefinition[] = [
  {
    name: "navigate",
    description: "Open a path in the app (search, train, booking draft, trip, map, home).",
    inputSchema: object({ href: str("Path, e.g. /search?from=NDLS&to=MAS") }, ["href"]),
  },
  {
    name: "set_search",
    description: "Write origin, destination, date and quota into the URL and open results.",
    inputSchema: object(
      {
        from: str("Origin station code or city:Name token"),
        to: str("Destination station code or city:Name token"),
        date: str("YYYY-MM-DD"),
        quota: str("Quota code", { enum: ["GN", "TQ", "PT", "LD", "SS"] }),
      },
      ["from", "to", "date"]
    ),
  },
  {
    name: "open_train",
    description: "Open a train's route page.",
    inputSchema: object({ number: str("Five-digit train number"), date: str("Optional journey date") }, ["number"]),
  },
  {
    name: "select_class",
    description: "Highlight a travel class on the current search or booking.",
    inputSchema: object(
      { classCode: str("Class code", { enum: ["1A", "2A", "3A", "3E", "SL", "CC", "EC", "2S"] }) },
      ["classCode"]
    ),
  },
  {
    name: "select_berth",
    description: "Choose a berth on the visible coach diagram. Prefers berthType when given (LB, MB, UB, SL, SU).",
    inputSchema: object(
      {
        coach: str("Coach code, e.g. B3"),
        berth: { type: "integer", description: "Berth number" },
        berthType: str("Optional berth type to prefer", { enum: ["LB", "MB", "UB", "SL", "SU", "WS", "AS", "CB"] }),
      },
      ["coach", "berth"]
    ),
  },
  {
    name: "set_passengers",
    description: "Fill the passenger list on the current booking draft.",
    inputSchema: object(
      {
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
      },
      ["passengers"]
    ),
  },
  {
    name: "set_contact",
    description: "Fill phone and email on the current booking draft.",
    inputSchema: object({ phone: str("10-digit mobile"), email: str("Email, optional") }, ["phone"]),
  },
  {
    name: "set_options",
    description: "Toggle booking options on the checkout screen: meals, travel insurance, keep-together, auto-upgrade.",
    inputSchema: object({
      addMeals: { type: "boolean", description: "Order meals to the seat" },
      travelInsurance: { type: "boolean", description: "Add travel insurance" },
      keepTogether: { type: "boolean", description: "Keep passengers in the same coach" },
      autoUpgrade: { type: "boolean", description: "Auto-upgrade if a higher class has space" },
    }),
  },
  {
    name: "confirm",
    description: "Confirm the current held booking. Payment is simulated.",
    inputSchema: object({}),
  },
  {
    name: "highlight",
    description: "Highlight a train on the map or results list.",
    inputSchema: object({ trainNumber: str("Five-digit train number") }, ["trainNumber"]),
  },
];

export function isUiAction(name: string): name is UiActionName {
  return (UI_ACTION_NAMES as readonly string[]).includes(name);
}

export function clientUiTools(): ToolSet {
  const tools: ToolSet = {};
  for (const def of UI_ACTION_DEFINITIONS) {
    tools[def.name] = tool({
      description: def.description,
      inputSchema: jsonSchema(def.inputSchema),
    });
  }
  return tools;
}

export const VOICE_TRANSCRIPT_EVENT = "irctc:voice-transcript";

export function emitVoiceTranscript(transcript: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VOICE_TRANSCRIPT_EVENT, { detail: { transcript } }));
}
