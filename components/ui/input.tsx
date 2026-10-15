import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"
import { controlStyles } from "@/components/ui/control-styles"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        controlStyles,
        "h-11 md:h-12 file:mr-3 file:border-0 file:bg-transparent file:text-s8 file:text-primary-70 file:cursor-pointer disabled:file:text-neutral-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
