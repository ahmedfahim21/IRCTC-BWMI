/**
 * The photographs behind the search on the home page.
 *
 * Copied into `public/` rather than hotlinked like the destination
 * photography: several of these came from image-search thumbnail proxies
 * whose URLs are explicitly not stable, and a hero that 404s is worse than a
 * few hundred KB in the repo. Next still optimises them — they leave as
 * AVIF/WebP at the drawn size, so the wire cost is a fraction of the file on
 * disk.
 *
 * Ordered so no two adjacent frames are the same kind of shot — two
 * head-on diesel locomotives back to back, or two static platform shots,
 * read as a glitch rather than a dissolve. The aerial countryside shot
 * breaks up the run of ground-level ones.
 *
 * `focus` is the object-position, because the subject is rarely centred —
 * most of these need the locomotive (or the curve of the train) held in
 * view when the plate is cropped to a letterbox.
 */
export interface HeroFrame {
  src: string;
  alt: string;
  focus: string;
}

export const HERO_FRAMES: HeroFrame[] = [
  {
    src: "/trains/vande-bharat-platform.jpg",
    alt: "A Vande Bharat Express in orange and grey standing at a platform under a heavy blue sky",
    focus: "60% 50%",
  },
  {
    src: "/trains/wdm3d-loco-hauling.jpg",
    alt: "A blue WDM3D diesel locomotive hauling an express head-on, its train stretching back down the line",
    focus: "55% 45%",
  },
  {
    src: "/trains/mumbai-dwarka-train.webp",
    alt: "A blue express curving through green countryside below a range of hills, seen from above",
    focus: "42% 62%",
  },
  {
    src: "/trains/wdp4-loco-forest-cutting.jpg",
    alt: "A WDP4 diesel locomotive emerging through a forested cutting, smoke trailing back over the train",
    focus: "50% 45%",
  },
  {
    src: "/trains/sleeper-coach-platform.jpg",
    alt: "A blue and white sleeper coach standing at a platform, its doors open",
    focus: "50% 55%",
  },
];

/** How long each frame holds before the dissolve begins. */
export const HERO_FRAME_MS = 6500;
