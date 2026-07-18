import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Providers } from "@/components/providers";
import "./globals.css";

/* ── Anti-flash theme script ────────────────────────────────────────────────
   Runs synchronously before React hydrates to apply the correct data-theme
   attribute, preventing a flash of the wrong theme on cold start.            */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('lifeos_theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export const metadata: Metadata = {
  title: { default: "LifeOS", template: "%s · LifeOS" },
  description: "Your offline-first personal operating system for placement prep, fitness, and daily reflection.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeOS",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#09090f" },
    { media: "(prefers-color-scheme: light)", color: "#f2f1ef" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" className="h-full antialiased">
      <head>
        {/* Synchronous theme script — must run before any CSS is parsed */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Google Fonts: Space Grotesk for display headings */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full font-sans">
        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
