import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import { AppHeader, MobileNav } from "@/components/AppHeader";
import { Providers } from "@/components/ui/Providers";
import { LocaleProvider } from "@/lib/i18n/useLocale";
import { OfflineSupport } from "@/components/ui/OfflineSupport";
import { ChatProvider } from "@/lib/agent/ChatProvider";
import { ChatPanel } from "@/components/chat/ChatPanel";
import "./globals.css";

/*
 * Noto Sans is the UX4G base typeface. Self-hosted and subset by Next rather
 * than pulled from a CDN, with `swap` so text paints immediately in the system
 * font on a slow connection and changes over when the file lands. Devanagari is
 * included because Hindi is a first-class language here, not a bolt-on.
 */
const notoSans = Noto_Sans({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-noto-sans",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "IRCTC — Indian Railways, reimagined",
  description:
    "An independent redesign concept for IRCTC. Book the journey, not just the ticket — every class's availability at a glance, honest waitlist odds, real berth selection, and live tracking that doesn't stop at payment. Not the official IRCTC service.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
};

/** Applied before first paint so the language never flashes. */
const LOCALE_SCRIPT = `(function(){try{var l=localStorage.getItem('irctc.locale');if(l)document.documentElement.lang=l;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={notoSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:text-on-brand"
        >
          Skip to content
        </a>
        <Providers>
          <LocaleProvider>
            <ChatProvider>
              <AppHeader />
              <OfflineSupport />
              <main id="main" className="pb-[3.75rem] sm:pb-0">
                {children}
              </main>
              <MobileNav />
              <ChatPanel />
            </ChatProvider>
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  );
}
