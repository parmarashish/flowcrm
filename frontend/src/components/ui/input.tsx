import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-[2px] border border-[#aab7b8] bg-white px-2.5 py-1 text-[13px] text-[#0f1923] placeholder:text-[#879596] outline-none transition-colors",
        "focus-visible:border-[#0066cc] focus-visible:ring-1 focus-visible:ring-[#0066cc]",
        "aria-invalid:border-[#d13212] aria-invalid:ring-1 aria-invalid:ring-[#d13212]",
        "disabled:pointer-events-none disabled:bg-[#eaeded] disabled:text-[#879596]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
