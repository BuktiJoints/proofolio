"use client";
import { DesignIcon } from "./design-icon";
import { Button } from "@/components/ui/button";
export function PrintButton({
  label = "Unduh PDF",
  variant = "outline",
  className = "",
}: {
  label?: string;
  variant?: "outline" | "neutral";
  className?: string;
}) {
  return (
    <Button
      variant={variant}
      className={`print:hidden ${className}`}
      onClick={() => window.print()}
    >
      <DesignIcon name="download-blue" />
      {label}
    </Button>
  );
}
