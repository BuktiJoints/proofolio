"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
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
import { isUuid } from "@/modules/shared/presentation";
import type { Role, Envelope, Rubric, Criterion } from "@/modules/shared/types";
import { RubricEditor } from "./rubric-editor";
export function CriteriaList({ criteria }: { criteria: Criterion[] }) {
  return (
    <div className="space-y-3">
      {criteria.map((criterion) => (
        <Card key={criterion.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {criterion.order}. {criterion.title}
            </CardTitle>
            <CardDescription>
              {criterion.code} · Maksimal {criterion.maxScore} poin ·{" "}
              {criterion.required ? "Wajib" : "Opsional"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {criterion.description}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
export function RubricsPage({ role }: { role: Role }) {
  const query = useQuery({
    queryKey: ["rubrics", role],
    queryFn: () => api<Envelope<Rubric[]>>("/api/v1/rubrics"),
  });
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const base = role === "STUDENT" ? "/student" : "/assessor";
  return (
    <>
      <PageHeading
        title="Rubrik kompetensi"
        description={
          role === "STUDENT"
            ? "Pelajari kriteria penilaian sebelum merekam praktik."
            : "Buat dan verifikasi rubrik sebelum menerbitkannya."
        }
        action={
          role === "ASSESSOR" && (
            <LinkButton href="/assessor/rubrics/new">Buat rubrik</LinkButton>
          )
        }
      />
      {!query.data.data.length ? (
        <EmptyState
          title="Belum ada rubrik"
          description={
            role === "STUDENT"
              ? "Rubrik akan tersedia setelah asesor menerbitkannya."
              : "Buat rubrik manual atau ekstrak dari PDF."
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {query.data.data.map((rubric) => (
            <Card key={rubric.id}>
              <CardHeader>
                <div>
                  <Badge variant="secondary">
                    {
                      {
                        DRAFT: "Draft",
                        PUBLISHED: "Terbit",
                        ARCHIVED: "Diarsipkan",
                      }[rubric.status]
                    }
                  </Badge>
                </div>
                <CardTitle>{rubric.title}</CardTitle>
                <CardDescription>{rubric.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <LinkButton
                  href={`${base}/rubrics/${rubric.id}`}
                  variant="outline"
                >
                  Lihat rubrik
                </LinkButton>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
export function NewRubricPage() {
  return (
    <>
      <PageHeading
        title="Buat rubrik"
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
            Ajukan video dengan rubrik ini
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
              criteria: version.criteria,
            }}
          />
        ) : (
          <CriteriaList criteria={version.criteria} />
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
