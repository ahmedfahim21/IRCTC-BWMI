/**
 * The photographs behind the search on the home page.
 *
 * Copied into `public/` rather than hotlinked like the destination
 * photography: two of these came from image-search thumbnail proxies whose
 * URLs are explicitly not stable, and a hero that 404s is worse than 460 KB in
 * the repo. Next still optimises them — they leave as AVIF/WebP at the drawn
 * size, so the wire cost is a fraction of the file on disk.
 *
 * Ordered so the two Vande Bharat frames never sit next to each other: the
 * sequence alternates rolling stock, and a jump-cut between two shots of the
 * same train at the same platform reads as a glitch rather than a dissolve.
 *
 * `focus` is the object-position, because the subject is rarely centred — the
 * two low-resolution frames in particular need the locomotive held in view
 * when the plate is cropped to a letterbox.
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
    src: "/trains/wdp4-express-underway.jpg",
    alt: "A green diesel locomotive hauling an express past a girder bridge, dust rising off the ballast",
    focus: "40% 50%",
  },
  {
    src: "/trains/vande-bharat-nose.jpg",
    alt: "The nose of a Vande Bharat Express close up, its Indian Railways crest catching the light",
    focus: "55% 50%",
  },
  {
    src: "/trains/mail-express-night-platform.jpg",
    alt: "The red coaches of a Mail Express waiting along a lit platform at night",
    focus: "50% 55%",
  },
];

/** How long each frame holds before the dissolve begins. */
export const HERO_FRAME_MS = 6500;
