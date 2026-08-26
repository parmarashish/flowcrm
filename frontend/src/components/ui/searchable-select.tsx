"use client";

import { useMemo, useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  clearLabel?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  emptyText = "No results found.",
  clearLabel = "None",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)
    );
  }, [options, query]);

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-8 w-full items-center justify-between rounded-[2px] border border-[#aab7b8] bg-white px-2.5 text-xs text-[#0f1923] outline-none transition-colors focus-visible:border-[#0066cc] focus-visible:ring-1 focus-visible:ring-[#0066cc] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#f2f3f3]"
        >
          <span className={cn("truncate text-left", !selected && "text-[#879596]")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="size-3.5 text-[#879596] shrink-0 ml-1" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-[2px] border border-[#d5d9d9] bg-white shadow-lg"
        >
          <div className="flex items-center gap-1.5 border-b border-[#d5d9d9] px-2 py-1.5">
            <Search className="size-3.5 text-[#879596] shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full text-xs outline-none placeholder:text-[#879596]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-[#879596] hover:text-[#0f1923] cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-[#f2f3f3] cursor-pointer",
                !value && "text-[#0066cc] font-medium"
              )}
            >
              <Check className={cn("size-3.5 shrink-0", !value ? "opacity-100" : "opacity-0")} />
              {clearLabel}
            </button>
            {filtered.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-[#879596]">{emptyText}</p>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-[#f2f3f3] cursor-pointer",
                  value === opt.value && "text-[#0066cc] font-medium"
                )}
              >
                <Check
                  className={cn(
                    "size-3.5 shrink-0",
                    value === opt.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{opt.label}</span>
                {opt.sublabel && (
                  <span className="text-[#879596] truncate ml-auto shrink-0 text-[11px]">
                    {opt.sublabel}
                  </span>
                )}
              </button>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
