"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser, logout, clearPersistedAuth } from "@/features/auth/authSlice";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/leads/kanban", label: "Kanban" },
];

export function Sidebar() {
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    dispatch(logout());
    clearPersistedAuth();
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r p-4">
      <div className="mb-6 text-lg font-bold">Mini CRM</div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded px-3 py-2 text-sm hover:bg-muted",
              pathname === item.href && "bg-muted font-medium"
            )}
          >
            {item.label}
          </Link>
        ))}
        {user?.role === "admin" && (
          <Link
            href="/users"
            className={cn(
              "rounded px-3 py-2 text-sm hover:bg-muted",
              pathname === "/users" && "bg-muted font-medium"
            )}
          >
            Manage Users
          </Link>
        )}
      </nav>
      <div className="border-t pt-4">
        <p className="mb-2 text-sm text-muted-foreground">
          {user?.name} ({user?.role})
        </p>
        <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
          Log out
        </Button>
      </div>
    </aside>
  );
}
