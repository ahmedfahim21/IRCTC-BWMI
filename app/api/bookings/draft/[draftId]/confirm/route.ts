import type { NextRequest } from "next/server";
import { confirmDraft } from "@/lib/mock/bookings";
import { handler, json } from "@/lib/api/http";

/**
 * Turn a held draft into a PNR. No CAPTCHA — bot defence belongs in rate
 * limiting and device attestation, not in the traveller's hands.
 */
export const POST = handler(async (_request: NextRequest, ctx: { params: Promise<{ draftId: string }> }) => {
  const { draftId } = await ctx.params;
  const booking = confirmDraft(draftId);
  return json({ booking }, { status: 201 });
});
