import type { NextRequest } from "next/server";
import { getDraft, patchDraft, type DraftPatch } from "@/lib/mock/bookings";
import { getWorld } from "@/lib/mock/seed";
import { handler, json, notFound } from "@/lib/api/http";
import { stationSidecar } from "@/lib/api/dto";

export const GET = handler(async (_request: NextRequest, ctx: { params: Promise<{ draftId: string }> }) => {
  const { draftId } = await ctx.params;
  const draft = getDraft(draftId);
  if (!draft) return notFound(`No draft ${draftId}. It may have expired.`);

  const world = getWorld();
  const train = world.trains.get(draft.trainNumber)!;
  return json({
    draft,
    train: {
      number: train.number,
      name: train.name,
      type: train.type,
      classes: train.classes,
      hasPantry: train.hasPantry,
      schedule: train.schedule.filter((s) => s.isHalt),
    },
    stations: stationSidecar([draft.fromCode, draft.toCode], world.stations),
  });
});

/** Incremental save. Only the whitelisted fields move; everything else is ignored. */
export const PATCH = handler(async (request: NextRequest, ctx: { params: Promise<{ draftId: string }> }) => {
  const { draftId } = await ctx.params;
  const patch = (await request.json()) as DraftPatch;
  const draft = patchDraft(draftId, patch);
  if (!draft) return notFound(`No draft ${draftId}. It may have expired.`);
  return json({ draft });
});
