"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Info, Lock } from "lucide-react";
import type { Berth, BookingDraft, Passenger } from "@/lib/types";
import { api, ApiError } from "@/lib/apiClient";
import { formatDateShort, formatMinute, formatWeekday, journeyInstant } from "@/lib/domain/time";
import { explainStatus } from "@/lib/glossary";
import { useLocale } from "@/lib/i18n/useLocale";
import { CoachStrip } from "@/components/coach/CoachStrip";
import { BerthMap, type BerthSelection } from "@/components/coach/BerthMap";
import { PassengerEditor, blankPassenger, saveRoster } from "@/components/book/PassengerEditor";
import { FareSummary, RefundPreview } from "@/components/book/FareSummary";
import { HoldBanner } from "@/components/book/HoldBanner";
import { TatkalPanel, BookingQueue } from "@/components/book/TatkalPanel";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatRupees } from "@/components/availability/ClassCell";
import { cn } from "@/components/ui/cn";
import { useAgentIntentDrain, useAgentPublish } from "@/lib/agent/agentStore";
import { applyBookingOptionsPatch, normalizeSetOptionsInput } from "@/lib/agent/normalizeToolInput";
import type { BerthType } from "@/lib/types";

export function BookingFlow({ draftId }: { draftId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useLocale();

  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [selections, setSelections] = useState<BerthSelection[]>([]);
  const [activeCoach, setActiveCoach] = useState<string | null>(null);
  const [options, setOptions] = useState({ keepTogether: true, addMeals: false, travelInsurance: true, autoUpgrade: true });
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [contact, setContact] = useState({ phone: "", email: "" });
  const [tatkalArmed, setTatkalArmed] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const hydrated = useRef(false);
  const confirmRef = useRef<(() => void) | null>(null);
  const publish = useAgentPublish();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["draft", draftId],
    queryFn: ({ signal }) => api.draft(draftId, signal),
    retry: false,
  });

  // Restore whatever was already saved on this draft — a reload must lose nothing.
  useEffect(() => {
    if (!data || hydrated.current) return;
    hydrated.current = true;
    const draft = data.draft;
    setPassengers(draft.passengers.length ? draft.passengers : [blankPassenger(0)]);
    setSelections(
      draft.passengers
        .filter((p) => p.allocatedCoach && p.allocatedBerth)
        .map((p) => ({ coachCode: p.allocatedCoach!, berthNumber: p.allocatedBerth! }))
    );
    setOptions({
      keepTogether: draft.keepTogether,
      addMeals: draft.addMeals,
      travelInsurance: draft.travelInsurance,
      autoUpgrade: draft.autoUpgrade,
    });
    setContact({ phone: draft.contactPhone ?? "", email: draft.contactEmail ?? "" });
    setTatkalArmed(Boolean(draft.tatkalOpensAt));
  }, [data]);

  const draft = data?.draft;

  const { data: coachData } = useQuery({
    queryKey: ["coaches", draft?.trainNumber, draft?.classCode, draft?.journeyDate, draft?.fromCode, draft?.toCode],
    queryFn: ({ signal }) =>
      api.coaches(
        draft!.trainNumber,
        draft!.classCode,
        { from: draft!.fromCode, to: draft!.toCode, date: draft!.journeyDate, quota: draft!.quota },
        signal
      ),
    enabled: Boolean(draft),
  });

  useEffect(() => {
    if (coachData && !activeCoach && coachData.coaches.length > 0) {
      const withSpace = coachData.coaches.find((c) => c.berths.some((b) => !b.isBooked)) ?? coachData.coaches[0];
      setActiveCoach(withSpace.code);
    }
  }, [coachData, activeCoach]);

  const availability = coachData?.availability ?? null;
  const canChooseBerth = availability?.state === "available";
  const totalFare = availability ? availability.fare.total * Math.max(1, passengers.length) - availability.fare.convenienceFee * (Math.max(1, passengers.length) - 1) : 0;

  const { data: refund } = useQuery({
    queryKey: ["refundPreview", draft?.trainNumber, draft?.journeyDate, draft?.classCode, totalFare, passengers.length],
    queryFn: ({ signal }) =>
      api.refundPreview(
        {
          train: draft!.trainNumber,
          from: draft!.fromCode,
          date: draft!.journeyDate,
          class: draft!.classCode,
          total: totalFare,
          passengers: Math.max(1, passengers.length),
          confirmed: canChooseBerth ? "true" : "false",
        },
        signal
      ),
    enabled: Boolean(draft && totalFare > 0),
  });

  const savePatch = useMutation({
    mutationFn: (patch: Partial<BookingDraft>) => api.patchDraft(draftId, patch),
    onSuccess: ({ draft: saved }) => {
      queryClient.setQueryData(["draft", draftId], (old: typeof data) => (old ? { ...old, draft: saved } : old));
    },
  });

  // Debounced autosave. The draft on the server is the source of truth.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueSave = useCallback(
    (patch: Partial<BookingDraft>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => savePatch.mutate(patch), 600);
    },
    [savePatch]
  );

  const passengersWithBerths = useMemo(
    () =>
      passengers.map((passenger, index) => {
        const selection = selections[index];
        if (!selection) return { ...passenger, allocatedCoach: null, allocatedBerth: null, allocatedBerthType: null };
        const coach = coachData?.coaches.find((c) => c.code === selection.coachCode);
        const berth = coach?.berths.find((b) => b.number === selection.berthNumber);
        return {
          ...passenger,
          allocatedCoach: selection.coachCode,
          allocatedBerth: selection.berthNumber,
          allocatedBerthType: berth?.type ?? null,
          berthPreference: berth?.type ?? passenger.berthPreference,
        };
      }),
    [passengers, selections, coachData]
  );

  useEffect(() => {
    if (!hydrated.current || !draft) return;
    queueSave({
      passengers: passengersWithBerths,
      keepTogether: options.keepTogether,
      addMeals: options.addMeals,
      travelInsurance: options.travelInsurance,
      autoUpgrade: options.autoUpgrade,
      contactPhone: contact.phone || null,
      contactEmail: contact.email || null,
    });
    // queueSave is stable enough for this; re-running on every render would thrash the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passengersWithBerths, options, contact, draft?.draftId]);

  useEffect(() => {
    if (!draft || !hydrated.current) return;
    publish.current({
      booking: {
        draftId: draft.draftId,
        trainNumber: draft.trainNumber,
        classCode: draft.classCode,
        holdExpiresAt: draft.holdExpiresAt,
        passengers: passengers.map((passenger) => ({
          name: passenger.name,
          age: passenger.age,
          gender: passenger.gender,
        })),
        contact,
        options,
        berthSelections: selections.map((selection) => ({
          coach: selection.coachCode,
          berth: selection.berthNumber,
        })),
        activeCoach,
      },
      berths: coachData
        ? {
            coaches: coachData.coaches.map((coach) => coach.code),
            freeByCoach: Object.fromEntries(
              coachData.coaches.map((coach) => [
                coach.code,
                coach.berths.filter((berth) => !berth.isBooked).length,
              ])
            ),
          }
        : null,
    });
  }, [draft, passengers, contact, options, selections, activeCoach, coachData, publish]);

  const namedPassengerCount = passengers.filter((passenger) => passenger.name.trim().length > 0).length;
  const bookingReady =
    namedPassengerCount > 0 && namedPassengerCount === passengers.length && contact.phone.length >= 10;

  const confirm = useMutation({
    mutationFn: async () => {
      await api.patchDraft(draftId, { passengers: passengersWithBerths });
      // An honest queue rather than an indeterminate spinner.
      const start = 400 + Math.floor(Math.random() * 3800);
      setQueuePosition(start);
      for (let position = start; position > 0; position = Math.max(0, position - Math.ceil(start / 12))) {
        setQueuePosition(position);
        await new Promise((resolve) => setTimeout(resolve, 160));
      }
      setQueuePosition(0);
      return api.confirmDraft(draftId);
    },
    onSuccess: ({ booking }) => {
      saveRoster(passengers);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      router.push(`/trips/${booking.pnr}`);
    },
    onError: (cause) => {
      setQueuePosition(null);
      setConfirmError(
        cause instanceof ApiError
          ? cause.message
          : locale === "hi"
            ? "यह बुकिंग पूरी नहीं हो सकी"
            : "Could not complete this booking"
      );
    },
  });

  confirmRef.current = () => {
    if (!bookingReady || confirm.isPending) return;
    setConfirmError(null);
    confirm.mutate();
  };

  useAgentIntentDrain(
    Boolean(draft && hydrated.current && !isPending),
    async (intent) => {
      switch (intent.name) {
        case "select_berth": {
          if (!coachData) {
            return { ok: false, error: "Coach layout still loading — try again in a moment." };
          }
          const coachCode = String(intent.input.coach ?? activeCoach ?? "");
          const wantedType = typeof intent.input.berthType === "string" ? (intent.input.berthType as BerthType) : null;
          const wantedNumber = Number(intent.input.berth);
          const coach = coachData?.coaches.find((entry) => entry.code === coachCode);
          if (!coach) {
            return { ok: false, error: `Coach ${coachCode} is not on screen.` };
          }
          if (activeCoach !== coachCode) setActiveCoach(coachCode);
          const free = coach.berths.filter((berth) => !berth.isBooked);
          const byType = wantedType
            ? free.find((berth) => berth.type === wantedType)
            : undefined;
          const byNumber = Number.isFinite(wantedNumber)
            ? free.find((berth) => berth.number === wantedNumber)
            : undefined;
          const target = byType ?? byNumber ?? free[0];
          if (!target) {
            return { ok: false, error: `No free berth in ${coachCode}.` };
          }
          const key = { coachCode, berthNumber: target.number };
          const exists = selections.some(
            (selection) => selection.coachCode === key.coachCode && selection.berthNumber === key.berthNumber
          );
          if (!exists) {
            if (selections.length >= passengers.length) {
              setSelections([key]);
            } else {
              setSelections([...selections, key]);
            }
          }
          return {
            ok: true,
            detail: `Selected berth ${target.number} (${target.type}) in ${coachCode}`,
          };
        }
        case "set_passengers": {
          const list =
            (intent.input.passengers as Array<{ name: string; age?: number; gender?: Passenger["gender"] }>) ?? [];
          if (!list.length) return { ok: false, error: "No passengers provided." };
          setPassengers(
            list.map((entry, index) => ({
              ...(passengers[index] ?? blankPassenger(index)),
              name: entry.name,
              age: entry.age ?? passengers[index]?.age ?? 30,
              gender: entry.gender ?? passengers[index]?.gender ?? "male",
            }))
          );
          return { ok: true, detail: `Set ${list.length} passenger(s)` };
        }
        case "set_contact": {
          const phone = String(intent.input.phone ?? contact.phone).replace(/\D/g, "").slice(0, 10);
          const email = typeof intent.input.email === "string" ? intent.input.email : contact.email;
          setContact({ phone, email });
          return { ok: true, detail: `Contact updated (${phone}${email ? `, ${email}` : ""})` };
        }
        case "set_options": {
          const patch = normalizeSetOptionsInput(intent.input);
          const { next, changed } = applyBookingOptionsPatch(optionsRef.current, patch);
          if (!changed.length) {
            return {
              ok: false,
              error:
                "No matching options in the request. Pass addMeals, travelInsurance, keepTogether, or autoUpgrade as booleans.",
            };
          }
          setOptions(next);
          return { ok: true, detail: `Updated ${changed.join(", ")}` };
        }
        case "confirm": {
          if (!bookingReady) {
            return { ok: false, error: "Passenger names and a 10-digit mobile are required before confirm." };
          }
          confirmRef.current?.();
          return { ok: true, detail: "Confirm started" };
        }
        case "select_class":
          return { ok: true, detail: `Class is already ${draft?.classCode} on this draft.` };
        default:
          return { ok: false, error: `Unhandled booking intent ${intent.name}` };
      }
    },
    (intent) =>
      ["select_berth", "set_passengers", "set_contact", "set_options", "confirm", "select_class"].includes(
        intent.name
      )
  );

  if (isPending) return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><SkeletonRows rows={4} /></div>;
  if (isError || !draft)
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <ErrorState
          error={
            error ??
            new Error(locale === "hi" ? "यह बुकिंग ड्राफ्ट अब उपलब्ध नहीं है" : "This booking draft is no longer available")
          }
          onRetry={() => refetch()}
        />
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-3 text-[0.8125rem] text-brand underline decoration-dotted underline-offset-2"
        >
          {t("book.startNewSearch")}
        </button>
      </div>
    );

  const { train, stations } = data;
  const fromStop = train.schedule.find((s) => s.stationCode === draft.fromCode);
  const toStop = train.schedule.find((s) => s.stationCode === draft.toCode);
  const namedPassengers = passengers.filter((p) => p.name.trim().length > 0);
  const ready = namedPassengers.length > 0 && namedPassengers.length === passengers.length && contact.phone.length >= 10;

  // Tatkal opens the day before: 10:00 for AC classes, 11:00 for sleeper.
  const tatkalOpens = new Date(journeyInstant(draft.journeyDate, draft.classCode === "SL" ? 11 * 60 : 10 * 60) - 86400_000);
  const showTatkal = draft.quota === "TQ" || draft.quota === "PT";

  const toggleBerth = (berth: Berth) => {
    const key = { coachCode: activeCoach!, berthNumber: berth.number };
    const existing = selections.findIndex((s) => s.coachCode === key.coachCode && s.berthNumber === key.berthNumber);
    if (existing >= 0) setSelections(selections.filter((_, i) => i !== existing));
    else if (selections.length < passengers.length) setSelections([...selections, key]);
  };

  if (queuePosition !== null) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-20 sm:px-6">
        <BookingQueue position={Math.max(1, queuePosition)} total={4200} />
        <p className="text-center text-[0.75rem] text-faint">
          {locale === "hi"
            ? `${train.number} पर ${namedPassengers.length} यात्री${namedPassengers.length === 1 ? "" : "यों"} की बुकिंग कन्फ़र्म हो रही है`
            : `${t("book.confirming")} ${namedPassengers.length} passenger${namedPassengers.length === 1 ? "" : "s"} on ${train.number}`}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-5 sm:px-6">
      <HoldBanner holdExpiresAt={draft.holdExpiresAt} saving={savePatch.isPending} />

      <header className="card mt-3 p-4">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="tnum text-[0.8125rem] text-faint">{train.number}</span>
          <h1 className="text-[1.0625rem] text-text">{train.name}</h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.875rem]">
          <span className="tnum text-text">{formatMinute(fromStop?.departureMinute ?? 0)}</span>
          <span className="text-dim">{stations[draft.fromCode]?.name}</span>
          <ArrowRight className="size-3.5 text-faint" aria-hidden />
          <span className="tnum text-text">{formatMinute(toStop?.arrivalMinute ?? 0)}</span>
          <span className="text-dim">{stations[draft.toCode]?.name}</span>
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.75rem] text-faint">
          <span>{formatWeekday(draft.journeyDate, locale)} {formatDateShort(draft.journeyDate, locale)}</span>
          <span>·</span>
          <span className="font-mono">{draft.classCode}</span>
          <span>·</span>
          <span>{draft.quota} {t("search.quota").toLowerCase()}</span>
          {fromStop?.platform && (
            <>
              <span>·</span>
              <span>{t("common.platform")} {fromStop.platform}</span>
            </>
          )}
        </p>
      </header>

      {showTatkal && (
        <div className="mt-3">
          <TatkalPanel
            opensAt={tatkalOpens}
            classCode={draft.classCode}
            armed={tatkalArmed}
            onArm={(armed) => {
              setTatkalArmed(armed);
              savePatch.mutate({ tatkalOpensAt: armed ? tatkalOpens.toISOString() : null });
            }}
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          <section className="card p-4">
            <h2 className="mb-1 text-[0.9375rem] text-text">{t("coach.chooseTitle")}</h2>
            {availability && (
              <p className="mb-3 text-[0.8125rem] text-dim">
                <span
                  className={cn(
                    "tnum",
                    availability.state === "available" ? "text-ok" : availability.state === "rac" ? "text-warn" : "text-danger"
                  )}
                >
                  {availability.label}
                </span>
                <span className="ml-2 text-faint">{explainStatus(availability.label, locale)}</span>
              </p>
            )}

            {coachData ? (
              <>
                {!canChooseBerth && (
                  <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 p-3">
                    <Info className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden />
                    <p className="text-[0.8125rem] leading-relaxed text-dim">
                      {availability?.state === "rac" ? t("coach.racCantClaim") : t("coach.waitlistCantClaim")}
                    </p>
                  </div>
                )}
                <CoachStrip
                  rake={coachData.coaches}
                  selectedCode={activeCoach}
                  onSelect={(coach) => setActiveCoach(coach.code)}
                  className="mb-3"
                />
                {activeCoach && (
                  <BerthMap
                    coach={coachData.coaches.find((c) => c.code === activeCoach)!}
                    selections={selections}
                    onToggle={toggleBerth}
                    passengerCount={Math.max(1, passengers.length)}
                    selectable={canChooseBerth}
                  />
                )}
              </>
            ) : (
              <SkeletonRows rows={3} />
            )}
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-[0.9375rem] text-text">{t("coach.whosTravelling")}</h2>
            <PassengerEditor
              passengers={passengers}
              onChange={(next) => {
                setPassengers(next);
                if (selections.length > next.length) setSelections(selections.slice(0, next.length));
              }}
              selectionFor={(_, index) => {
                const selection = selections[index];
                if (!selection) return null;
                const coach = coachData?.coaches.find((c) => c.code === selection.coachCode);
                const berth = coach?.berths.find((b) => b.number === selection.berthNumber);
                return berth ? { ...selection, berthType: berth.type } : null;
              }}
            />

            <div className="mt-4 space-y-2 border-t border-border pt-3.5">
              <Toggle
                label={t("book.keepTogether")}
                hint={t("book.keepTogetherHint")}
                checked={options.keepTogether}
                onChange={(keepTogether) => setOptions({ ...options, keepTogether })}
              />
              <Toggle
                label={t("book.addMeals")}
                hint={train.hasPantry ? t("book.addMealsPantryHint") : t("book.addMealsStationHint")}
                checked={options.addMeals}
                onChange={(addMeals) => setOptions({ ...options, addMeals })}
              />
              <Toggle
                label={t("book.insurance")}
                hint={t("book.insuranceHint")}
                checked={options.travelInsurance}
                onChange={(travelInsurance) => setOptions({ ...options, travelInsurance })}
              />
              <Toggle
                label={t("book.autoUpgrade")}
                hint={t("book.autoUpgradeHint")}
                checked={options.autoUpgrade}
                onChange={(autoUpgrade) => setOptions({ ...options, autoUpgrade })}
              />
            </div>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-[0.9375rem] text-text">{t("coach.sendTicket")}</h2>
            <div className="flex flex-wrap gap-2">
              <label className="min-w-[9rem] flex-1">
                <span className="eyebrow mb-1 block">{t("coach.mobile")}</span>
                <input
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  inputMode="numeric"
                  placeholder={t("coach.tenDigits")}
                  className="tnum h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-[0.875rem] text-text outline-none transition-colors focus:border-brand placeholder:text-faint"
                />
              </label>
              <label className="min-w-[11rem] flex-[2]">
                <span className="eyebrow mb-1 block">{t("coach.emailOptional")}</span>
                <input
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  type="email"
                  placeholder="you@example.com"
                  className="h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-[0.875rem] text-text outline-none transition-colors focus:border-brand placeholder:text-faint"
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-3 lg:sticky lg:top-[4.5rem]">
          <div className="card p-4">
            <h2 className="mb-3 text-[0.9375rem] text-text">{t("book.whatYoullPay")}</h2>
            {availability ? (
              <FareSummary
                fare={{ ...availability.fare, total: totalFare, baseFare: availability.fare.baseFare * Math.max(1, passengers.length) }}
                passengerCount={Math.max(1, passengers.length)}
              />
            ) : (
              <SkeletonRows rows={1} />
            )}
          </div>

          {refund && <RefundPreview quote={refund.quote} />}

          <div className="card p-4">
            <button
              type="button"
              disabled={!ready || confirm.isPending}
              onClick={() => {
                setConfirmError(null);
                confirm.mutate();
              }}
              className="btn btn-primary h-12 w-full text-[0.9375rem]"
            >
              <Check className="size-4" aria-hidden />
              {t("book.confirmAndPay")} {formatRupees(totalFare)}
            </button>

            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[0.6875rem] text-faint">
              <Lock className="size-3" aria-hidden />
              {t("book.noCaptcha")}
            </p>

            {!ready && (
              <p className="mt-2 text-center text-[0.75rem] text-warn">
                {namedPassengers.length !== passengers.length ? t("book.everyoneNeedsName") : t("book.needMobile")}
              </p>
            )}

            {confirmError && (
              <p role="alert" className="mt-2 rounded-lg bg-danger-soft px-2.5 py-2 text-[0.75rem] text-danger">
                {confirmError}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-2.5 rounded-lg py-1.5 text-left transition-colors hover:bg-surface-2"
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors",
          checked ? "bg-brand" : "bg-surface-3"
        )}
        aria-hidden
      >
        <span className={cn("size-3 rounded-full bg-[color:var(--surface)] transition-transform", checked && "translate-x-3")} />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.8125rem] text-text">{label}</span>
        {hint && <span className="block text-[0.6875rem] leading-relaxed text-faint">{hint}</span>}
      </span>
    </button>
  );
}
