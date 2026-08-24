import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/store/StoreProvider";

export const metadata: Metadata = {
  title: "Mini CRM",
  description: "Open-source Mini CRM for lead management",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
