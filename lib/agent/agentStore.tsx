"use client";

import { Suspense, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ClassCode, QuotaCode } from "@/lib/types";
import type { UiActionName } from "./uiActions";

export type IntentResult = {
  ok: boolean;
  detail?: string;
  error?: string;
  state?: AgentAppState;
};

export type AgentAppState = {
  route: string;
  search: {
    from: string;
    to: string;
    date: string;
    quota: QuotaCode;
  } | null;
  searchResults: {
    from: string;
    to: string;
    date: string;
    quota: QuotaCode;
    highlightedTrain: string | null;
    trains: Array<{ number: string; name: string; classes: ClassCode[] }>;
  } | null;
  booking: {
    draftId: string;
    trainNumber: string;
    classCode: ClassCode;
    holdExpiresAt: string | null;
    passengers: Array<{ name: string; age: number; gender: string }>;
    contact: { phone: string; email: string };
    options: {
      addMeals: boolean;
      travelInsurance: boolean;
      keepTogether: boolean;
      autoUpgrade: boolean;
    };
    berthSelections: Array<{ coach: string; berth: number }>;
    activeCoach: string | null;
  } | null;
  berths: {
    coaches: string[];
    freeByCoach: Record<string, number>;
  } | null;
};

type PendingIntent = {
  id: string;
  name: UiActionName;
  input: Record<string, unknown>;
  createdAt: number;
};

const INTENT_TIMEOUT_MS = 4000;

const defaultState = (): AgentAppState => ({
  route: "/",
  search: null,
  searchResults: null,
  booking: null,
  berths: null,
});

let state = defaultState();
let snapshotVersion = 0;
let intentVersion = 0;
let pending: PendingIntent[] = [];

const snapshotListeners = new Set<() => void>();
const intentListeners = new Set<() => void>();
const resolvers = new Map<
  string,
  { resolve: (result: IntentResult) => void; timeout: ReturnType<typeof setTimeout> }
>();

function notifySnapshot() {
  snapshotVersion += 1;
  snapshotListeners.forEach((listener) => listener());
}

function notifyIntents() {
  intentVersion += 1;
  intentListeners.forEach((listener) => listener());
}

export function compactAppState(current: AgentAppState = state): AgentAppState {
  return {
    route: current.route,
    search: current.search ? { ...current.search } : null,
    searchResults: current.searchResults
      ? {
          ...current.searchResults,
          trains: current.searchResults.trains.slice(0, 8),
        }
      : null,
    booking: current.booking ? { ...current.booking } : null,
    berths: current.berths ? { ...current.berths } : null,
  };
}

function failureForIntent(name: UiActionName, input: Record<string, unknown>): IntentResult {
  const bookingActions: UiActionName[] = [
    "select_berth",
    "set_passengers",
    "set_contact",
    "set_options",
    "confirm",
  ];
  if (bookingActions.includes(name)) {
    return {
      ok: false,
      error: "The booking screen is not open — call navigate first.",
      detail: `Could not run ${name} — no screen accepted the action in time.`,
      state: compactAppState(),
    };
  }
  if (name === "highlight" || name === "select_class") {
    return {
      ok: false,
      error: "Search results are not on screen.",
      detail: `Could not run ${name} with ${JSON.stringify(input)}.`,
      state: compactAppState(),
    };
  }
  return {
    ok: false,
    error: `Timed out running ${name}.`,
    state: compactAppState(),
  };
}

export const agentStore = {
  getState: () => state,
  getSnapshotVersion: () => snapshotVersion,
  getIntentVersion: () => intentVersion,
  getPendingIntents: (): readonly PendingIntent[] => pending,

  subscribeSnapshot(listener: () => void) {
    snapshotListeners.add(listener);
    return () => snapshotListeners.delete(listener);
  },

  subscribeIntents(listener: () => void) {
    intentListeners.add(listener);
    return () => intentListeners.delete(listener);
  },

  publish(patch: Partial<AgentAppState>) {
    state = { ...state, ...patch };
    notifySnapshot();
  },

  publishRoute(route: string) {
    if (state.route === route) return;
    state = { ...state, route };
    notifySnapshot();
  },

  dispatchIntent(name: UiActionName, input: Record<string, unknown>): Promise<IntentResult> {
    return new Promise((resolve) => {
      const id = `intent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      pending = [...pending, { id, name, input, createdAt: Date.now() }];
      notifyIntents();

      const timeout = setTimeout(() => {
        const entry = resolvers.get(id);
        if (!entry) return;
        resolvers.delete(id);
        pending = pending.filter((intent) => intent.id !== id);
        entry.resolve(failureForIntent(name, input));
        notifyIntents();
      }, INTENT_TIMEOUT_MS);

      resolvers.set(id, { resolve, timeout });
    });
  },

  ack(id: string, result: IntentResult) {
    const entry = resolvers.get(id);
    if (!entry) return;
    clearTimeout(entry.timeout);
    resolvers.delete(id);
    pending = pending.filter((intent) => intent.id !== id);
    entry.resolve({ ...result, state: result.state ?? compactAppState() });
    notifyIntents();
  },

  resetIntents() {
    for (const intent of pending) {
      const entry = resolvers.get(intent.id);
      if (!entry) continue;
      clearTimeout(entry.timeout);
      entry.resolve({ ok: false, error: "Chat reset.", state: compactAppState() });
      resolvers.delete(intent.id);
    }
    pending = [];
    notifyIntents();
  },

  resetState() {
    state = { ...defaultState(), route: state.route };
    notifySnapshot();
  },

  resetAll() {
    agentStore.resetIntents();
    agentStore.resetState();
  },
};

export function useAgentSnapshot(): AgentAppState {
  return useSyncExternalStore(
    agentStore.subscribeSnapshot,
    () => agentStore.getState(),
    () => defaultState()
  );
}

export function useAgentPublish() {
  const publishRef = useRef(agentStore.publish);
  publishRef.current = agentStore.publish;
  return publishRef;
}

export function useAgentIntentDrain(
  ready: boolean,
  handler: (intent: PendingIntent) => Promise<IntentResult> | IntentResult,
  filter: (intent: PendingIntent) => boolean
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    if (!ready) return;

    const drain = () => {
      for (const intent of agentStore.getPendingIntents()) {
        if (!filterRef.current(intent)) continue;
        void Promise.resolve(handlerRef.current(intent)).then((result) => {
          agentStore.ack(intent.id, result);
        });
      }
    };

    drain();
    const unsubscribe = agentStore.subscribeIntents(drain);
    return () => {
      unsubscribe();
    };
  }, [ready]);
}

export function AgentRouteSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    const query = searchParams.toString();
    agentStore.publishRoute(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);
  return null;
}

export function AgentStoreProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AgentRouteSync />
      </Suspense>
      {children}
    </>
  );
}
