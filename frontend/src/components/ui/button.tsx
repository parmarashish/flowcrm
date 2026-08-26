import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[2px] text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "bg-[#0066cc] text-white hover:bg-[#0052a3] shadow-none",
        destructive:
          "bg-[#d13212] text-white hover:bg-[#b52b0f] shadow-none",
        outline:
          "border border-[#d5d9d9] bg-white text-[#0f1923] hover:bg-[#f2f3f3] shadow-none",
        secondary:
          "bg-[#e9ebed] text-[#0f1923] hover:bg-[#d5d9d9] shadow-none",
        ghost:
          "hover:bg-[#eaeded] text-[#0f1923] shadow-none",
        link: "text-[#0066cc] underline-offset-4 hover:underline shadow-none",
        awsSuccess: "bg-[#1d8102] text-white hover:bg-[#166602] shadow-none",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        xs: "h-6 gap-1 px-2 text-[11px]",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-9 px-4 text-sm",
        icon: "size-8 p-0",
        "icon-xs": "size-6 p-0",
        "icon-sm": "size-7 p-0",
        "icon-lg": "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
