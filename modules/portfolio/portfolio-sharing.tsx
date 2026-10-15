"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PrintButton } from "@/modules/shared/print-button";
import { ErrorState } from "@/modules/shared/ui";
import { api } from "@/lib/api-client";
import { dateLabel } from "@/modules/shared/presentation";
import type { Envelope } from "@/modules/shared/types";
export function PortfolioSharing() {
  const [url, setUrl] = useState("");
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["portfolio-share"],
    queryFn: () =>
      api<Envelope<{ id: string; expiresAt: string } | null>>(
        "/api/v1/portfolio/share",
      ),
  });
  const change = useMutation({
    mutationFn: (enable: boolean) =>
      api<Envelope<{ url?: string }>>("/api/v1/portfolio/share", {
        method: enable ? "POST" : "DELETE",
      }),
    onSuccess: async (result, enable) => {
      setUrl(enable ? (result.data.url ?? "") : "");
      await client.invalidateQueries({ queryKey: ["portfolio-share"] });
      toast.success(
        enable ? "Tautan portofolio dibuat" : "Portofolio kembali pribadi",
      );
    },
  });
  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="text-h6">Aksesibilitas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="portfolio-public">
            {query.data?.data ? "Publik" : "Pribadi"}
          </Label>
          <Switch
            id="portfolio-public"
            checked={!!query.data?.data}
            onCheckedChange={(checked) => change.mutate(checked)}
            disabled={query.isPending || change.isPending || !!query.error}
          />
        </div>
        <p className="text-b9 text-neutral-70">
          Siapa pun dengan tautan aktif dapat melihat nama, sekolah, jurusan,
          dan hasil yang kamu tambahkan ke portofolio.
        </p>
        {query.data?.data && (
          <>
            <p className="text-b9 text-neutral-70">
              Berlaku sampai {dateLabel(query.data.data.expiresAt)}.
            </p>
            {url ? (
              <>
                <Label htmlFor="portfolio-url">Link unik portofolio</Label>
                <Input id="portfolio-url" readOnly value={url} />
                <Button
                  className="w-full text-s8 md:text-s8"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      toast.success("Tautan disalin");
                    } catch {
                      toast.error("Salin tautan dari kolom di atas.");
                    }
                  }}
                >
                  Salin Link Portofolio
                </Button>
              </>
            ) : (
              <>
                <p className="text-b9 text-neutral-70">
                  Tautan hanya ditampilkan saat dibuat. Membuat ulang akan
                  menonaktifkan tautan sebelumnya.
                </p>
                <Button
                  className="w-full"
                  disabled={change.isPending}
                  onClick={() => change.mutate(true)}
                >
                  Buat tautan baru
                </Button>
              </>
            )}
          </>
        )}
        {(query.error || change.error) && (
          <ErrorState error={query.error ?? change.error} />
        )}
        <PrintButton label="Unduh Portofolio (PDF)" />
      </CardContent>
    </Card>
  );
}
