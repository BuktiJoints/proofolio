"use client";
import { useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUpload } from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useMe, profileComplete } from "@/modules/auth/session";
import {
  Choice,
  PageHeading,
  ErrorState,
  LoadingState,
  EmptyState,
  LinkButton,
} from "@/modules/shared/ui";
import type { Envelope, Rubric, Submission } from "@/modules/shared/types";
export function UploadPage({
  maxBytes,
  maxSeconds,
}: {
  maxBytes: number;
  maxSeconds: number;
}) {
  const params = useSearchParams();
  const [versionId, setVersionId] = useState(
    params.get("rubricVersionId") ?? "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState("");
  const me = useMe();
  const router = useRouter();
  const client = useQueryClient();
  const rubrics = useQuery({
    queryKey: ["rubrics", "STUDENT"],
    queryFn: () => api<Envelope<Rubric[]>>("/api/v1/rubrics"),
  });
  const upload = useMutation({
    mutationFn: (form: FormData) =>
      api<Envelope<Submission>>("/api/v1/submissions", {
        method: "POST",
        body: form,
      }),
    onSuccess: async (result) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["submissions"] }),
        client.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success("Video diterima dan masuk antrean analisis");
      router.push(`/student/submissions/${result.data.id}`);
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    setValidation("");
    if (!file || !versionId) {
      setValidation("Pilih rubrik dan file video.");
      return;
    }
    if (file.size > maxBytes) {
      setValidation("Ukuran video melebihi batas unggahan.");
      return;
    }
    if (
      !rubrics.data?.data.some((rubric) => rubric.activeVersionId === versionId)
    ) {
      setValidation("Rubrik sudah tidak aktif. Pilih rubrik yang tersedia.");
      return;
    }
    const form = new FormData();
    form.set("rubricVersionId", versionId);
    form.set("video", file);
    upload.mutate(form);
  }
  if (me.isPending || rubrics.isPending) return <LoadingState />;
  if (me.error || rubrics.error)
    return (
      <ErrorState
        error={me.error ?? rubrics.error}
        retry={() => {
          void me.refetch();
          void rubrics.refetch();
        }}
      />
    );
  if (!me.data || !profileComplete(me.data))
    return (
      <EmptyState
        title="Lengkapi profil terlebih dahulu"
        description="Nama sekolah dan program keahlian diperlukan untuk pengajuan."
        action={
          <LinkButton href="/student/profile">Lengkapi profil</LinkButton>
        }
      />
    );
  const available = rubrics.data!.data.filter(
    (rubric) => rubric.activeVersionId,
  );
  if (!available.length)
    return (
      <EmptyState
        title="Belum ada rubrik aktif"
        description="Asesor perlu menerbitkan rubrik sebelum kamu dapat mengajukan video."
      />
    );
  return (
    <>
      <PageHeading
        title="Ajukan video praktik"
        description="Pilih rubrik yang sesuai dan unggah bukti praktikmu."
      />
      <Card className="max-w-2xl">
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="upload-rubric">Rubrik kompetensi</Label>
              <Choice
                id="upload-rubric"
                label="Pilih rubrik kompetensi"
                value={versionId}
                onChange={setVersionId}
                options={available.map((rubric) => ({
                  value: rubric.activeVersionId!,
                  label: rubric.title,
                }))}
                disabled={upload.isPending}
              />
              {available.find(
                (rubric) => rubric.activeVersionId === versionId,
              ) && (
                <LinkButton
                  href={`/student/rubrics/${available.find((rubric) => rubric.activeVersionId === versionId)!.id}`}
                  variant="ghost"
                >
                  Pelajari rubrik
                </LinkButton>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-file">Video praktik</Label>
              <FileUpload
                id="video-file"
                required
                disabled={upload.isPending}
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-sm text-muted-foreground">
                MP4, WebM, atau MOV · maksimal{" "}
                {Math.round(maxBytes / 1024 / 1024)} MiB dan {maxSeconds} detik.
                Validasi akhir dilakukan server.
              </p>
            </div>
            <Alert>
              <AlertDescription>
                AI membantu menemukan bukti. Nilai akhir dan feedback ditentukan
                oleh asesor.
              </AlertDescription>
            </Alert>
            {validation && (
              <p role="alert" className="text-sm text-destructive">
                {validation}
              </p>
            )}
            {upload.error && <ErrorState error={upload.error} />}
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending
                ? "Mengirim dan memvalidasi video…"
                : "Kirim video praktik"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
