import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/store/StoreProvider";
import { Toaster } from "@/components/ui/sonner";
import { AuthInitializer } from "@/components/AuthInitializer";

export const metadata: Metadata = {
  title: "FlowCRM — Pipeline · People · Performance",
  description: "Production-grade CRM for modern sales teams",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <AuthInitializer />
          {children}
        </StoreProvider>
        <Toaster />
      </body>
    </html>
  );
}
