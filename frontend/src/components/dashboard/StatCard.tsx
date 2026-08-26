import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function StatCard({ label, value, trend, subtitle, icon: Icon }: StatCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-[2px] border border-[#d5d9d9] bg-white p-3 shadow-none transition-colors hover:border-[#aab7b8]">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
          {label}
        </span>
        {Icon && <Icon className="size-3.5 text-[#879596]" />}
      </div>

      {/* Value */}
      <div className="my-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-[#0f1923]">
          {value}
        </span>
      </div>

      {/* Trend & Subtitle */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#545b64]">
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center font-medium",
              trend.isNeutral
                ? "text-[#545b64]"
                : trend.isPositive
                ? "text-[#1d8102]"
                : "text-[#d13212]"
            )}
          >
            {trend.isNeutral ? (
              <Minus className="size-3 mr-0.5" />
            ) : trend.isPositive ? (
              <ArrowUpRight className="size-3 mr-0.5" />
            ) : (
              <ArrowDownRight className="size-3 mr-0.5" />
            )}
            {trend.value}
          </span>
        ) : (
          <span className="inline-flex items-center text-[#1d8102] font-medium">
            <TrendingUp className="size-3 mr-0.5" /> Active
          </span>
        )}
        <span className="text-[#879596]">· {subtitle ?? "vs last period"}</span>
      </div>
    </div>
  );
}
