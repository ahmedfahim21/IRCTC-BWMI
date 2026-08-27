import type { NextRequest } from "next/server";
import type { ClassCode, QuotaCode } from "@/lib/types";
import { createDraft } from "@/lib/mock/bookings";
import { handler, json, badRequest } from "@/lib/api/http";

/** Start a booking. Returns a hold you can come back to — reloading loses nothing. */
export const POST = handler(async (request: NextRequest) => {
  const body = (await request.json()) as {
    trainNumber?: string;
    journeyDate?: string;
    fromCode?: string;
    toCode?: string;
    classCode?: ClassCode;
    quota?: QuotaCode;
    tatkalOpensAt?: string | null;
  };

  const missing = (["trainNumber", "journeyDate", "fromCode", "toCode", "classCode"] as const).filter(
    (key) => !body[key]
  );
  if (missing.length) return badRequest(`Missing: ${missing.join(", ")}`);

  const draft = createDraft({
    trainNumber: body.trainNumber!,
    journeyDate: body.journeyDate!,
    fromCode: body.fromCode!,
    toCode: body.toCode!,
    classCode: body.classCode!,
    quota: body.quota ?? "GN",
    tatkalOpensAt: body.tatkalOpensAt ?? null,
  });
  return json({ draft }, { status: 201 });
});
