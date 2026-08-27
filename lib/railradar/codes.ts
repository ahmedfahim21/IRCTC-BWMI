/**
 * Station-code drift between the generated timetable and the live network.
 * Kept free of Node APIs so the client bundle can resolve a city token without
 * pulling in the RailRadar HTTP client.
 */

export const STATION_ALIASES: Record<string, string> = {
  BCT: "MMCT", // Mumbai Central — BCT is a stale duplicate with no services
  ALD: "PRYJ", // Allahabad Jn -> Prayagraj Jn
  MGS: "DDU", // Mughalsarai -> Pt. Deen Dayal Upadhyaya Jn
  JHS: "VGLJ", // Jhansi -> Veerangana Lakshmibai Jhansi
  HBJ: "RKMP", // Habibganj -> Rani Kamalapati
  GR: "KLBG", // Gulbarga -> Kalaburagi
  PNK: "PHD", // Phaphund
};

/** When someone types a city they usually mean its principal terminal. */
export const PRINCIPAL_TERMINAL: Record<string, string> = {
  DELHI: "NDLS",
  "NEW DELHI": "NDLS",
  MUMBAI: "CSMT",
  BOMBAY: "CSMT",
  KOLKATA: "HWH",
  CALCUTTA: "HWH",
  CHENNAI: "MAS",
  MADRAS: "MAS",
  BENGALURU: "SBC",
  BANGALORE: "SBC",
  HYDERABAD: "SC",
  PUNE: "PUNE",
  AHMEDABAD: "ADI",
  JAIPUR: "JP",
  LUCKNOW: "LKO",
  PATNA: "PNBE",
  BHOPAL: "BPL",
  NAGPUR: "NGP",
  KANPUR: "CNB",
  SURAT: "ST",
  INDORE: "INDB",
  KOCHI: "ERS",
  COCHIN: "ERS",
  GUWAHATI: "GHY",
  CHANDIGARH: "CDG",
  VARANASI: "BSB",
  AMRITSAR: "ASR",
  JAMMU: "JAT",
  TRIVANDRUM: "TVC",
  THIRUVANANTHAPURAM: "TVC",
};

/** Map one of our codes onto whatever the live network calls it now. */
export function toLiveCode(code: string): string {
  return STATION_ALIASES[code.toUpperCase()] ?? code.toUpperCase();
}

const FROM_LIVE: Record<string, string> = Object.fromEntries(
  Object.entries(STATION_ALIASES).map(([ours, live]) => [live, ours])
);

/** Map a live code back onto the generated timetable's spelling. */
export function toMockCode(code: string): string {
  const upper = code.toUpperCase();
  return FROM_LIVE[upper] ?? upper;
}
