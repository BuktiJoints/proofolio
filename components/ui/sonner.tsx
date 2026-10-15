"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--success-bg": "var(--color-green-10)",
          "--success-text": "var(--color-green-80)",
          "--success-border": "var(--color-green-30)",
          "--error-bg": "var(--color-red-10)",
          "--error-text": "var(--color-red-80)",
          "--error-border": "var(--color-red-30)",
          "--warning-bg": "var(--color-yellow-10)",
          "--warning-text": "var(--color-yellow-80)",
          "--warning-border": "var(--color-yellow-30)",
          "--info-bg": "var(--color-tertiary-10)",
          "--info-text": "var(--color-tertiary-80)",
          "--info-border": "var(--color-tertiary-30)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans! text-b8!",
          title: "text-s8!",
          description: "text-b9!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
