import type { Locale } from "@/lib/i18n/useLocale";

/**
 * Every piece of railway jargon the UI can show, with a plain-language reading
 * in both locales. Nothing in this app renders a code like "PQWL" without
 * routing it through here — unexplained jargon is one of the things we're
 * fixing, in Hindi as much as English.
 */

interface GlossaryText {
  short: string;
  full: string;
  /** Rendered next to a number, e.g. "38 ahead of you". */
  withCount?: (n: number) => string;
}

interface GlossaryEntrySource {
  term: string;
  en: GlossaryText;
  hi: GlossaryText;
}

/** What callers get back: a GlossaryText resolved to one locale, plus the code itself. */
export interface GlossaryEntry {
  term: string;
  short: string;
  full: string;
  withCount?: (n: number) => string;
}

const SOURCE: Record<string, GlossaryEntrySource> = {
  "1A": {
    term: "1A",
    en: { short: "AC First Class", full: "Lockable cabins of 4 berths and coupes of 2. Bedding included. The most expensive class on the train." },
    hi: { short: "एसी फर्स्ट क्लास", full: "4 बर्थ के लॉक होने वाले केबिन और 2 के कूपे। बिस्तर शामिल है। ट्रेन की सबसे महंगी श्रेणी।" },
  },
  "2A": {
    term: "2A",
    en: { short: "AC 2-Tier", full: "Air-conditioned, 4 berths per bay plus 2 side berths, with privacy curtains. Bedding included." },
    hi: { short: "एसी 2-टियर", full: "वातानुकूलित, प्रति बे 4 बर्थ और 2 साइड बर्थ, पर्दों के साथ। बिस्तर शामिल है।" },
  },
  "3A": {
    term: "3A",
    en: { short: "AC 3-Tier", full: "Air-conditioned, 6 berths per bay plus 2 side berths. Bedding included. The most common AC class." },
    hi: { short: "एसी 3-टियर", full: "वातानुकूलित, प्रति बे 6 बर्थ और 2 साइड बर्थ। बिस्तर शामिल है। सबसे आम एसी श्रेणी।" },
  },
  "3E": {
    term: "3E",
    en: { short: "AC 3-Tier Economy", full: "Like 3A but with slightly tighter berths and a lower fare." },
    hi: { short: "एसी 3-टियर इकॉनमी", full: "3A जैसी, पर बर्थ थोड़ी सँकरी और किराया कम।" },
  },
  SL: {
    term: "SL",
    en: { short: "Sleeper", full: "Non-air-conditioned, 6 berths per bay plus 2 side berths. Windows open. No bedding provided." },
    hi: { short: "स्लीपर", full: "बिना एसी, प्रति बे 6 बर्थ और 2 साइड बर्थ। खिड़कियाँ खुलती हैं। बिस्तर नहीं मिलता।" },
  },
  CC: {
    term: "CC",
    en: { short: "AC Chair Car", full: "Air-conditioned seating, usually 3+2 across. Day journeys only — no berths." },
    hi: { short: "एसी चेयर कार", full: "वातानुकूलित सीटें, आमतौर पर 3+2। सिर्फ दिन की यात्रा के लिए — बर्थ नहीं।" },
  },
  EC: {
    term: "EC",
    en: { short: "Executive Chair Car", full: "Air-conditioned seating, 2+2 across with more legroom. Day journeys only." },
    hi: { short: "एग्ज़िक्यूटिव चेयर कार", full: "वातानुकूलित सीटें, 2+2, ज़्यादा पैर की जगह। सिर्फ दिन की यात्रा के लिए।" },
  },
  "2S": {
    term: "2S",
    en: { short: "Second Sitting", full: "Non-air-conditioned bench seating. The cheapest reserved class." },
    hi: { short: "सेकंड सिटिंग", full: "बिना एसी की बेंच सीटें। सबसे सस्ती आरक्षित श्रेणी।" },
  },

  GN: {
    term: "GN",
    en: { short: "General quota", full: "The main pool of seats, open from the day bookings start." },
    hi: { short: "जनरल कोटा", full: "सीटों का मुख्य पूल, बुकिंग शुरू होने के दिन से खुला।" },
  },
  TQ: {
    term: "TQ",
    en: { short: "Tatkal", full: "Emergency quota released one day before departure, at a premium fare. AC classes open at 10:00, sleeper at 11:00." },
    hi: { short: "तत्काल", full: "प्रस्थान से एक दिन पहले, अतिरिक्त किराए पर खुलने वाला आपातकालीन कोटा। एसी श्रेणियाँ 10:00 बजे, स्लीपर 11:00 बजे खुलती हैं।" },
  },
  PT: {
    term: "PT",
    en: { short: "Premium Tatkal", full: "A smaller Tatkal pool with dynamic pricing — the fare rises as seats sell." },
    hi: { short: "प्रीमियम तत्काल", full: "गतिशील मूल्य वाला एक छोटा तत्काल पूल — सीटें बिकने के साथ किराया बढ़ता है।" },
  },
  LD: {
    term: "LD",
    en: { short: "Ladies quota", full: "Reserved for women travelling alone or with children under 12." },
    hi: { short: "महिला कोटा", full: "अकेले यात्रा कर रही या 12 साल से छोटे बच्चों के साथ यात्रा कर रही महिलाओं के लिए आरक्षित।" },
  },
  SS: {
    term: "SS",
    en: { short: "Senior Citizen", full: "Lower berths held for passengers aged 60+ (men) or 58+ (women)." },
    hi: { short: "वरिष्ठ नागरिक", full: "60+ (पुरुष) या 58+ (महिला) आयु के यात्रियों के लिए निचली बर्थ आरक्षित।" },
  },
  DF: {
    term: "DF",
    en: { short: "Defence quota", full: "Held for serving armed forces personnel on duty." },
    hi: { short: "रक्षा कोटा", full: "सक्रिय सेवा में तैनात सशस्त्र बल कर्मियों के लिए आरक्षित।" },
  },

  AVL: {
    term: "AVL",
    en: { short: "Available", full: "Seats are free right now. Book and you are confirmed immediately.", withCount: (n) => `${n} seat${n === 1 ? "" : "s"} free` },
    hi: { short: "उपलब्ध", full: "सीटें अभी खाली हैं। बुक करते ही तुरंत कन्फर्म हो जाएगी।", withCount: (n) => `${n} सीट${n === 1 ? "" : "ें"} खाली` },
  },
  RAC: {
    term: "RAC",
    en: {
      short: "Reservation Against Cancellation",
      full: "You can board and you get a side berth shared with one other passenger. Most RAC tickets become a full berth once the chart is prepared.",
      withCount: (n) => `Position ${n} — you can board, sharing a side berth`,
    },
    hi: {
      short: "रद्दीकरण के विरुद्ध आरक्षण",
      full: "आप सवार हो सकते हैं और एक अन्य यात्री के साथ साझा साइड बर्थ मिलती है। चार्ट बनते ही ज़्यादातर RAC टिकट पूरी बर्थ बन जाते हैं।",
      withCount: (n) => `स्थान ${n} — आप सवार हो सकते हैं, साइड बर्थ साझा करते हुए`,
    },
  },
  WL: {
    term: "WL",
    en: { short: "Waiting list", full: "No seat yet. You move up as others cancel. If it does not clear by chart preparation, the ticket is cancelled and refunded automatically.", withCount: (n) => `${n} ahead of you` },
    hi: { short: "प्रतीक्षा सूची", full: "अभी सीट नहीं है। दूसरों के रद्द करने पर आप आगे बढ़ते हैं। चार्ट बनने तक साफ़ न होने पर टिकट अपने आप रद्द होकर रिफंड हो जाता है।", withCount: (n) => `आपसे आगे ${n}` },
  },
  GNWL: {
    term: "GNWL",
    en: { short: "General waiting list", full: "The main waiting list, for passengers boarding at or near the train's origin. This is the queue that clears most often.", withCount: (n) => `${n} ahead of you` },
    hi: { short: "जनरल प्रतीक्षा सूची", full: "ट्रेन के मूल स्टेशन पर या उसके पास चढ़ने वाले यात्रियों के लिए मुख्य प्रतीक्षा सूची। यह सबसे अधिक बार साफ़ होने वाली कतार है।", withCount: (n) => `आपसे आगे ${n}` },
  },
  RLWL: {
    term: "RLWL",
    en: { short: "Remote Location waiting list", full: "A separate, smaller queue for intermediate stations. It only clears when someone cancels that exact segment, so it moves more slowly than GNWL.", withCount: (n) => `${n} ahead of you in this station's own queue` },
    hi: { short: "रिमोट लोकेशन प्रतीक्षा सूची", full: "बीच के स्टेशनों के लिए एक अलग, छोटी कतार। यह तभी साफ़ होती है जब कोई ठीक उसी हिस्से का टिकट रद्द करे, इसलिए GNWL से धीमी चलती है।", withCount: (n) => `इस स्टेशन की अपनी कतार में आपसे आगे ${n}` },
  },
  PQWL: {
    term: "PQWL",
    en: { short: "Pooled Quota waiting list", full: "A queue shared between several short-distance stations along the route. Clears less often than GNWL.", withCount: (n) => `${n} ahead of you in the pooled queue` },
    hi: { short: "पूल्ड कोटा प्रतीक्षा सूची", full: "मार्ग पर कई छोटी दूरी के स्टेशनों के बीच साझा कतार। GNWL से कम बार साफ़ होती है।", withCount: (n) => `पूल्ड कतार में आपसे आगे ${n}` },
  },
  TQWL: {
    term: "TQWL",
    en: { short: "Tatkal waiting list", full: "The Tatkal queue. It does not get upgraded from the general pool, so it clears rarely.", withCount: (n) => `${n} ahead of you in the Tatkal queue` },
    hi: { short: "तत्काल प्रतीक्षा सूची", full: "तत्काल की कतार। इसे जनरल पूल से अपग्रेड नहीं किया जाता, इसलिए यह कम ही साफ़ होती है।", withCount: (n) => `तत्काल कतार में आपसे आगे ${n}` },
  },
  LDWL: {
    term: "LDWL",
    en: { short: "Ladies quota waiting list", full: "The waiting list against the ladies quota.", withCount: (n) => `${n} ahead of you` },
    hi: { short: "महिला कोटा प्रतीक्षा सूची", full: "महिला कोटे की प्रतीक्षा सूची।", withCount: (n) => `आपसे आगे ${n}` },
  },
  REGRET: {
    term: "REGRET",
    en: { short: "Closed", full: "The waiting list is full. No more tickets are being sold for this class and quota." },
    hi: { short: "बंद", full: "प्रतीक्षा सूची भर चुकी है। इस श्रेणी और कोटे के लिए अब टिकट नहीं बिक रहे।" },
  },

  LB: {
    term: "LB",
    en: { short: "Lower berth", full: "Bottom berth. Easiest to get in and out of, and the one everyone wants." },
    hi: { short: "निचली बर्थ", full: "सबसे नीचे की बर्थ। चढ़ना-उतरना सबसे आसान, और सबसे पसंदीदा।" },
  },
  MB: {
    term: "MB",
    en: { short: "Middle berth", full: "Folds down at night. Has to stay folded until the lower berth passenger is ready to sleep." },
    hi: { short: "बीच की बर्थ", full: "रात में नीचे की ओर खुलती है। निचली बर्थ वाले यात्री के सोने के लिए तैयार होने तक मुड़ी रहनी चाहिए।" },
  },
  UB: {
    term: "UB",
    en: { short: "Upper berth", full: "Top berth. Yours to use at any hour, but a climb." },
    hi: { short: "ऊपरी बर्थ", full: "सबसे ऊपर की बर्थ। किसी भी समय इस्तेमाल कर सकते हैं, पर चढ़ना पड़ता है।" },
  },
  SL_BERTH: {
    term: "SL",
    en: { short: "Side lower", full: "Lower berth along the corridor, slightly shorter than a main lower berth." },
    hi: { short: "साइड लोअर", full: "गलियारे के साथ निचली बर्थ, मुख्य निचली बर्थ से थोड़ी छोटी।" },
  },
  SU: {
    term: "SU",
    en: { short: "Side upper", full: "Upper berth along the corridor." },
    hi: { short: "साइड अपर", full: "गलियारे के साथ ऊपरी बर्थ।" },
  },
  CB: {
    term: "CB",
    en: { short: "Cabin berth", full: "Inside a lockable 1A cabin." },
    hi: { short: "केबिन बर्थ", full: "लॉक होने वाले 1A केबिन के अंदर।" },
  },
  WS: {
    term: "WS",
    en: { short: "Window seat", full: "Seat next to the window." },
    hi: { short: "खिड़की वाली सीट", full: "खिड़की के पास की सीट।" },
  },
  AS: {
    term: "AS",
    en: { short: "Aisle seat", full: "Seat away from the window." },
    hi: { short: "गलियारे वाली सीट", full: "खिड़की से दूर की सीट।" },
  },

  CNF: {
    term: "CNF",
    en: { short: "Confirmed", full: "You have a berth. The coach and berth number are printed on the ticket." },
    hi: { short: "कन्फर्म", full: "आपकी बर्थ पक्की है। कोच और बर्थ नंबर टिकट पर छपा है।" },
  },
  CAN: {
    term: "CAN",
    en: { short: "Cancelled", full: "This ticket has been cancelled and the refund is being processed." },
    hi: { short: "रद्द", full: "यह टिकट रद्द हो चुका है और रिफंड प्रक्रिया में है।" },
  },
  CANCELLED: {
    term: "CANCELLED",
    en: { short: "Cancelled", full: "This ticket has been cancelled and the refund is being processed." },
    hi: { short: "रद्द", full: "यह टिकट रद्द हो चुका है और रिफंड प्रक्रिया में है।" },
  },

  CHART: {
    term: "Chart",
    en: { short: "Chart preparation", full: "The final passenger list, locked in about 4 hours before departure. This is when RAC and waiting list positions are resolved and berths are allotted." },
    hi: { short: "चार्ट तैयारी", full: "अंतिम यात्री सूची, प्रस्थान से लगभग 4 घंटे पहले तय होती है। इसी समय RAC और प्रतीक्षा सूची की स्थिति तय होती है और बर्थ आवंटित होती है।" },
  },
  PNR: {
    term: "PNR",
    en: { short: "Passenger Name Record", full: "The 10-digit reference for your booking. One PNR covers up to six passengers on one journey." },
    hi: { short: "पैसेंजर नेम रिकॉर्ड", full: "आपकी बुकिंग का 10 अंकों का संदर्भ। एक PNR में एक यात्रा पर छह यात्री तक शामिल हो सकते हैं।" },
  },
  TTE: {
    term: "TTE",
    en: { short: "Travelling Ticket Examiner", full: "The onboard staff member who checks tickets and allots unclaimed berths." },
    hi: { short: "ट्रैवलिंग टिकट एग्ज़ामिनर", full: "ट्रेन में मौजूद वह स्टाफ़ सदस्य जो टिकट जाँचता है और खाली बर्थ आवंटित करता है।" },
  },
};

/** GLOSSARY[code] still resolves to the English entry, for call sites that haven't threaded a locale through yet. */
export const GLOSSARY: Record<string, GlossaryEntry> = Object.fromEntries(
  Object.entries(SOURCE).map(([code, entry]) => [code, { term: entry.term, ...entry.en }])
);

export function lookup(term: string, locale: Locale = "en"): GlossaryEntry | null {
  const entry = SOURCE[term.toUpperCase()];
  if (!entry) return null;
  const text = locale === "hi" ? entry.hi : entry.en;
  return { term: entry.term, ...text };
}

/** "GNWL 38" -> { term: "GNWL", count: 38 } */
export function parseStatusLabel(label: string): { term: string; count: number | null } {
  const match = label.match(/^([A-Z]+)\s*(\d+)?$/);
  if (!match) return { term: label.split(/[\s/]/)[0], count: null };
  return { term: match[1], count: match[2] ? Number(match[2]) : null };
}

/** "CNF B1/10 MB" -> coach B1, berth 10, middle berth. */
const ALLOTMENT = /^CNF\s+([A-Z]+\d*)\/(\d+)\s*([A-Z]{2})?$/;

/**
 * The sentence that always sits beside a status code. Returns an empty string
 * when the code carries no extra meaning, so callers can skip rendering rather
 * than printing the same thing twice.
 */
export function explainStatus(label: string, locale: Locale = "en"): string {
  const allotted = label.match(ALLOTMENT);
  if (allotted) {
    const [, coach, berth, berthType] = allotted;
    const berthEntry = berthType ? lookup(berthType === "SL" ? "SL_BERTH" : berthType, locale) : null;
    const berthName = berthEntry?.short ?? berthType;
    if (locale === "hi") {
      return `कन्फर्म — कोच ${coach}, बर्थ ${berth}${berthName ? `, ${berthName}` : ""}`;
    }
    return `Confirmed — coach ${coach}, berth ${berth}${berthName ? `, ${berthName.toLowerCase()}` : ""}`;
  }

  const { term, count } = parseStatusLabel(label);
  const entry = lookup(term, locale);
  if (!entry) return "";
  if (count !== null && entry.withCount) return entry.withCount(count);
  return entry.short;
}
