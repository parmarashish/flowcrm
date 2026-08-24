import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini CRM",
  description: "Open-source Mini CRM for lead management",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
