import { LiveMap } from "./LiveMap";

export const metadata = {
  title: "Live train map — IRCTC",
  description: "Every train running across Indian Railways right now, on one map.",
};

export default function MapPage() {
  return <LiveMap />;
}
