import type { Metadata } from "next";
import "./globals.css";
import "./pocket.css";

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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
