"use client";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
import { api, jsonBody } from "@/lib/api-client";
import {
  BackLink,
  LoadingState,
  ErrorState,
  EmptyState,
  LinkButton,
} from "@/modules/shared/ui";
import { DesignIcon } from "@/modules/shared/design-icon";
import { CatalogPage } from "./catalog-page";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { isUuid, dateLabel } from "@/modules/shared/presentation";
import type { Role, Envelope, Rubric, Criterion } from "@/modules/shared/types";
import { RubricEditor } from "./rubric-editor";
export function CriteriaList({
  criteria,
  weights = false,
}: {
  criteria: Criterion[];
  weights?: boolean;
}) {
  const total = criteria.reduce((sum, c) => sum + c.maxScore, 0);
  return (
    <Accordion defaultValue={weights && criteria[0] ? [criteria[0].id] : []}>
      {criteria.map((c) => (
        <AccordionItem key={c.id} value={c.id}>
          <AccordionTrigger className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 py-3 shadow-none">
            <span className="min-w-0 text-s8">
              {c.order}. {c.title}
            </span>
            <span
              data-testid="criterion-points"
              className="shrink-0 rounded-full bg-primary-50/60 px-2 text-right text-b10 tabular-nums"
            >
              {weights
                ? `Bobot ${Number(((c.maxScore / total) * 100).toFixed(1))}%`
                : `${c.maxScore} poin`}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2">
              {c.description
                .split(/\n+/)
                .filter(Boolean)
                .map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <DesignIcon name="indicator" />
                    <span className="min-w-0 whitespace-pre-wrap">{line}</span>
                  </li>
                ))}
            </ul>
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
      <BackLink href="/assessor/rubrics" />
      <RubricEditor />
    </>
  );
}
function ConfirmAction({
  label,
  description,
  onConfirm,
  disabled,
  icon,
}: {
  label: string;
  description: string;
  onConfirm: () => void;
  disabled: boolean;
  icon?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant={icon ? "destructive-ghost" : "secondary"}
            size={icon ? "icon-sm" : "sm"}
            disabled={disabled}
            aria-label={label}
          />
        }
      >
        {icon ? <Trash2 className="size-4" /> : label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Ya, lanjutkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function RubricManagement({ rubric }: { rubric: Rubric }) {
  const client = useQueryClient();
  const versions = rubric.versions ?? [];
  const action = useMutation({
    mutationFn: ({
      operation,
      versionId,
    }: {
      operation: "publish" | "archive" | "delete";
      versionId?: string;
    }) =>
      api(
        operation === "delete"
          ? `/api/v1/rubrics/${rubric.id}/versions/${versionId}`
          : `/api/v1/rubrics/${rubric.id}/${operation}`,
        {
          method: operation === "delete" ? "DELETE" : "POST",
          ...(versionId && operation === "publish"
            ? { body: jsonBody({ versionId }) }
            : {}),
        },
      ),
    onSuccess: async () => {
      toast.success("Modul berhasil diperbarui");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["rubric", rubric.id] }),
        client.invalidateQueries({ queryKey: ["rubrics"] }),
        client.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });
  return (
    <>
      <BackLink href="/assessor/rubrics" />
      <Card className="rounded-xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-5">
          <div className="space-y-2">
            <Badge
              variant={rubric.status === "DRAFT" ? "secondary" : "success"}
            >
              •{" "}
              {rubric.status === "PUBLISHED"
                ? "Aktif"
                : rubric.status === "ARCHIVED"
                  ? "Diarsipkan"
                  : "Draf"}
            </Badge>
            <h1 className="text-h5 md:text-h4">{rubric.title}</h1>
            <p className="text-b8 text-neutral-70">
              {[rubric.programKeahlian, rubric.partnerName]
                .filter(Boolean)
                .join(" · ") || "Lengkapi informasi modul melalui draf."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {rubric.status === "PUBLISHED" && (
              <ConfirmAction
                label="Arsipkan Modul"
                description="Modul tidak tersedia untuk upload baru. Penilaian lama tetap tersimpan."
                disabled={action.isPending}
                onConfirm={() => action.mutate({ operation: "archive" })}
              />
            )}
            {rubric.status === "ARCHIVED" && (
              <Button
                variant="secondary"
                size="sm"
                disabled={action.isPending || !versions.length}
                onClick={() =>
                  action.mutate({
                    operation: "publish",
                    versionId: rubric.activeVersionId ?? versions.at(-1)?.id,
                  })
                }
              >
                Aktifkan Modul
              </Button>
            )}
            <Button
              variant="secondary-ghost"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/assessor/rubrics/${rubric.id}/versions/new`} />
              }
            >
              <Plus className="size-4" />
              Buat Draf Baru
            </Button>
          </div>
        </CardContent>
      </Card>
      {action.error && <ErrorState error={action.error} />}
      {!versions.length && (
        <EmptyState
          title="Belum ada versi rubrik"
          description="Buat draf baru untuk menambahkan kriteria modul."
        />
      )}
      <Accordion className="gap-4">
        {versions.map((v) => (
          <AccordionItem
            key={v.id}
            value={v.id}
            className="rounded-xl border border-neutral-30 p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <AccordionTrigger className="group h-auto flex-none justify-start gap-4 rounded-none bg-transparent p-0 text-neutral-100 shadow-none hover:bg-transparent [&_[data-slot=accordion-trigger-icon]]:hidden">
                <Play className="size-5 shrink-0 fill-current transition-transform group-aria-expanded:rotate-90" />
                <span className="space-y-1 text-left">
                  <span className="block text-s6">Versi {v.version}</span>
                  <span className="block text-b9 text-neutral-70">
                    Terakhir diedit{" "}
                    {dateLabel(
                      v.updatedAt ?? v.createdAt ?? v.publishedAt ?? null,
                    )}
                  </span>
                </span>
              </AccordionTrigger>
              <div className="flex flex-wrap items-center gap-3">
                {rubric.activeVersionId === v.id &&
                rubric.status === "PUBLISHED" ? (
                  <span className="text-s9 text-neutral-60">
                    Versi Dipublikasikan
                  </span>
                ) : (
                  <Button
                    size="sm"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({ operation: "publish", versionId: v.id })
                    }
                  >
                    {v.publishedAt ? "Aktifkan Versi" : "Publikasi Rubrik"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Edit versi ${v.version}`}
                  title={
                    v.publishedAt
                      ? "Versi terbit terkunci; gunakan Buat Draf Baru"
                      : `Edit versi ${v.version}`
                  }
                  disabled={!!v.publishedAt}
                  nativeButton={false}
                  render={
                    <Link
                      href={`/assessor/rubrics/${rubric.id}/edit?versionId=${v.id}`}
                    />
                  }
                >
                  <Pencil className="size-4" />
                </Button>
                {v.publishedAt ? (
                  <Button
                    variant="destructive-ghost"
                    size="icon-sm"
                    disabled
                    aria-label={`Hapus versi ${v.version}`}
                    title="Versi yang pernah terbit tidak dapat dihapus"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : (
                  <ConfirmAction
                    label={`Hapus draf versi ${v.version}`}
                    description="Hanya draf ini yang akan dihapus. Versi aktif dan riwayat penilaian tetap tersimpan."
                    icon
                    disabled={action.isPending}
                    onConfirm={() =>
                      action.mutate({ operation: "delete", versionId: v.id })
                    }
                  />
                )}
              </div>
            </div>
            <AccordionContent
              panelClassName="mt-5 rounded-none border-0 bg-transparent"
              className="p-0"
            >
              <CriteriaList criteria={v.criteria} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}
export function RubricDetailPage({
  id,
  role,
  maxSeconds = 120,
}: {
  id: string;
  role: Role;
  maxSeconds?: number;
}) {
  const query = useQuery({
    queryKey: ["rubric", id],
    queryFn: () => api<Envelope<Rubric>>(`/api/v1/rubrics/${id}`),
    enabled: isUuid(id),
  });
  if (!isUuid(id)) return <EmptyState title="Rubrik tidak ditemukan" />;
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const rubric = query.data.data;
  if (role === "ASSESSOR") return <RubricManagement rubric={rubric} />;
  const version = rubric.versions?.find((v) => v.id === rubric.activeVersionId);
  if (!version) return <EmptyState title="Versi rubrik belum tersedia" />;
  const requirements = version.requirements?.split(/\n+/).filter(Boolean) ?? [];
  return (
    <>
      <BackLink href="/student/rubrics">Kembali ke Eksplorasi</BackLink>
      <div className="grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {version.partnerName && (
                <Badge className="gap-1.5 border-0 bg-secondary-10 px-3 py-2 text-secondary-80">
                  <DesignIcon name="verified-partner" />
                  Industry Verified
                </Badge>
              )}
              <Badge className="border-0 bg-neutral-30 px-3 py-2 text-neutral-80">
                {version.programKeahlian || "Program keahlian umum"}
              </Badge>
            </div>
            <h1 className="text-h5 md:text-h3">{version.title}</h1>
            <p className="flex items-center gap-2 text-b8 text-neutral-70">
              <DesignIcon name="building" />
              Mitra penguji:{" "}
              {version.partnerName || rubric.partner?.name || "Sekolah"}
            </p>
          </div>
          <Card className="rounded-xl">
            <CardContent className="space-y-3">
              <h2 className="text-s6">Tujuan Pembelajaran & Kesiapan Kerja</h2>
              <p className="whitespace-pre-wrap text-b8 text-neutral-80">
                {version.description ||
                  "Pelajari rubrik kompetensi berikut sebelum merekam video praktik."}
              </p>
            </CardContent>
          </Card>
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-h6">
              <DesignIcon name="sparkles-purple" />
              Rubrik Kompetensi yang Diperiksa AI
            </h2>
            <CriteriaList criteria={version.criteria} weights />
          </div>
        </section>
        <Card className="rounded-xl">
          <CardContent className="space-y-6">
            <h2 className="text-s6">Persyaratan Peralatan</h2>
            {requirements.length ? (
              <ul className="space-y-2">
                {requirements.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-b8 text-neutral-80"
                  >
                    <DesignIcon name="requirement-check" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-b8 text-neutral-70">
                Belum ada peralatan khusus yang dicantumkan asesor.
              </p>
            )}
            <Alert
              role="note"
              className="grid-cols-[44px_minmax(0,1fr)] gap-x-3 [&>img]:row-span-2 [&_[data-slot=alert-title]]:col-start-2 [&_[data-slot=alert-description]]:col-start-2"
            >
              <DesignIcon name="recording-info" />
              <AlertTitle>Tips Merekam</AlertTitle>
              <AlertDescription>
                Pastikan seluruh proses terlihat jelas dalam satu video tanpa
                potongan, maksimal {maxSeconds} detik.
              </AlertDescription>
            </Alert>
            <LinkButton
              href={`/student/submissions/new?rubricVersionId=${version.id}`}
              className="w-full whitespace-normal text-s8 md:text-s8"
            >
              <DesignIcon name="video-white" />
              Pilih Modul & Unggah Video Praktik
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
export function RubricEditorPage({
  id,
  versionId,
  createVersion = false,
}: {
  id: string;
  versionId?: string;
  createVersion?: boolean;
}) {
  const query = useQuery({
    queryKey: ["rubric", id],
    queryFn: () => api<Envelope<Rubric>>(`/api/v1/rubrics/${id}`),
    enabled: isUuid(id),
  });
  if (!isUuid(id) || (versionId && !isUuid(versionId)))
    return <EmptyState title="Versi rubrik tidak ditemukan" />;
  if (query.isPending) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;
  const rubric = query.data.data;
  const version = versionId
    ? rubric.versions?.find((v) => v.id === versionId)
    : rubric.versions?.at(-1);
  if (!createVersion && (!version || version.publishedAt))
    return (
      <EmptyState
        title="Versi terbit tidak dapat diedit"
        description="Buat draf baru agar riwayat penilaian tetap terjaga."
        action={
          <LinkButton href={`/assessor/rubrics/${id}`}>
            Kembali ke modul
          </LinkButton>
        }
      />
    );
  return (
    <>
      <BackLink href={`/assessor/rubrics/${id}`} />
      {createVersion && (
        <h1 className="text-h6 text-primary-70">Buat Draf Versi Baru</h1>
      )}
      <RubricEditor
        rubricId={id}
        versionId={versionId ?? version?.id}
        createVersion={createVersion}
        initial={
          version ? { ...version, criteria: version.criteria } : undefined
        }
      />
    </>
  );
}
