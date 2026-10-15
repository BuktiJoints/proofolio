"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api-client";
import {
  PageHeading,
  LoadingState,
  ErrorState,
  EmptyState,
  LinkButton,
} from "@/modules/shared/ui";
import { CatalogPage } from "./catalog-page";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { isUuid } from "@/modules/shared/presentation";
import type { Role, Envelope, Rubric, Criterion } from "@/modules/shared/types";
import { RubricEditor } from "./rubric-editor";
export function CriteriaList({ criteria }: { criteria: Criterion[] }) {
  return (
    <Accordion>
      {criteria.map((c) => (
        <AccordionItem key={c.id} value={c.id}>
          <AccordionTrigger className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4">
            <span className="min-w-0">
              {c.order}. {c.title}
            </span>
            <span
              data-testid="criterion-points"
              className="shrink-0 text-right text-b9 tabular-nums"
            >
              {c.maxScore} poin
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="whitespace-pre-wrap">{c.description}</p>
            <p className="mt-3 text-b9">
              {c.required ? "Kriteria wajib" : "Kriteria opsional"}
            </p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
export function RubricsPage({ role }: { role: Role }) {
  return <CatalogPage role={role} />;
}
export function NewRubricPage() {
  return (
    <>
      <PageHeading
        title="Tambah Modul UKK"
        description="Isi manual atau gunakan calon draft dari PDF, lalu tinjau setiap kriteria."
      />
      <RubricEditor />
    </>
  );
}
export function RubricDetailPage({ id, role }: { id: string; role: Role }) {
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["rubric", id],
    queryFn: () => api<Envelope<Rubric>>(`/api/v1/rubrics/${id}`),
    enabled: isUuid(id),
  });
  const action = useMutation({
    mutationFn: (operation: "publish" | "archive" | "versions") =>
      api(`/api/v1/rubrics/${id}/${operation}`, { method: "POST" }),
    onSuccess: async () => {
      toast.success("Rubrik berhasil diperbarui");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["rubric", id] }),
        client.invalidateQueries({ queryKey: ["rubrics"] }),
      ]);
    },
  });
  if (!isUuid(id)) return <EmptyState title="Rubrik tidak ditemukan" />;
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const rubric = query.data.data;
  const version =
    role === "STUDENT"
      ? rubric.versions?.find((v) => v.id === rubric.activeVersionId)
      : rubric.versions?.at(-1);
  return (
    <>
      <LinkButton
        href={role === "STUDENT" ? "/student/rubrics" : "/assessor/rubrics"}
        variant="neutral"
      >
        ← Kembali ke Manajemen Modul
      </LinkButton>
      <PageHeading
        title={rubric.title}
        description={rubric.description ?? undefined}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">
          {
            { DRAFT: "Draft", PUBLISHED: "Terbit", ARCHIVED: "Diarsipkan" }[
              rubric.status
            ]
          }
        </Badge>
        <span className="text-sm text-muted-foreground">
          Versi {version?.version ?? "—"}
        </span>
        {role === "ASSESSOR" && (
          <>
            {rubric.status === "DRAFT" && (
              <Button
                disabled={action.isPending || hasUnsaved}
                onClick={() => action.mutate("publish")}
              >
                Terbitkan rubrik tersimpan
              </Button>
            )}
            {rubric.status !== "DRAFT" && (
              <Button
                variant="outline"
                disabled={action.isPending}
                onClick={() => action.mutate("versions")}
              >
                Buat versi draft baru
              </Button>
            )}
            {rubric.status !== "ARCHIVED" && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="outline" disabled={action.isPending} />
                  }
                >
                  Arsipkan
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Arsipkan rubrik?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Rubrik tidak lagi dapat dipakai untuk pengajuan baru.
                      Hasil penilaian sebelumnya tetap tersedia.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => action.mutate("archive")}>
                      Arsipkan rubrik
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
        {role === "STUDENT" && rubric.activeVersionId && (
          <LinkButton
            href={`/student/submissions/new?rubricVersionId=${rubric.activeVersionId}`}
          >
            Pilih Modul & Unggah Video Praktik
          </LinkButton>
        )}
      </div>
      {hasUnsaved && (
        <p className="text-sm text-muted-foreground">
          Simpan perubahan draft sebelum menerbitkan rubrik.
        </p>
      )}
      {action.error && <ErrorState error={action.error} />}{" "}
      {version ? (
        role === "ASSESSOR" &&
        rubric.status === "DRAFT" &&
        !version.publishedAt ? (
          <RubricEditor
            key={version.id}
            rubricId={id}
            onDirtyChange={setHasUnsaved}
            initial={{
              title: version.title,
              description: version.description,
              programKeahlian: version.programKeahlian,
              partnerName: version.partnerName,
              requirements: version.requirements,
              criteria: version.criteria,
            }}
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <section className="space-y-5">
              <h2 className="text-h5">Rubrik Kompetensi</h2>
              <p className="text-b8 text-neutral-70">
                Pelajari indikator bukti keterampilan yang akan diverifikasi
                asesor.
              </p>
              <CriteriaList criteria={version.criteria} />
            </section>
            <Card className="self-start">
              <CardHeader>
                <CardTitle className="text-s6">Informasi Modul UKK</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-b8">
                  {version.partnerName ||
                    rubric.partner?.name ||
                    "Mitra sekolah"}
                </p>
                <p className="text-b8 text-neutral-70">
                  {version.programKeahlian || "Program keahlian umum"}
                </p>
                <p className="text-s8">
                  {version.criteria.length} kriteria ·{" "}
                  {version.criteria.reduce((s, c) => s + c.maxScore, 0)} poin
                </p>
                {version.requirements && (
                  <p className="whitespace-pre-wrap text-b8">
                    {version.requirements}
                  </p>
                )}
                {role === "STUDENT" && rubric.activeVersionId && (
                  <LinkButton
                    href={`/student/submissions/new?rubricVersionId=${rubric.activeVersionId}`}
                    className="w-full whitespace-normal"
                  >
                    Unggah Video Praktik
                  </LinkButton>
                )}
              </CardContent>
            </Card>
          </div>
        )
      ) : (
        <EmptyState title="Versi rubrik belum tersedia" />
      )}
      {role === "ASSESSOR" && (rubric.versions?.length ?? 0) > 1 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Versi sebelumnya</h2>
          {rubric.versions?.slice(0, -1).map((v) => (
            <details key={v.id} className="rounded-xl border p-4">
              <summary className="cursor-pointer font-medium">
                Versi {v.version} · {v.title}
              </summary>
              <div className="mt-4">
                <CriteriaList criteria={v.criteria} />
              </div>
            </details>
          ))}
        </section>
      )}
    </>
  );
}
