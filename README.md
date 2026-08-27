# IRCTC, reimagined

An independent redesign concept for IRCTC, built around one idea: **the ticket is not the product,
the journey is.** IRCTC ends at payment. That's where the interesting half of the problem starts.

> **Not the official IRCTC service.** This is a design and engineering exercise. It is not
> affiliated with IRCTC or Indian Railways, cannot issue a real ticket, and does not take payment.
> It carries IRCTC's name and colours because it is a redesign *of* IRCTC; every screen says so, and
> the site is `noindex`.

It runs on real Indian Railways data via the [RailRadar API](https://railradar.in/docs), speaks and
listens in Indian languages via [Sarvam](https://sarvam.ai), exposes itself to agents over MCP, and
is built on the [UX4G](https://www.ux4g.gov.in) government design tokens in IRCTC's own navy and
saffron. The header badge says, source by source, which data is live and which is modelled.

---

## What's wrong with the original

I loaded `irctc.co.in/nget/train-search` while building this. It opened with a **blocking language
modal over a blurred page**, then a "try our beta" banner, and the booking form — the only reason
anyone visits — squeezed in beneath Maharajas' Express, holiday packages, flights, hotels and
e-catering. The primary job competes with a travel agency.

| Problem | What this does |
|---|---|
| Availability needs a request **per class, per train** | The whole matrix resolves in one response |
| `WL 38` tells you nothing | Every waitlist carries odds **and the sample they came from** |
| Nothing to do when a date is full | Five alternative strategies run automatically |
| Berth "preference" dropdown into a void | A real coach diagram with the free berths on it |
| CAPTCHAs, and a session that drops your work | None. The draft is server-side; reload loses nothing |
| Refund rules live in a PDF | The refund table sits on checkout, before you pay |
| Tatkal is decided by typing speed | Build it the night before; one tap, and an honest queue |
| **After payment, IRCTC forgets you** | Live position, your platform, where your coach stops on it |
| Route shown as text and cards | Drawn on a map of India, plus every train in the country |
| `PQWL`, `RLWL`, `3A` explained nowhere | Every code has a tap-to-explain entry and a plain reading |
| Keyboard and mouse only | Navigable end to end by voice, in Hindi or English |

---

## Running it

```bash
pnpm install
```

Optionally add keys. The app is fully functional without either:

```bash
cp .env.example .env.local
```

```bash
pnpm dev
```

Open <http://localhost:3277>. No sign-in. Three demo bookings are seeded, one running **today**, so
the live tracking screen has something to track.

Worth a look:

- `/` — search. The date strip shows which days are bookable before you commit to one
- `/map` — every train running in India right now, ~2,800 of them
- `/search?from=NDLS&to=MAS&date=…` — the availability matrix; a date 1–2 days out shows real waitlist odds
- `/trains/12723` — a real train, live, with every stop including the ones it passes through
- `/trips` — the seeded journeys; open the one running today
- The mic button, bottom right — say *"trains from Delhi to Mumbai tomorrow"*, in any Indian language

On a phone the four destinations move to a bottom tab bar; four of them plus the logo and settings
don't fit in a 360 px header, and thumbs reach the bottom of a phone far more easily than the top.

---

## Live data

With `RAILRADAR_API_KEY` set, these come from the real network:

| Source | Live | Note |
|---|---|---|
| Station directory | ✅ | All **10,147** stations, one 170 KB call, cached a week |
| Timetables | ✅ | Every train, every stop, including pass-throughs |
| Running status | ✅ | Actual position and delay, right now |
| Coach composition | ✅ | The real rake, including per-station reversals |
| Platform position | ✅ | Derived from the real formation |
| Date availability strip | ✅ | One call returns a fortnight |
| Live network map | ✅ | ~2,800 running trains in one snapshot |
| Availability matrix | ❌ | Seats is per train **per class** — one busy route costs dozens of calls |
| Confirmation odds | ❌ | No pre-booking prediction endpoint; theirs needs a real PNR |
| Fares, berth map | ❌ | Fares are one call per class; berth inventory isn't exposed at all |
| Bookings | ❌ | There is no public API for reserving a berth. This is always local |

That split is deliberate and **shown in the UI**, not blurred.

### Staying inside the quota

The sandbox allows 1,000 requests a month. `lib/railradar/client.ts` caches every response to
`.cache/railradar/` with a TTL matched to how fast that data changes — 7 days for timetables and
rakes, 30 minutes for seat calendars, 60 seconds for running status — and a persisted counter
**stops before the budget is spent**, serving a stale-but-real answer rather than a 429.

### Station codes drift

The generated timetable and the live network disagree on seven codes. `BCT` and `MMCT` are both
"Mumbai Central" in the directory but only `MMCT` has trains; `ALD`→`PRYJ`, `MGS`→`DDU`,
`JHS`→`VGLJ`, `HBJ`→`RKMP`, `GR`→`KLBG`, `PNK`→`PHD`. `lib/railradar/stations.ts` maps them, and
stop lookups accept either form.

---

## Voice

Speak to navigate, in any language Sarvam supports.

Audio goes to Sarvam's **speech-to-text-translate**, which returns English text *plus the language
actually spoken*. That means one upstream call and **one parser** covers every Indian language — no
per-language grammar. The reply is translated back and spoken in the language the user used.

```
"दिल्ली से मुंबई की ट्रेनें दिखाओ"
  → heard:  "Show trains from Delhi to Mumbai."   (hi-IN, 0.82)
  → intent: search → /search?from=NDLS&to=CSMT&date=…
  → spoken: "दिल्ली जंक्शन से आने वाली ट्रेनों की खोज कर रही हूँ।"
```

Intent parsing (`lib/voice/intent.ts`) is rule-based, not an LLM: instant, free, identical every
time, and the vocabulary is genuinely small. It handles train numbers, PNRs, station pairs, relative
and absolute dates, and dictated digits ("1 2 9 5 1"). Anything it can't place is echoed back rather
than guessed at. Recording is WebM/Opus — about a fifth the size of WAV, which matters here.

---

## Agent access (MCP)

An MCP server at **`POST /api/mcp`** (Streamable HTTP, JSON-RPC 2.0) exposes twelve tools, so an
agent can do what a person can:

`lookup_station` · `search_trains` · `get_train` · `get_live_status` · `get_availability_calendar` ·
`get_coach_position` · `list_running_trains` · `get_pnr` · `list_bookings` · `start_booking` ·
`confirm_booking` · `suggest_alternatives`

```bash
curl -s -X POST http://localhost:3277/api/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

`GET /api/mcp` returns a human-readable summary of the same. Bad arguments come back as tool-level
errors so the agent can correct itself, rather than as protocol errors that break the connection.

---

## Design

Built on the **UX4G design tokens** — the Government of India design system (MeitY). Colour ramps,
type scale, the 4 px spacing grid, radii and elevations all resolve to `--ux4g-*` primitives, and
the typeface is Noto Sans, self-hosted with a Devanagari subset.

The brand is IRCTC's own — the navy of their masthead (`#213D77` / `#082B71`) and the saffron they
use for emphasis (`#FB792B`) — expressed through the nearest UX4G ramp steps that clear AA rather
than dropped in as raw hex. `--info` moved off blue onto the tertiary ramp so a chart-prepared chip
can't read as a brand element now that the brand is blue.

Only the token layer is vendored. The full UX4G bundle is **7.9 MB (3.9 MB gzipped)** because it
ships 53 components and 3,188 utility classes this app doesn't use — twenty-four times the size of
the entire application, and it would break the one requirement that matters most here. The tokens
give the same visual language for **3.6 KB gzipped**. Regenerate with
`node scripts/extract-ux4g-tokens.mjs`.

On top of that: dark-first, because half of train travel happens at night. Typography carries
hierarchy — nothing above weight 450. Tabular numerals everywhere. The rail spine is one motif at
three densities: full height on the train page, a ribbon in results, compact in the trip card.
Status colour is never the only signal.

Maps are hand-drawn: an India outline as coordinate data, routes projected onto it, auto-framed.
The national map renders ~2,800 trains to a **canvas**, not SVG — at that many nodes it's the
difference between smooth and unusable on a cheap Android. No tiles, no API key, nothing to fetch.

The barcode on the ticket is Code 39, written out in about forty lines. It genuinely encodes the PNR.

---

## Testing

```bash
pnpm test
```

**104 unit tests**, mostly against the HTTP route handlers rather than the UI. They check every
returned field, before/after state on every mutation, and that a `PATCH` moves **only** the fields
it was given. Seventeen test the RailRadar mapper against recorded real responses; twelve cover the
MCP protocol; fifteen cover voice intent parsing.

```bash
pnpm exec playwright test
```

**20 end-to-end tests** against a production build, with both API keys deliberately unset so runs
never spend the request budget or depend on what the railway is doing today:

- the full journey — search → berth → pay → track, asserting the berth you picked is the berth you got
- a draft survives a hard reload with nothing lost
- a ticket still renders with the network cut
- WCAG AA contrast across six pages × both themes
- no horizontal page scroll at 360 / 414 / 768 / 1280 px
- every control labelled, no nested interactive elements

```bash
pnpm typecheck && pnpm test && pnpm build
```

---

## How it's put together

**The one architectural rule:** mock data is never imported by a component. It sits behind route
handlers under `app/api/*`, and the UI calls them over HTTP.

```
lib/mock/       the generated world — stations, corridors, trains, availability, live positions
lib/railradar/  the live adapter — client with cache and quota guard, wire types, mapping, aliases
lib/voice/      Sarvam speech client and the intent parser
lib/mcp/        tool definitions for agent access
lib/domain/     pure logic — fares, refund slabs, confirmation odds, alternatives, platform maths
app/api/        the HTTP surface — each route prefers live, falls back to generated
components/     rail/ · availability/ · coach/ · trip/ · book/ · map/ · voice/ · ui/
```

Adding the live API needed **no change to any component**. Every route handler kept its response
shape and gained a `source` field. That's what the boundary was for.

### The generated world is built from corridors

Eleven real corridors each list every station with its distance. A train is a corridor + direction +
halt tier + departure time. That's what makes it possible to show stations a train passes without
stopping, and to compute which trains you cross — two trains on one corridor are placed on a shared
distance axis, and wherever the gap between their timings flips sign, they've passed each other.

16511 comes out at 587 km, 13h52m, 27 halts, 42.3 km/h — against a real 587 km, 15h05m, 22 halts,
38.9 km/h.

### Confirmation odds are derived, not invented

For each train/class/quota the generator produces a 60-day history of how deep the waitlist cleared.
The probability answers: *of those 60 runs, how often did the queue clear at least this deep?* It
returns the number **and its sample size**, and the UI always shows both.

It behaves like the real thing: a waitlist of 2 in 1A is worse odds than 5 in 2A, because 1A has 18
berths to free up and 2A has 46.

### Performance

Heaviest route is **163 kB** of first-load JS, gzipped, against a 200 kB budget. The map, the
barcode and the charts are hand-written SVG or canvas rather than libraries, which is most of why.
A service worker (production only) caches schedules, stations and your tickets — the ticket QR
renders in airplane mode.

---

## Known limits

- **Without keys, everything is generated** — realistic in shape, not real. With them, the split in
  [Live data](#live-data) applies. The header badge always says which.
- **Payment is a button.** It creates a booking; no gateway, no money, no real reservation.
- **The IRCTC name and colours are used for a redesign concept**, not to represent the real service.
  The wordmark carries a permanent "redesign" qualifier, the home page states non-affiliation, the
  MCP server declares it in its instructions, and the site is `noindex`.
- **Bookings live in memory** and reset on restart. There is no booking API to integrate with —
  reservation is IRCTC-only.
- **Crossings and punctuality history are generated-world only.** Both need the timetable or running
  history of every other train on the line, one request each. The train page says so rather than
  showing an empty list.
- **Hindi is partial.** The string layer, locale switch and persistence are real, and nav, home and
  trips translate. Results, booking and trip screens are still English — that's filling in
  `lib/i18n/strings.ts`, not rework. Voice already works in every supported language.
- **Alarms are UI only.** Wiring them to the Notifications API is the obvious next step.
- **RailRadar's PNR endpoints aren't wired.** Every PNR here is a local booking, and I had no real
  ticket to verify the mapping against. Shipping unverified mapping seemed worse than leaving it out.
