import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import { AppHeader, MobileNav } from "@/components/AppHeader";
import { Providers } from "@/components/ui/Providers";
import { LocaleProvider } from "@/lib/i18n/useLocale";
import { OfflineSupport } from "@/components/ui/OfflineSupport";
import { Toaster } from "@/components/ui/sonner";
import { ChatProvider } from "@/lib/agent/ChatProvider";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { VoiceButton } from "@/components/voice/VoiceButton";
import "./globals.css";

/*
 * Noto Sans covers latin and Devanagari in one family — Hindi is first-class
 * here, not a bolt-on. Self-hosted via next/font with swap so text paints in
 * the system font on a slow connection and upgrades when the file lands.
 */
const notoSans = Noto_Sans({
  subsets: ["latin", "devanagari"],
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

/** Applied before first paint so the theme never flashes. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('irctc.theme');if(t&&t!=='system')document.documentElement.setAttribute('data-theme',t);var l=localStorage.getItem('irctc.locale');if(l)document.documentElement.lang=l;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${notoSans.variable} font-sans`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
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
              <VoiceButton />
              <Toaster position="top-center" richColors closeButton />
            </ChatProvider>
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  );
}
