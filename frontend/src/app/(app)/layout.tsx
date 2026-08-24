"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { selectToken, selectHasHydrated } from "@/features/auth/authSlice";
import { Sidebar } from "@/components/Sidebar";

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
    <div className="flex">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
