"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, X, Users2, Contact2, Building2, Handshake } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGetLeadsQuery } from "@/features/leads/leadsApi";
import { useGetContactsQuery } from "@/features/contacts/contactsApi";
import { useGetCompaniesQuery } from "@/features/companies/companiesApi";
import { useGetDealsQuery } from "@/features/deals/dealsApi";

const MIN_QUERY_LENGTH = 2;
const RESULTS_PER_TYPE = 4;

interface SearchResultItem {
  id: string;
  type: "lead" | "contact" | "company" | "deal";
  label: string;
  sublabel?: string;
  href: string;
}

function formatCurrency(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value}`;
  }
}

const TYPE_META: Record<SearchResultItem["type"], { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  lead: { label: "Leads", icon: Users2 },
  contact: { label: "Contacts", icon: Contact2 },
  company: { label: "Companies", icon: Building2 },
  deal: { label: "Deals", icon: Handshake },
};

export function HeaderSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const shouldSearch = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const leads = useGetLeadsQuery(
    { search: debouncedQuery, limit: RESULTS_PER_TYPE },
    { skip: !shouldSearch }
  );
  const contacts = useGetContactsQuery(
    { search: debouncedQuery, limit: RESULTS_PER_TYPE },
    { skip: !shouldSearch }
  );
  const companies = useGetCompaniesQuery(
    { search: debouncedQuery, limit: RESULTS_PER_TYPE },
    { skip: !shouldSearch }
  );
  const deals = useGetDealsQuery(
    { search: debouncedQuery, limit: RESULTS_PER_TYPE },
    { skip: !shouldSearch }
  );

  const isSearching =
    shouldSearch &&
    (leads.isFetching || contacts.isFetching || companies.isFetching || deals.isFetching);

  const results = useMemo<SearchResultItem[]>(() => {
    if (!shouldSearch) return [];
    const items: SearchResultItem[] = [];
    for (const lead of leads.data?.items ?? []) {
      items.push({ id: lead.id, type: "lead", label: lead.name, sublabel: lead.email, href: `/leads/${lead.id}` });
    }
    for (const contact of contacts.data?.items ?? []) {
      items.push({
        id: contact.id,
        type: "contact",
        label: contact.name,
        sublabel: contact.company?.name ?? contact.email,
        href: `/contacts/${contact.id}`,
      });
    }
    for (const company of companies.data?.items ?? []) {
      items.push({
        id: company.id,
        type: "company",
        label: company.name,
        sublabel: company.industry,
        href: `/companies/${company.id}`,
      });
    }
    for (const deal of deals.data?.items ?? []) {
      items.push({
        id: deal.id,
        type: "deal",
        label: deal.title,
        sublabel: formatCurrency(deal.value, deal.currency),
        href: `/deals/${deal.id}`,
      });
    }
    return items;
  }, [shouldSearch, leads.data, contacts.data, companies.data, deals.data]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigateTo(item: SearchResultItem) {
    router.push(item.href);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) navigateTo(item);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showPanel = open && shouldSearch;

  return (
    <div ref={containerRef} className="relative w-[240px] sm:w-[280px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#545b64]" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search leads, contacts, status..."
        className="h-8 pl-8 pr-7 text-xs border-[#aab7b8] placeholder:text-[#879596]"
        aria-label="Global search"
        role="combobox"
        aria-expanded={showPanel}
        aria-autocomplete="list"
      />
      {isSearching ? (
        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-[#879596]" />
      ) : (
        query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#879596] hover:text-[#0f1923] cursor-pointer"
            title="Clear search"
          >
            <X className="size-3.5" />
            <span className="sr-only">Clear search</span>
          </button>
        )
      )}

      {showPanel && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-[2px] border border-[#d5d9d9] bg-white shadow-lg"
        >
          {isSearching && results.length === 0 && (
            <p className="px-3 py-3 text-xs text-[#879596]">Searching…</p>
          )}
          {!isSearching && results.length === 0 && (
            <p className="px-3 py-3 text-xs text-[#879596]">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}
          {(["lead", "contact", "company", "deal"] as const).map((type) => {
            const group = results.filter((r) => r.type === type);
            if (group.length === 0) return null;
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            return (
              <div key={type} className="py-1">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#879596]">
                  {meta.label}
                </div>
                {group.map((item) => {
                  const globalIndex = results.indexOf(item);
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={globalIndex === activeIndex}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      onClick={() => navigateTo(item)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs cursor-pointer",
                        globalIndex === activeIndex ? "bg-[#f1f6fd] text-[#0066cc]" : "hover:bg-[#f2f3f3]"
                      )}
                    >
                      <Icon className="size-3.5 shrink-0 text-[#879596]" />
                      <span className="truncate font-medium">{item.label}</span>
                      {item.sublabel && (
                        <span className="ml-auto shrink-0 truncate text-[11px] text-[#879596]">
                          {item.sublabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
