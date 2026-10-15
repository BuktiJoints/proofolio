"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-2 rounded-full border-[1.6px] text-s7 whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-primary-60 bg-card text-primary-70 hover:bg-primary-10 aria-pressed:bg-primary-60 aria-pressed:text-neutral-10",
        outline: "border-primary-60 bg-card text-primary-70 hover:bg-primary-10 aria-pressed:bg-primary-60 aria-pressed:text-neutral-10",
        secondary: "border-secondary-60 bg-card text-secondary-70 hover:bg-secondary-10 aria-pressed:bg-secondary-60 aria-pressed:text-neutral-10",
      },
      size: {
        default: "h-10 min-w-10 px-5",
        sm: "h-8 min-w-8 px-3 text-s8",
        lg: "h-12 min-w-12 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
