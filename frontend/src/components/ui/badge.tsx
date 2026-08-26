import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-[2px] border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors select-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-[#0066cc] bg-[#e7f2fa] text-[#0066cc]",
        secondary:
          "border-[#d5d9d9] bg-[#f1f3f4] text-[#545b64]",
        destructive:
          "border-[#d13212] bg-[#fdf3f2] text-[#d13212]",
        success:
          "border-[#1d8102] bg-[#f0f8ee] text-[#1d8102]",
        warning:
          "border-[#e07b00] bg-[#fdf7ee] text-[#b36200]",
        outline:
          "border-[#d5d9d9] bg-transparent text-[#545b64]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
