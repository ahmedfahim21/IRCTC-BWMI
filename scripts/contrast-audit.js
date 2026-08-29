/**
 * WCAG AA contrast audit, run inside the page.
 *
 * Colours are resolved through a canvas, because Tailwind emits oklab() for
 * alpha modifiers. Anything the canvas cannot parse, and anything translucent,
 * is composited against the ancestor behind it rather than assumed to be black
 * — guessing black turns every translucent surface into a false failure.
 */
window.__audit = function () {
  const ctx = document.createElement("canvas").getContext("2d");
  const SENTINEL = "#ff00ff";
  const cache = new Map();

  /** -> [r, g, b, a] or null when the browser gave us something unparseable. */
  function resolve(color) {
    if (cache.has(color)) return cache.get(color);
    ctx.fillStyle = SENTINEL;
    try {
      ctx.fillStyle = color;
    } catch {
      cache.set(color, null);
      return null;
    }
    const out = ctx.fillStyle;
    let parsed = null;
    if (out === SENTINEL && color.toLowerCase() !== SENTINEL) {
      parsed = null; // assignment was rejected; we genuinely don't know
    } else if (out.startsWith("#")) {
      parsed = [...[1, 3, 5].map((i) => parseInt(out.slice(i, i + 2), 16)), 1];
    } else {
      const parts = (out.match(/[\d.]+/g) ?? []).map(Number);
      parsed = parts.length >= 3 ? [parts[0], parts[1], parts[2], parts[3] ?? 1] : null;
    }
    cache.set(color, parsed);
    return parsed;
  }

  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const contrast = (a, b) => {
    const l1 = lum(a);
    const l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const over = (top, bottom) => [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3]));

  /**
   * Darkest colour stop in a gradient, if the element paints one.
   *
   * Scrims over photography are gradients, not background colours, and reading
   * only `background-color` reported white-on-scrim text as white-on-card and
   * failed it. Captions sit at the dark end of their scrim, so the most opaque
   * stop is the honest backdrop to measure against. Approximate — it assumes
   * the text is over the darkest part, which is how a scrim is built — but far
   * closer than pretending the gradient is not there.
   */
  function gradientFloor(style) {
    const image = style.backgroundImage;
    if (!image || image === "none" || !/gradient/.test(image)) return null;
    let darkest = null;
    for (const match of image.matchAll(/rgba?\(([^)]+)\)/g)) {
      const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      if (parts.length < 3 || parts.some(Number.isNaN)) continue;
      const rgba = [parts[0], parts[1], parts[2], parts[3] ?? 1];
      if (rgba[3] < 0.05) continue;
      const weight = rgba[3] * (1 - lum(rgba));
      if (!darkest || weight > darkest.weight) darkest = { rgba, weight };
    }
    return darkest ? darkest.rgba : null;
  }

  /** Effective background behind an element, compositing translucent layers. */
  function bgOf(el) {
    const layers = [];
    let node = el;
    while (node) {
      const style = getComputedStyle(node);

      const scrim = gradientFloor(style);
      if (scrim) {
        layers.push(scrim);
        if (scrim[3] > 0.99) break;
      }

      const rgba = resolve(style.backgroundColor);
      if (rgba && rgba[3] > 0.01) {
        layers.push(rgba);
        if (rgba[3] > 0.99) break;
      }
      node = node.parentElement;
    }
    const base = resolve(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255, 1];
    return layers.reduceRight((acc, layer) => over(layer, acc), [base[0], base[1], base[2]]);
  }

  const fails = [];
  let checked = 0;
  let unresolved = 0;

  document.querySelectorAll("body *").forEach((el) => {
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText) return;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || parseFloat(style.opacity) < 0.3) return;

    const fg = resolve(style.color);
    if (!fg) {
      unresolved++;
      return;
    }

    const size = parseFloat(style.fontSize);
    const weight = parseInt(style.fontWeight) || 400;
    const need = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
    const ratio = contrast(fg, bgOf(el));
    checked++;
    if (ratio < need - 0.01) {
      fails.push({ text: el.textContent.trim().slice(0, 30), size: Math.round(size), ratio: +ratio.toFixed(2), need });
    }
  });

  return { checked, unresolved, failCount: fails.length, fails: fails.slice(0, 10) };
};
"audit ready";
