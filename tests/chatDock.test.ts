import { describe, expect, it } from "vitest";
import {
  applyResize,
  defaultDock,
  defaultPanelSize,
  dockPanelClass,
  dockTriggerClass,
  isDock,
  MIN_PANEL_HEIGHT,
  MIN_PANEL_WIDTH,
} from "@/components/chat/chatDock";

describe("chat dock", () => {
  it("accepts only the three stored sides", () => {
    expect(isDock("left")).toBe(true);
    expect(isDock("right")).toBe(true);
    expect(isDock("bottom")).toBe(true);
    expect(isDock("center")).toBe(false);
    expect(isDock(null)).toBe(false);
  });

  it("defaults search to the bottom dock and other pages to the left", () => {
    expect(defaultDock("/search")).toBe("bottom");
    expect(defaultDock("/search?from=NDLS")).toBe("bottom");
    expect(defaultDock("/")).toBe("left");
    expect(defaultDock("/map")).toBe("left");
  });

  it("centers the bottom panel instead of pinning it to the right", () => {
    const panel = dockPanelClass("bottom");
    expect(panel).toContain("left-1/2");
    expect(panel).toContain("-translate-x-1/2");
    expect(panel).not.toContain("right-0");
  });

  it("grows a left dock from the free right edge", () => {
    const size = defaultPanelSize("left");
    expect(
      applyResize({ dock: "left", size, edge: "e", dx: 40, dy: 0, maxWidth: 1200, maxHeight: 800 }).width
    ).toBe(size.width + 40);
  });

  it("grows a right dock when the left edge is dragged left", () => {
    const size = defaultPanelSize("right");
    expect(
      applyResize({ dock: "right", size, edge: "w", dx: -30, dy: 0, maxWidth: 1200, maxHeight: 800 }).width
    ).toBe(size.width + 30);
  });

  it("keeps a bottom dock centered by growing width on both sides", () => {
    const size = defaultPanelSize("bottom");
    expect(
      applyResize({ dock: "bottom", size, edge: "e", dx: 12, dy: 0, maxWidth: 2000, maxHeight: 800 }).width
    ).toBe(size.width + 24);
    expect(
      applyResize({ dock: "bottom", size, edge: "n", dx: 0, dy: -20, maxWidth: 2000, maxHeight: 800 }).height
    ).toBe(size.height + 20);
  });

  it("does not shrink past the minimum", () => {
    const shrunk = applyResize({
      dock: "left",
      size: { width: MIN_PANEL_WIDTH, height: MIN_PANEL_HEIGHT },
      edge: "se",
      dx: -80,
      dy: -80,
      maxWidth: 1200,
      maxHeight: 800,
    });
    expect(shrunk.width).toBe(MIN_PANEL_WIDTH);
    expect(shrunk.height).toBe(MIN_PANEL_HEIGHT);
  });

  it("places the closed trigger on the same side as the open panel", () => {
    expect(dockTriggerClass("left")).toContain("left-4");
    expect(dockTriggerClass("right")).toContain("right-4");
    expect(dockTriggerClass("bottom")).toContain("left-1/2");
  });
});
