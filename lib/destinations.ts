import type { Locale } from "@/lib/i18n/useLocale";

/**
 * Places worth taking a train to, and — the part that actually helps — the
 * station you'd get off at. Nobody books a ticket to Munnar; they book one to
 * Ernakulam and drive. Naming the railhead is the useful half.
 *
 * Each display field carries a Hindi variant alongside the English one —
 * place names, not photo URLs or station codes, so `localizedDestination`
 * resolves the pair the card actually renders.
 */
export interface Destination {
  slug: string;
  name: string;
  nameHi: string;
  region: string;
  regionHi: string;
  /** Station code the journey actually ends at. */
  railhead: string;
  railheadName: string;
  railheadNameHi: string;
  /** How you finish the trip, when the railhead isn't the destination. */
  lastLeg: string | null;
  lastLegHi: string | null;
  image: string;
  /** Rendered as the image's alt text, so it describes the photograph. */
  alt: string;
}

export const DESTINATIONS: Destination[] = [
  {
    slug: "agra",
    name: "The Taj Mahal",
    nameHi: "ताज महल",
    region: "Agra, Uttar Pradesh",
    regionHi: "आगरा, उत्तर प्रदेश",
    railhead: "AGC",
    railheadName: "Agra Cantt",
    railheadNameHi: "आगरा कैंट",
    lastLeg: null,
    lastLegHi: null,
    image: "https://www.holidify.com/images/bgImages/INDIA.jpg",
    alt: "The Taj Mahal at dawn, reflected in the long watercourse of its garden",
  },
  {
    slug: "mumbai",
    name: "Gateway of India",
    nameHi: "गेटवे ऑफ़ इंडिया",
    region: "Mumbai, Maharashtra",
    regionHi: "मुंबई, महाराष्ट्र",
    railhead: "CSMT",
    railheadName: "Mumbai CSMT",
    railheadNameHi: "मुंबई सीएसएमटी",
    lastLeg: null,
    lastLegHi: null,
    image: "https://www.flamingotravels.co.in/blog/wp-content/uploads/2025/10/best-places-to-visit-in-India.jpg",
    alt: "The Gateway of India arch on the Mumbai waterfront, crowded with visitors",
  },
  {
    slug: "alappuzha",
    name: "Kerala backwaters",
    nameHi: "केरल बैकवाटर्स",
    region: "Alappuzha, Kerala",
    regionHi: "अलाप्पुड़ा, केरल",
    railhead: "ALLP",
    railheadName: "Alappuzha",
    railheadNameHi: "अलाप्पुड़ा",
    lastLeg: null,
    lastLegHi: null,
    image: "https://static.toiimg.com/photo/54422629.cms",
    alt: "A thatched houseboat on the Kerala backwaters, lined with coconut palms",
  },
  {
    slug: "munnar",
    name: "Munnar tea country",
    nameHi: "मुन्नार चाय बागान",
    region: "Idukki, Kerala",
    regionHi: "इडुक्की, केरल",
    railhead: "ERS",
    railheadName: "Ernakulam Jn",
    railheadNameHi: "एर्णाकुलम जं.",
    lastLeg: "about 4 hours by road",
    lastLegHi: "सड़क मार्ग से लगभग 4 घंटे",
    image: "https://www.holidify.com/images/bgImages/MUNNAR.jpg",
    alt: "Terraced tea gardens rolling into mist in the hills above Munnar",
  },
  {
    slug: "khajjiar",
    name: "Khajjiar meadow",
    nameHi: "खज्जियार मैदान",
    region: "Chamba, Himachal Pradesh",
    regionHi: "चंबा, हिमाचल प्रदेश",
    railhead: "PTKC",
    railheadName: "Pathankot Cantt",
    railheadNameHi: "पठानकोट कैंट",
    lastLeg: "about 3 hours by road",
    lastLegHi: "सड़क मार्ग से लगभग 3 घंटे",
    image: "https://static.toiimg.com/thumb/113671154/Khajjiar.jpg?width=636&height=358&resize=4",
    alt: "A green meadow ringed by deodar forest at Khajjiar, with a paraglider overhead",
  },
  {
    slug: "ladakh",
    name: "Pangong Tso",
    nameHi: "पैंगोंग त्सो",
    region: "Ladakh",
    regionHi: "लद्दाख",
    railhead: "JAT",
    railheadName: "Jammu Tawi",
    railheadNameHi: "जम्मू तवी",
    lastLeg: "two days by road over the passes",
    lastLegHi: "दर्रों के रास्ते सड़क मार्ग से दो दिन",
    image: "https://hblimg.mmtcdn.com/content/hubble/img/leh/mmt/destination/m_leh-landscape_l_400_640.jpg",
    alt: "The blue water of Pangong Tso below bare Ladakhi mountains",
  },
];

/** The four display fields, resolved to one locale. */
export function localizedDestination(destination: Destination, locale: Locale) {
  return {
    name: locale === "hi" ? destination.nameHi : destination.name,
    region: locale === "hi" ? destination.regionHi : destination.region,
    railheadName: locale === "hi" ? destination.railheadNameHi : destination.railheadName,
    lastLeg: locale === "hi" ? destination.lastLegHi : destination.lastLeg,
  };
}
