import type { Metadata } from "next";
import "./globals.css";
import "./pocket.css";
import "./pocket-dark.css";
import { themeScript } from "@/lib/theme-script";

export const metadata: Metadata = {
  title: "Pocket · Your money",
  description: "Your whole pocket: accounts, income, spending, savings and net worth in one place.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pocket",
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/pocket.svg",
    shortcut: "/pocket.svg",
    apple: "/pocket.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme is set by the inline script before hydration, hence suppressHydrationWarning.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#006a4e" />
        <link rel="apple-touch-icon" href="/pocket.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});}" }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
