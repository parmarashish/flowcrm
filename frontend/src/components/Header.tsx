"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, User as UserIcon, Shield, LogOut, CheckCircle2 } from "lucide-react";
import { HeaderSearch } from "@/components/HeaderSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser, logout, clearPersistedAuth } from "@/features/auth/authSlice";
import { apiSlice } from "@/store/apiSlice";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);

  function handleLogout() {
    dispatch(logout());
    dispatch(apiSlice.util.resetApiState());
    clearPersistedAuth();
    router.push("/login");
  }

  // Generate page title and breadcrumbs based on pathname
  let pageTitle = "Dashboard";
  let breadcrumbs = ["Overview", "Dashboard"];

  if (pathname === "/dashboard") {
    pageTitle = "Dashboard";
    breadcrumbs = ["Overview", "Dashboard"];
  } else if (pathname === "/leads") {
    pageTitle = "Leads";
    breadcrumbs = ["Management", "Leads"];
  } else if (pathname === "/leads/new") {
    pageTitle = "Add New Lead";
    breadcrumbs = ["Management", "Leads", "Create"];
  } else if (pathname.startsWith("/leads/kanban")) {
    pageTitle = "Pipeline Board";
    breadcrumbs = ["Management", "Leads", "Kanban"];
  } else if (pathname.startsWith("/leads/")) {
    pageTitle = "Lead Details";
    breadcrumbs = ["Management", "Leads", "Edit Lead"];
  } else if (pathname === "/contacts") {
    pageTitle = "Contacts";
    breadcrumbs = ["Management", "Contacts"];
  } else if (pathname.startsWith("/contacts/")) {
    pageTitle = "Contact Details";
    breadcrumbs = ["Management", "Contacts", "Details"];
  } else if (pathname === "/companies") {
    pageTitle = "Companies";
    breadcrumbs = ["Management", "Companies"];
  } else if (pathname.startsWith("/companies/")) {
    pageTitle = "Company Details";
    breadcrumbs = ["Management", "Companies", "Details"];
  } else if (pathname === "/deals") {
    pageTitle = "Deals";
    breadcrumbs = ["Pipeline", "Deals"];
  } else if (pathname.startsWith("/deals/")) {
    pageTitle = "Deal Details";
    breadcrumbs = ["Pipeline", "Deals", "Details"];
  } else if (pathname === "/tasks") {
    pageTitle = "Tasks";
    breadcrumbs = ["Activities", "Tasks"];
  } else if (pathname === "/activity") {
    pageTitle = "Activity Log";
    breadcrumbs = ["Activities", "Activity Log"];
  } else if (pathname === "/reports") {
    pageTitle = "Reports & Analytics";
    breadcrumbs = ["Insights", "Reports"];
  } else if (pathname === "/users") {
    pageTitle = "User Management";
    breadcrumbs = ["Administration", "Users & Roles"];
  }

  useEffect(() => {
    document.title = `${pageTitle} · FlowCRM`;
  }, [pageTitle]);

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
    <header className="sticky top-0 z-20 flex h-12 w-full items-center justify-between border-b border-[#d5d9d9] bg-white px-4 select-none">
      {/* Left Title & Breadcrumbs */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1 text-[11px] text-[#545b64]">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1">
              {idx > 0 && <span className="text-[#879596]">/</span>}
              <span className={idx === breadcrumbs.length - 1 ? "font-medium text-[#0f1923]" : ""}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
        <h1 className="text-sm font-semibold leading-tight text-[#0f1923] tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Global Search */}
        <HeaderSearch />

        {/* Region / Status Indicator Pill */}
        <div className="hidden md:flex items-center gap-1.5 rounded-[2px] border border-[#d5d9d9] bg-[#f8f9fa] px-2 py-1 text-[11px] text-[#545b64]">
          <span className="size-2 rounded-full bg-[#1d8102]" />
          <span className="font-medium">System Online</span>
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-[2px] border border-[#d5d9d9] bg-white px-2 py-1 text-xs text-[#0f1923] hover:bg-[#f2f3f3] transition-colors outline-none cursor-pointer">
              <Avatar className="size-5 rounded-[2px]">
                <AvatarFallback className="rounded-[2px] bg-[#0066cc] text-[10px] text-white">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline font-medium max-w-[100px] truncate">
                {user?.name ?? "User"}
              </span>
              <ChevronDown className="size-3 text-[#545b64]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-xs font-semibold text-[#0f1923]">{user?.name}</p>
                <p className="text-[11px] text-[#545b64] truncate">{user?.email}</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-[#0066cc]">
                  <Shield className="size-3" />
                  <span>Role: {user?.role?.replace("_", " ")}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-[#d13212] focus:text-[#d13212]">
              <LogOut className="size-3.5 mr-2" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
