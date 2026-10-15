"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, jsonBody } from "@/lib/api-client";
import { useMe } from "@/modules/auth/session";
import { ProfileIdentity } from "@/modules/shared/profile-identity";
import { PrintButton } from "@/modules/shared/print-button";
import { PortfolioSharing } from "./portfolio-sharing";
import { portfolioQueryOptions, type PortfolioItem } from "./queries";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { dateLabel } from "@/modules/shared/presentation";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  LinkButton,
} from "@/modules/shared/ui";
import type { Envelope } from "@/modules/shared/types";
function PortfolioCard({ item }: { item: PortfolioItem }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [hours, setHours] = useState("168");
  const [createdUrl, setCreatedUrl] = useState("");
  const [createdId, setCreatedId] = useState("");
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: () =>
      api<Envelope<{ id: string; url: string }>>(
        `/api/v1/submissions/${item.submission.id}/shares`,
        { method: "POST", body: jsonBody({ expiresInHours: Number(hours) }) },
      ),
    onSuccess: async (result) => {
      setCreatedId(result.data.id);
      setCreatedUrl(
        new URL(result.data.url, window.location.origin).toString(),
      );
      await client.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Tautan berbagi berhasil dibuat");
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) =>
      api(`/api/v1/shares/${id}`, { method: "DELETE" }),
    onSuccess: async (_, id) => {
      if (id === createdId) {
        setCreatedUrl("");
        setCreatedId("");
      }
      await client.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Tautan berhasil dicabut");
    },
  });
  async function copy() {
    try {
      await navigator.clipboard.writeText(createdUrl);
      toast.success("Tautan disalin");
    } catch {
      toast.error("Tidak dapat menyalin otomatis. Salin dari kolom tautan.");
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.rubric.title}</CardTitle>
        <CardDescription>
          Skor {item.submission.normalizedScore} / 100 ·{" "}
          {dateLabel(item.submission.completedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <LinkButton
          href={`/student/submissions/${item.submission.id}`}
          variant="outline"
        >
          Lihat hasil penilaian
        </LinkButton>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={`ttl-${item.submission.id}`}>
              Masa berlaku (jam)
            </Label>
            <Input
              id={`ttl-${item.submission.id}`}
              type="number"
              className="w-32"
              required
              min={1}
              max={720}
              step={1}
              value={hours}
              onChange={(event) => setHours(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Membuat…" : "Buat tautan berbagi"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Tautan memberi akses publik ke identitas siswa, hasil final, dan
          video. Salin saat dibuat; tautan tidak dapat ditampilkan kembali
          setelah halaman dimuat ulang.
        </p>
        {createdUrl && (
          <div className="space-y-2">
            <Label htmlFor={`url-${item.submission.id}`}>Tautan baru</Label>
            <Input
              id={`url-${item.submission.id}`}
              readOnly
              value={createdUrl}
            />
            <Button variant="outline" onClick={copy}>
              Salin tautan
            </Button>
          </div>
        )}
        {create.error && <ErrorState error={create.error} />}{" "}
        {revoke.error && <ErrorState error={revoke.error} />}
        <div className="space-y-2">
          {item.shares.map((share) => (
            <div
              key={share.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <Badge variant="secondary">
                {share.revokedAt
                  ? "Dicabut"
                  : new Date(share.expiresAt).getTime() <= now
                    ? "Kedaluwarsa"
                    : "Aktif"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Berlaku sampai {dateLabel(share.expiresAt)}
              </span>
              {!share.revokedAt && (
                <Button
                  variant="outline"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(share.id)}
                >
                  Cabut tautan
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
export function PortfolioPage() {
  const me = useMe();
  const query = useQuery(portfolioQueryOptions);
  if (query.isPending || me.isPending) return <LoadingState />;
  if (query.error || me.error)
    return <ErrorState error={query.error ?? me.error} />;
  const items = query.data;
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <ProfileIdentity me={me.data!} />
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-h4 text-primary-70">{items.length}</p>
            <p className="text-b9 text-neutral-70">Skill terverifikasi</p>
          </div>
          <div>
            <PrintButton label="Unduh Portofolio (PDF)" />
          </div>
        </div>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-5">
          <h2 className="text-h5">Daftar Bukti Kompetensi</h2>
          {items.length ? (
            items.map((item) => (
              <Card key={item.submission.id}>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <CardTitle className="text-s7">
                        {item.rubric.title}
                      </CardTitle>
                      <p className="text-b9 text-neutral-70">
                        {item.rubric.partnerName || "Rubrik sekolah"} ·{" "}
                        {dateLabel(item.submission.completedAt)}
                      </p>
                      <div className="flex gap-3">
                        <Badge variant="success">Terverifikasi</Badge>
                        <span className="text-s9 text-primary-70">
                          Skor {item.submission.normalizedScore}/100
                        </span>
                      </div>
                    </div>
                    <LinkButton
                      href={`/student/submissions/${item.submission.id}`}
                      variant="neutral"
                      className="text-s9 md:text-s9"
                    >
                      Detail Hasil Uji Kompetensi
                    </LinkButton>
                  </div>
                  <Accordion className="print:hidden">
                    <AccordionItem value="share">
                      <AccordionTrigger className="bg-primary-10 text-primary-70 hover:bg-primary-20">
                        Bagikan bukti video
                      </AccordionTrigger>
                      <AccordionContent>
                        <PortfolioCard item={item} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              title="Portofolio belum memiliki hasil"
              description="Buka hasil penilaian yang sudah selesai, lalu pilih Tambahkan ke Digital Portofolio."
              action={
                <LinkButton href="/student/submissions">
                  Lihat Riwayat Pengajuan
                </LinkButton>
              }
            />
          )}
        </section>
        <PortfolioSharing />
      </div>
    </>
  );
}
