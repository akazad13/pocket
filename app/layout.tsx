import type { Metadata } from "next";
import "./globals.css";
import "./pocket.css";
import "./pocket-dark.css";
import { themeScript } from "@/lib/theme-script";

export const metadata: Metadata = {
  title: "Pocket · Expense tracker",
  description: "Track everyday expenses and see your monthly spending clearly.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/pocket.svg",
    shortcut: "/pocket.svg",
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
