import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon-only";
  className?: string;
}

const SIZE_CONFIG = {
  sm: { icon: 20, text: "text-sm", gap: "gap-1.5" },
  md: { icon: 28, text: "text-lg", gap: "gap-2" },
  lg: { icon: 40, text: "text-2xl", gap: "gap-2.5" },
} as const;

function LogoIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="6" fill="#0f1923" />
      <circle cx="8" cy="23" r="2.3" fill="#ffffff" />
      <circle cx="12.5" cy="18.5" r="1.9" fill="#ffffff" />
      <circle cx="16.5" cy="14.5" r="1.5" fill="#ffffff" />
      <path d="M17 14.5C20 12 22.5 10.5 24.5 9.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M20.3 8.6L25 9.2L24.2 13.6"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ size = "md", variant = "full", className }: LogoProps) {
  const config = SIZE_CONFIG[size];

  return (
    <div className={cn("flex items-center", config.gap, className)}>
      <LogoIcon size={config.icon} />
      {variant === "full" && (
        <span className={cn("font-bold tracking-tight leading-none", config.text)}>
          <span className="text-[var(--logo-wordmark,var(--foreground))]">Flow</span>
          <span className="text-[#0066cc]">CRM</span>
        </span>
      )}
    </div>
  );
}
