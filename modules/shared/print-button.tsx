"use client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
export function PrintButton({ label = "Unduh PDF" }: { label?: string }) {
  return (
    <Button
      variant="outline"
      className="print:hidden"
      onClick={() => window.print()}
    >
      <Download className="size-4" />
      {label}
    </Button>
  );
}
