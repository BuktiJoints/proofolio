import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-(--control-radius) border border-transparent bg-clip-padding text-s8 md:text-s7 whitespace-nowrap shadow-control transition-[color,background-color,border-color,box-shadow] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:border-transparent disabled:bg-neutral-40 disabled:text-neutral-50 disabled:shadow-none aria-disabled:pointer-events-none aria-disabled:border-transparent aria-disabled:bg-neutral-40 aria-disabled:text-neutral-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 md:[&_svg:not([class*='size-'])]:size-6",
  {
    variants: {
      variant: {
        default: "bg-primary-70 text-neutral-20 hover:bg-primary-20 hover:text-primary-70 active:bg-primary-80 active:text-neutral-20",
        outline: "border-[1.6px] border-primary-70 bg-transparent text-primary-70 hover:bg-primary-70 hover:text-neutral-20 active:border-primary-80 active:bg-primary-80 active:text-neutral-20",
        ghost: "border-[1.6px] border-primary-70 bg-transparent text-primary-70 hover:bg-primary-70 hover:text-neutral-20 active:border-primary-80 active:bg-primary-80 active:text-neutral-20",
        secondary: "bg-secondary-50 text-neutral-20 hover:bg-secondary-20 hover:text-secondary-60 active:bg-secondary-60 active:text-neutral-20 md:active:bg-secondary-80",
        "secondary-ghost": "border-[1.6px] border-secondary-50 bg-transparent text-secondary-50 hover:bg-secondary-50 hover:text-neutral-20 active:border-secondary-80 active:bg-secondary-80 active:text-neutral-20",
        destructive: "bg-red-70 text-neutral-20 hover:bg-red-20 hover:text-red-60 active:bg-red-80 active:text-neutral-20 focus-visible:ring-red-60/40",
        "destructive-ghost": "border-[1.6px] border-red-70 bg-transparent text-red-70 hover:bg-red-70 hover:text-neutral-20 active:border-red-80 active:bg-red-80 active:text-neutral-20 focus-visible:ring-red-60/40",
        neutral: "bg-neutral-10 text-primary-70 hover:border-primary-70 active:border-transparent active:bg-neutral-50 active:text-neutral-80",
        link: "text-primary underline-offset-4 shadow-none hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-4 md:h-12 md:gap-3",
        xs: "h-7 gap-1 rounded-lg px-2 text-s9 md:text-s9 [&_svg:not([class*='size-'])]:size-3!",
        sm: "h-9 gap-2 rounded-xl px-3 text-s8 md:text-s8 [&_svg:not([class*='size-'])]:size-4!",
        lg: "h-12 gap-3 px-6 md:h-14",
        icon: "size-11 md:size-12",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3!",
        "icon-sm": "size-9 rounded-xl [&_svg:not([class*='size-'])]:size-4!",
        "icon-lg": "size-12 md:size-14",
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
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
