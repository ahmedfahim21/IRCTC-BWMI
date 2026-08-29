import type { TrainType } from "@/lib/types";
import { localizeTrainType } from "@/lib/railradar/trainTypes";

export const TRAIN_TYPE_LABEL: Record<TrainType, string> = {
  rajdhani: "Rajdhani",
  shatabdi: "Shatabdi",
  vandeBharat: "Vande Bharat",
  duronto: "Duronto",
  superfast: "Superfast",
  express: "Express",
  passenger: "Passenger",
};

export function trainTypeLabel(type: TrainType, locale: "en" | "hi"): string {
  return localizeTrainType(TRAIN_TYPE_LABEL[type], locale);
}

export const TRAIN_TYPE_TONE: Record<TrainType, { color: string; chip: string }> = {
  rajdhani: { color: "var(--danger)", chip: "bg-danger-soft text-danger" },
  shatabdi: { color: "var(--warn)", chip: "bg-warn-soft text-warn" },
  vandeBharat: { color: "var(--ok)", chip: "bg-ok-soft text-ok" },
  duronto: { color: "var(--info)", chip: "bg-info-soft text-info" },
  superfast: { color: "var(--brand)", chip: "bg-brand-soft text-brand" },
  express: { color: "var(--accent)", chip: "bg-accent-soft text-accent" },
  passenger: { color: "var(--text-faint)", chip: "bg-surface-2 text-dim" },
};

type SilhouetteKind = "bullet" | "premium" | "loco" | "short";

function silhouetteKind(type: TrainType): SilhouetteKind {
  switch (type) {
    case "vandeBharat":
      return "bullet";
    case "rajdhani":
    case "shatabdi":
    case "duronto":
      return "premium";
    case "superfast":
    case "express":
      return "loco";
    case "passenger":
      return "short";
    default: {
      const _never: never = type;
      return _never;
    }
  }
}

export function TrainSilhouette({ type }: { type: TrainType }) {
  const kind = silhouetteKind(type);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -left-4 -top-2 w-[8.5rem] -rotate-[22deg] text-current opacity-[0.09]"
      style={{ color: TRAIN_TYPE_TONE[type].color }}
    >
      {renderBody(kind)}
    </div>
  );
}

function renderBody(kind: SilhouetteKind) {
  switch (kind) {
    case "bullet":
      return <BulletBody />;
    case "premium":
      return <PremiumBody />;
    case "loco":
      return <LocoBody />;
    case "short":
      return <ShortBody />;
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

function Track() {
  return (
    <>
      <path d="M4 78h148" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 82h140" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
    </>
  );
}

function BulletBody() {
  return (
    <svg viewBox="0 0 160 90" fill="none" className="h-auto w-full">
      <path
        d="M18 72c2-18 10-32 28-40 14-6 32-8 48-7 18 1 34 6 44 14 6 5 10 12 8 20-1 6-6 10-14 12H28c-6 0-11-1-10 1z"
        fill="currentColor"
      />
      <path d="M78 32c18-1 34 3 46 10 4 2 7 6 8 11H72c1-8 3-16 6-21z" fill="var(--surface)" opacity="0.55" />
      <path d="M42 38c6-6 14-10 24-11v14H48c-3 0-5-1-6-3z" fill="var(--surface)" opacity="0.7" />
      <path d="M36 52h86" stroke="var(--surface)" strokeWidth="2.2" opacity="0.45" />
      <Track />
    </svg>
  );
}

function PremiumBody() {
  return (
    <svg viewBox="0 0 160 90" fill="none" className="h-auto w-full">
      <path
        d="M14 72c1-14 6-28 20-38 10-7 22-10 36-10h52c10 0 18 4 22 12 3 6 2 14-4 18H22c-5 0-8-1-8 18z"
        fill="currentColor"
      />
      <rect x="40" y="34" width="18" height="10" rx="1.5" fill="var(--surface)" opacity="0.65" />
      <rect x="62" y="34" width="18" height="10" rx="1.5" fill="var(--surface)" opacity="0.65" />
      <rect x="84" y="34" width="18" height="10" rx="1.5" fill="var(--surface)" opacity="0.65" />
      <rect x="106" y="34" width="14" height="10" rx="1.5" fill="var(--surface)" opacity="0.5" />
      <path d="M28 40h8v8h-8z" fill="var(--surface)" opacity="0.75" />
      <path d="M54 54h70" stroke="var(--surface)" strokeWidth="2" opacity="0.4" />
      <Track />
    </svg>
  );
}

function LocoBody() {
  return (
    <svg viewBox="0 0 160 90" fill="none" className="h-auto w-full">
      <path d="M18 72V44c0-6 4-12 12-14h28v42H18z" fill="currentColor" />
      <path d="M58 72V38h28v34H58z" fill="currentColor" />
      <path d="M88 72V38h28v34H88z" fill="currentColor" />
      <path d="M118 72V42h18c4 0 8 4 8 10v20h-26z" fill="currentColor" />
      <path d="M24 38h10v10H24z" fill="var(--surface)" opacity="0.75" />
      <rect x="64" y="44" width="16" height="9" rx="1" fill="var(--surface)" opacity="0.6" />
      <rect x="94" y="44" width="16" height="9" rx="1" fill="var(--surface)" opacity="0.6" />
      <circle cx="30" cy="72" r="5" fill="currentColor" />
      <circle cx="48" cy="72" r="5" fill="currentColor" />
      <circle cx="72" cy="72" r="4" fill="currentColor" />
      <circle cx="102" cy="72" r="4" fill="currentColor" />
      <Track />
    </svg>
  );
}

function ShortBody() {
  return (
    <svg viewBox="0 0 160 90" fill="none" className="h-auto w-full">
      <path d="M36 72V40c0-6 6-12 14-12h60c8 0 14 6 14 12v32H36z" fill="currentColor" />
      <path d="M48 36h16v12H48z" fill="var(--surface)" opacity="0.7" />
      <path d="M70 36h16v12H70z" fill="var(--surface)" opacity="0.7" />
      <path d="M92 36h16v12H92z" fill="var(--surface)" opacity="0.7" />
      <circle cx="52" cy="72" r="6" fill="currentColor" />
      <circle cx="108" cy="72" r="6" fill="currentColor" />
      <Track />
    </svg>
  );
}
