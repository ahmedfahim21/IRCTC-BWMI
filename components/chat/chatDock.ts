export type Dock = "left" | "right" | "bottom";
export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export type PanelSize = { width: number; height: number };
export type DockSizes = Record<Dock, PanelSize>;

export const DOCK_KEY = "irctc.chatDock";
export const DOCK_SIZE_KEY = "irctc.chatDockSize";

export const MIN_PANEL_WIDTH = 288;
export const MIN_PANEL_HEIGHT = 224;

export function isDock(value: string | null): value is Dock {
  return value === "left" || value === "right" || value === "bottom";
}

export function defaultDock(pathname: string): Dock {
  return pathname.startsWith("/search") ? "bottom" : "left";
}

export function readStoredDock(): Dock | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(DOCK_KEY);
  return isDock(stored) ? stored : null;
}

export function resolveDock(pathname: string): Dock {
  return readStoredDock() ?? defaultDock(pathname);
}

export function persistDock(dock: Dock): void {
  localStorage.setItem(DOCK_KEY, dock);
}

export function defaultPanelSize(dock: Dock): PanelSize {
  switch (dock) {
    case "bottom":
      return { width: 768, height: 288 };
    case "left":
    case "right":
      return { width: 352, height: 512 };
    default: {
      const _exhaustive: never = dock;
      return _exhaustive;
    }
  }
}

function isPanelSize(value: unknown): value is PanelSize {
  if (typeof value !== "object" || value === null) return false;
  if (!("width" in value) || !("height" in value)) return false;
  return (
    typeof value.width === "number" &&
    Number.isFinite(value.width) &&
    typeof value.height === "number" &&
    Number.isFinite(value.height)
  );
}

export function defaultDockSizes(): DockSizes {
  return {
    left: defaultPanelSize("left"),
    right: defaultPanelSize("right"),
    bottom: defaultPanelSize("bottom"),
  };
}

export function readDockSizes(): DockSizes {
  const fallback = defaultDockSizes();
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(DOCK_SIZE_KEY);
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return fallback;
    return {
      left: "left" in parsed && isPanelSize(parsed.left) ? parsed.left : fallback.left,
      right: "right" in parsed && isPanelSize(parsed.right) ? parsed.right : fallback.right,
      bottom: "bottom" in parsed && isPanelSize(parsed.bottom) ? parsed.bottom : fallback.bottom,
    };
  } catch {
    return fallback;
  }
}

export function persistDockSizes(sizes: DockSizes): void {
  localStorage.setItem(DOCK_SIZE_KEY, JSON.stringify(sizes));
}

export function viewportSizeBounds(): { maxWidth: number; maxHeight: number } {
  if (typeof window === "undefined") {
    return { maxWidth: 1200, maxHeight: 800 };
  }
  return {
    maxWidth: Math.max(MIN_PANEL_WIDTH, window.innerWidth - 32),
    maxHeight: Math.max(MIN_PANEL_HEIGHT, window.innerHeight - 80),
  };
}

export function clampSize(size: PanelSize, maxWidth: number, maxHeight: number): PanelSize {
  return {
    width: Math.min(maxWidth, Math.max(MIN_PANEL_WIDTH, size.width)),
    height: Math.min(maxHeight, Math.max(MIN_PANEL_HEIGHT, size.height)),
  };
}

function edgeHas(edge: ResizeEdge, dir: "n" | "s" | "e" | "w"): boolean {
  switch (dir) {
    case "n":
      return edge === "n" || edge === "ne" || edge === "nw";
    case "s":
      return edge === "s" || edge === "se" || edge === "sw";
    case "e":
      return edge === "e" || edge === "ne" || edge === "se";
    case "w":
      return edge === "w" || edge === "nw" || edge === "sw";
    default: {
      const _exhaustive: never = dir;
      return _exhaustive;
    }
  }
}

export function applyResize({
  dock,
  size,
  edge,
  dx,
  dy,
  maxWidth,
  maxHeight,
}: {
  dock: Dock;
  size: PanelSize;
  edge: ResizeEdge;
  dx: number;
  dy: number;
  maxWidth: number;
  maxHeight: number;
}): PanelSize {
  let { width, height } = size;
  const widthFactor = dock === "bottom" ? 2 : 1;
  if (edgeHas(edge, "e")) width += dx * widthFactor;
  if (edgeHas(edge, "w")) width -= dx * widthFactor;
  if (edgeHas(edge, "s")) height += dy;
  if (edgeHas(edge, "n")) height -= dy;
  return clampSize({ width, height }, maxWidth, maxHeight);
}

export function dockPanelClass(dock: Dock): string {
  switch (dock) {
    case "bottom":
      return "bottom-[3.75rem] left-1/2 -translate-x-1/2 rounded-xl sm:bottom-4";
    case "right":
      return "bottom-[3.75rem] right-0 rounded-xl sm:bottom-4 sm:right-4";
    case "left":
      return "bottom-[3.75rem] left-0 rounded-xl sm:bottom-4 sm:left-4";
    default: {
      const _exhaustive: never = dock;
      return _exhaustive;
    }
  }
}

export function dockTriggerClass(dock: Dock): string {
  switch (dock) {
    case "left":
      return "left-4 sm:left-6";
    case "right":
      return "right-4 sm:right-6";
    case "bottom":
      return "left-1/2 -translate-x-1/2";
    default: {
      const _exhaustive: never = dock;
      return _exhaustive;
    }
  }
}
