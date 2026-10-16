"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PrintButton } from "@/modules/shared/print-button";
import { DesignIcon } from "@/modules/shared/design-icon";
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
    <section className="space-y-5 print:hidden">
      <h2 className="text-h5">Aksesibilitas</h2>
      <Card className="rounded-xl">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-primary-10 p-4">
            <DesignIcon name="public-globe" />
            <div className="min-w-0 flex-1">
              <Label
                htmlFor="portfolio-public"
                className="text-s8 text-neutral-90"
              >
                {query.data?.data ? "Publik" : "Pribadi"}
              </Label>
              <p className="text-b10 text-neutral-60">
                {query.data?.data
                  ? "Siapa pun dengan link dapat melihat"
                  : "Hanya kamu yang dapat melihat"}
              </p>
            </div>
            <Switch
              id="portfolio-public"
              checked={!!query.data?.data}
              onCheckedChange={(checked) => change.mutate(checked)}
              disabled={query.isPending || change.isPending || !!query.error}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolio-url" className="text-s9">
              Link unik portofolio
            </Label>
            <Input
              id="portfolio-url"
              readOnly
              value={url}
              placeholder={
                query.data?.data
                  ? "Buat tautan baru untuk menyalin link"
                  : "Aktifkan Publik untuk membuat link"
              }
            />
          </div>
          {query.data?.data && (
            <p className="text-b10 text-neutral-60">
              Berlaku sampai {dateLabel(query.data.data.expiresAt)}. Tautan
              hanya ditampilkan saat dibuat.
            </p>
          )}
          {query.data?.data && !url ? (
            <Button
              className="w-full text-s8 md:text-s8"
              disabled={change.isPending}
              onClick={() => change.mutate(true)}
            >
              Buat tautan baru
            </Button>
          ) : (
            <Button
              className="w-full text-s8 md:text-s8"
              disabled={!url}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Tautan disalin");
                } catch {
                  toast.error("Salin tautan dari kolom di atas.");
                }
              }}
            >
              <DesignIcon name="copy-white" />
              Salin Link Portofolio
            </Button>
          )}
          <PrintButton
            label="Unduh Portofolio"
            variant="neutral"
            className="w-full text-s8 md:text-s8"
          />
          {(query.error || change.error) && (
            <ErrorState error={query.error ?? change.error} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
