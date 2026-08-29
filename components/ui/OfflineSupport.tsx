"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { STALE_EVENT } from "@/lib/apiClient";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * Registers the service worker and tells the user plainly when they're offline
 * — a stale screen that looks live is worse than one that says so.
 */
export function OfflineSupport() {
  const { t } = useLocale();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch((error) => {
          // Not fatal — the app works online without it. Still worth seeing.
          console.warn("[irctc] service worker registration failed:", error);
        });
      } else {
        /*
         * Never in development. The worker cache-firsts /_next/static/, and in
         * dev those URLs are not content-hashed — so it would pin the first
         * stylesheet it ever saw and quietly fight every hot reload after.
         * Tear down anything left over from a production build on this origin.
         */
        void navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) void registration.unregister();
        });
        void caches?.keys().then((keys) => keys.filter((k) => k.startsWith("irctc-")).forEach((k) => void caches.delete(k)));
      }
    }

    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    // The worker tells us directly when it had to fall back to cache.
    window.addEventListener(STALE_EVENT, goOffline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener(STALE_EVENT, goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-14 z-30 flex items-center justify-center gap-2 bg-warn px-4 py-1.5 text-[0.75rem] text-[color:var(--surface)]"
    >
      <CloudOff className="size-3.5" aria-hidden />
      {t("offline.banner")}
    </div>
  );
}
