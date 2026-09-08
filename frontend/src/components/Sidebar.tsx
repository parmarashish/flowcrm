"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users2,
  KanbanSquare,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Contact2,
  Building2,
  Handshake,
  ListChecks,
  BarChart3,
  History,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser, logout, clearPersistedAuth } from "@/features/auth/authSlice";
import { apiSlice } from "@/store/apiSlice";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setCollapsed(mql.matches);
    const handleChange = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  function handleLogout() {
    dispatch(logout());
    dispatch(apiSlice.util.resetApiState());
    clearPersistedAuth();
    router.push("/login");
  }

  const sections: NavSection[] = [
    {
      items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      title: "PIPELINE",
      items: [
        { href: "/leads", label: "Leads", icon: Users2 },
        { href: "/leads/kanban", label: "Kanban Board", icon: KanbanSquare },
        { href: "/contacts", label: "Contacts", icon: Contact2 },
        { href: "/companies", label: "Companies", icon: Building2 },
        { href: "/deals", label: "Deals", icon: Handshake },
      ],
    },
    {
      title: "ACTIVITIES",
      items: [
        { href: "/tasks", label: "Tasks", icon: ListChecks },
        { href: "/activity", label: "Activity Log", icon: History },
      ],
    },
    {
      title: "INSIGHTS",
      items: [{ href: "/reports", label: "Reports", icon: BarChart3 }],
    },
    ...(user?.role === "admin"
      ? [
          {
            title: "SETTINGS",
            items: [{ href: "/users", label: "User Management", icon: ShieldCheck }],
          },
        ]
      : []),
  ];

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-[#0f1923] text-[#d1d5db] border-r border-[#232f3e] transition-all duration-200 select-none flex-shrink-0 z-30",
        collapsed ? "w-[56px]" : "w-[220px]"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-12 items-center px-3 border-b border-[#232f3e] bg-[#0c141c] [--logo-wordmark:#ffffff] overflow-hidden">
        <Logo size="md" variant={collapsed ? "icon-only" : "full"} />
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-4">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!collapsed && section.title && (
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-[#879596] uppercase">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex h-[36px] items-center gap-2.5 px-3 text-[13px] font-normal transition-colors relative cursor-pointer",
                    isActive
                      ? "bg-[#1a6fba] text-white font-medium shadow-none"
                      : "text-[#d1d5db] hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", isActive ? "text-white" : "text-[#9ca3af]")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#ffffff]" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-2 py-1.5 border-t border-[#232f3e]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-full items-center justify-center gap-2 rounded-[2px] text-xs text-[#879596] hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <>
              <ChevronLeft className="size-3.5" />
              <span className="text-[11px] uppercase tracking-wider">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* User Footer Panel */}
      <div className="border-t border-[#232f3e] p-2 bg-[#0c141c]">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-7 rounded-[2px] border border-[#232f3e] bg-[#1f2937] text-white shrink-0">
            <AvatarFallback className="rounded-[2px] bg-[#1a6fba] text-[11px] font-semibold text-white">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate leading-tight">
                {user?.name ?? "User"}
              </p>
              <p className="text-[10px] text-[#879596] uppercase tracking-wider truncate">
                {user?.role?.replace("_", " ") ?? "Agent"}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Log out"
            className={cn(
              "flex items-center justify-center rounded-[2px] p-1 text-[#879596] hover:bg-[#d13212] hover:text-white transition-colors",
              collapsed ? "w-full mt-1" : "size-7"
            )}
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
