"use client"

import { useState, type ComponentProps } from "react"
import { FileIcon, UploadIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

/** A native file input with the Figma file-field presentation. */
function FileUpload({ className, disabled, onChange, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [fileName, setFileName] = useState("")
  return (
    <div
      data-slot="file-upload"
      data-disabled={disabled || undefined}
      className={cn(
        "relative flex min-h-30.5 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-60 bg-card p-3 text-center text-b8 text-neutral-60 shadow-control hover:bg-muted/40 focus-within:border-primary-70 focus-within:shadow-control-focus data-disabled:bg-muted data-disabled:text-neutral-50 data-disabled:shadow-none",
        fileName && "border-primary-70 bg-primary-10 text-primary-70",
        className
      )}
    >
      <Input
        {...props}
        type="file"
        disabled={disabled}
        className="absolute inset-0 h-full cursor-pointer opacity-0 md:h-full"
        onChange={(event) => {
          setFileName(Array.from(event.target.files ?? []).map((file) => file.name).join(", "))
          onChange?.(event)
        }}
      />
      {fileName ? <FileIcon className="size-6" aria-hidden="true" /> : <UploadIcon className="size-6" aria-hidden="true" />}
      <span className="pointer-events-none max-w-full break-all" aria-hidden="true">
        {fileName || "Klik untuk memilih file"}
      </span>
    </div>
  )
}

export { FileUpload }
