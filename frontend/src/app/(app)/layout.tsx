"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { selectToken, selectHasHydrated } from "@/features/auth/authSlice";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const token = useAppSelector(selectToken);
  const hasHydrated = useAppSelector(selectHasHydrated);
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (token === null) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [token, hasHydrated, router]);

  if (!checked) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f1f3f4]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-[#f1f3f4] p-4 text-[#0f1923]">
          {children}
        </main>
      </div>
    </div>
  );
}
