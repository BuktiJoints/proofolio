"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-s8 text-primary-60 md:text-s7 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-neutral-50 peer-disabled:cursor-not-allowed peer-disabled:text-neutral-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
