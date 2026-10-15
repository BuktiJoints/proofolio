import * as React from "react"
import { cn } from "@/lib/utils"
import { controlStyles } from "@/components/ui/control-styles"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        controlStyles,
        "flex field-sizing-content min-h-28 resize-y",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
