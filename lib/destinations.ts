/**
 * Places worth taking a train to, and — the part that actually helps — the
 * station you'd get off at. Nobody books a ticket to Munnar; they book one to
 * Ernakulam and drive. Naming the railhead is the useful half.
 */
export interface Destination {
  slug: string;
  name: string;
  region: string;
  /** Station code the journey actually ends at. */
  railhead: string;
  railheadName: string;
  /** How you finish the trip, when the railhead isn't the destination. */
  lastLeg: string | null;
  image: string;
  /** Rendered as the image's alt text, so it describes the photograph. */
  alt: string;
}

export const DESTINATIONS: Destination[] = [
  {
    slug: "agra",
    name: "The Taj Mahal",
    region: "Agra, Uttar Pradesh",
    railhead: "AGC",
    railheadName: "Agra Cantt",
    lastLeg: null,
    image: "https://www.holidify.com/images/bgImages/INDIA.jpg",
    alt: "The Taj Mahal at dawn, reflected in the long watercourse of its garden",
  },
  {
    slug: "mumbai",
    name: "Gateway of India",
    region: "Mumbai, Maharashtra",
    railhead: "CSMT",
    railheadName: "Mumbai CSMT",
    lastLeg: null,
    image: "https://www.flamingotravels.co.in/blog/wp-content/uploads/2025/10/best-places-to-visit-in-India.jpg",
    alt: "The Gateway of India arch on the Mumbai waterfront, crowded with visitors",
  },
  {
    slug: "alappuzha",
    name: "Kerala backwaters",
    region: "Alappuzha, Kerala",
    railhead: "ALLP",
    railheadName: "Alappuzha",
    lastLeg: null,
    image: "https://static.toiimg.com/photo/54422629.cms",
    alt: "A thatched houseboat on the Kerala backwaters, lined with coconut palms",
  },
  {
    slug: "munnar",
    name: "Munnar tea country",
    region: "Idukki, Kerala",
    railhead: "ERS",
    railheadName: "Ernakulam Jn",
    lastLeg: "about 4 hours by road",
    image: "https://www.holidify.com/images/bgImages/MUNNAR.jpg",
    alt: "Terraced tea gardens rolling into mist in the hills above Munnar",
  },
  {
    slug: "khajjiar",
    name: "Khajjiar meadow",
    region: "Chamba, Himachal Pradesh",
    railhead: "PTKC",
    railheadName: "Pathankot Cantt",
    lastLeg: "about 3 hours by road",
    image: "https://static.toiimg.com/thumb/113671154/Khajjiar.jpg?width=636&height=358&resize=4",
    alt: "A green meadow ringed by deodar forest at Khajjiar, with a paraglider overhead",
  },
  {
    slug: "ladakh",
    name: "Pangong Tso",
    region: "Ladakh",
    railhead: "JAT",
    railheadName: "Jammu Tawi",
    lastLeg: "two days by road over the passes",
    image: "https://hblimg.mmtcdn.com/content/hubble/img/leh/mmt/destination/m_leh-landscape_l_400_640.jpg",
    alt: "The blue water of Pangong Tso below bare Ladakhi mountains",
  },
];
