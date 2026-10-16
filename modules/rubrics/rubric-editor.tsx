"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { api, jsonBody } from "@/lib/api-client";
import { DesignIcon } from "@/modules/shared/design-icon";
import { ErrorState } from "@/modules/shared/ui";
import type {
  CriterionInput,
  Envelope,
  RubricInput,
} from "@/modules/shared/types";
import { rubricFormSchema } from "./rubric-validation";
const blankCriterion = (order: number): CriterionInput => ({
  code: `K${crypto.randomUUID().slice(0, 8)}`,
  title: "",
  description: "",
  required: true,
  maxScore: 10,
  order,
});
export function RubricEditor({
  initial,
  rubricId,
  versionId,
  createVersion = false,
}: {
  initial?: RubricInput;
  rubricId?: string;
  versionId?: string;
  createVersion?: boolean;
}) {
  const [draft, setDraft] = useState<RubricInput>(
    initial ?? { title: "", description: "", criteria: [] },
  );
  const [validation, setValidation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();
  const client = useQueryClient();
  const total = draft.criteria.reduce(
    (sum, c) => sum + (Number.isFinite(c.maxScore) ? c.maxScore : 0),
    0,
  );
  const save = useMutation({
    mutationFn: (body: RubricInput) =>
      api<Envelope<{ id: string }>>(
        rubricId
          ? createVersion
            ? `/api/v1/rubrics/${rubricId}/versions`
            : `/api/v1/rubrics/${rubricId}/versions/${versionId}`
          : "/api/v1/rubrics",
        {
          method: rubricId && !createVersion ? "PUT" : "POST",
          body: jsonBody(body),
        },
      ),
    onSuccess: async (result) => {
      toast.success("Draft rubrik tersimpan");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["rubrics"] }),
        client.invalidateQueries({ queryKey: ["rubric", rubricId] }),
      ]);
      router.push(`/assessor/rubrics/${rubricId ?? result.data.id}`);
    },
  });
  const extraction = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.set("file", file!);
      return api<
        Envelope<{
          draft: RubricInput;
          simulated: boolean;
          requiresHumanReview: boolean;
        }>
      >("/api/v1/rubrics/extract", { method: "POST", body: form });
    },
  });
  function criterionChange(index: number, changes: Partial<CriterionInput>) {
    setDraft((current) => ({
      ...current,
      criteria: current.criteria.map((c, i) =>
        i === index ? { ...c, ...changes } : c,
      ),
    }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setValidation("");
    const parsed = rubricFormSchema.safeParse(draft);
    if (!parsed.success) {
      setValidation(
        "Periksa judul modul, kode unik, indikator bukti, dan bobot bilangan bulat 1–100 untuk setiap kriteria.",
      );
      return;
    }
    save.mutate(parsed.data);
  }
  return (
    <form onSubmit={submit} className="space-y-8">
      <fieldset disabled={save.isPending} className="space-y-8">
        <Card className="rounded-xl">
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  key: "title",
                  label: "Judul Modul UKK",
                  placeholder: "Contoh: UKK Perakitan LAN",
                  required: true,
                },
                {
                  key: "programKeahlian",
                  label: "Jurusan",
                  placeholder: "Jurusan / program keahlian",
                },
                {
                  key: "partnerName",
                  label: "Nama Mitra",
                  placeholder: "Nama Mitra Industri",
                },
              ].map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`rubric-${f.key}`}>
                    {f.label}
                    {f.required && (
                      <span aria-hidden="true" className="text-red-60">
                        *
                      </span>
                    )}
                  </Label>
                  <Input
                    className="border border-neutral-50"
                    id={`rubric-${f.key}`}
                    aria-label={f.label}
                    placeholder={f.placeholder}
                    required={f.required}
                    minLength={2}
                    maxLength={180}
                    value={
                      draft[
                        f.key as "title" | "programKeahlian" | "partnerName"
                      ] ?? ""
                    }
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [f.key]:
                          e.target.value || (f.key === "title" ? "" : null),
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <details className="mt-4 text-b9 text-neutral-70">
              <summary className="cursor-pointer text-primary-70">
                Tujuan pembelajaran & peralatan praktik
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rubric-description">
                    Tujuan pembelajaran / deskripsi modul
                  </Label>
                  <Textarea
                    id="rubric-description"
                    value={draft.description ?? ""}
                    maxLength={4000}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rubric-requirements">
                    Persyaratan Peralatan
                  </Label>
                  <Textarea
                    id="rubric-requirements"
                    placeholder="Satu peralatan per baris"
                    value={draft.requirements ?? ""}
                    maxLength={4000}
                    onChange={(e) =>
                      setDraft({ ...draft, requirements: e.target.value })
                    }
                  />
                </div>
              </div>
            </details>
          </CardContent>
        </Card>
        <div className="grid items-start gap-6 lg:grid-cols-[2fr_3fr]">
          <Card className="rounded-xl">
            <CardContent className="space-y-4">
              <h2 className="flex items-center gap-2 text-s6">
                <DesignIcon name="sparkles-purple" />
                AI Document Generator
              </h2>
              <p className="text-b9 text-neutral-70">
                Unggah dokumen rubrik fisik. AI akan mengekstrak kriteria,
                indikator, dan bobot penilaian sebagai draf untuk Anda tinjau.
              </p>
              <Label htmlFor="rubric-file">File Rubrik</Label>
              <FileUpload
                className="min-h-36 border-primary-50 text-primary-70 shadow-none"
                prompt="Pilih File"
                hint="PDF · Maks. 10 MiB"
                id="rubric-file"
                aria-label="File rubrik PDF"
                accept="application/pdf,.pdf"
                disabled={extraction.isPending}
                onChange={(event) => {
                  extraction.reset();
                  setFile(event.target.files?.[0] ?? null);
                }}
              />

              <Button
                className="w-full text-s8 md:text-s8"
                type="button"
                disabled={
                  !file || file.size > 10 * 1024 * 1024 || extraction.isPending
                }
                onClick={() => extraction.mutate()}
              >
                {extraction.isPending
                  ? "Mengekstrak PDF…"
                  : "Generate Rubrik Digital via AI"}
              </Button>
              {file && file.size > 10 * 1024 * 1024 && (
                <p role="alert" className="text-b9 text-red-70">
                  Ukuran PDF maksimal 10 MiB.
                </p>
              )}
              {extraction.error && <ErrorState error={extraction.error} />}
              {extraction.data && (
                <Alert>
                  <AlertDescription>
                    <p>
                      {extraction.data.data.simulated
                        ? "Mode simulasi: hasil contoh ini bukan pembacaan isi PDF."
                        : "Calon rubrik berhasil diekstrak. Periksa setiap kriteria dan bobotnya."}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setDraft((current) => ({
                          ...current,
                          ...extraction.data!.data.draft,
                        }));
                        setValidation("");
                        extraction.reset();
                      }}
                    >
                      Gunakan hasil dan ganti isi form
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h6">Editor Rubrik Interaktif</h2>
              <span
                className={`text-s9 ${total === 100 ? "text-green-70" : "text-yellow-70"}`}
              >
                Total bobot {total}%
              </span>
            </div>
            {!draft.criteria.length && (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                <span className="rounded-xl bg-primary-70 p-3">
                  <DesignIcon name="draft-file" />
                </span>
                <p className="text-s7">Rubrik masih kosong</p>
                <p className="max-w-sm text-b9 text-neutral-70">
                  Generate dengan AI dari dokumen rubrik, atau tambahkan
                  kriteria secara manual.
                </p>
              </div>
            )}
            {draft.criteria.map((c, index) => (
              <Card key={index}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`criterion-${index}`}>
                        Kriteria {index + 1}
                        <span aria-hidden="true" className="text-red-60">
                          *
                        </span>
                      </Label>
                      <Input
                        className="border border-neutral-50"
                        id={`criterion-${index}`}
                        aria-label={`Judul kriteria ${index + 1}`}
                        required
                        minLength={2}
                        maxLength={180}
                        value={c.title}
                        onChange={(e) =>
                          criterionChange(index, { title: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`weight-${index}`}>Bobot (%)</Label>
                      <Input
                        className="border border-neutral-50"
                        id={`weight-${index}`}
                        aria-label={`Bobot kriteria ${index + 1}`}
                        type="number"
                        required
                        min={1}
                        max={100}
                        step={1}
                        value={Number.isFinite(c.maxScore) ? c.maxScore : ""}
                        onChange={(e) =>
                          criterionChange(index, {
                            maxScore: e.target.valueAsNumber,
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive-ghost"
                      aria-label={`Hapus kriteria ${index + 1}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          criteria: draft.criteria
                            .filter((_, i) => i !== index)
                            .map((item, i) => ({ ...item, order: i + 1 })),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Indikator Bukti</Label>
                    {c.description.split("\n").map((line, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          className="border border-neutral-50"
                          aria-label={`Indikator bukti kriteria ${index + 1} ke ${i + 1}`}
                          value={line}
                          required
                          minLength={2}
                          maxLength={8000}
                          onChange={(e) => {
                            const indicators = c.description.split("\n");
                            indicators[i] = e.target.value;
                            criterionChange(index, {
                              description: indicators.join("\n"),
                            });
                          }}
                        />
                        {c.description.includes("\n") && (
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="link"
                            aria-label={`Hapus indikator ${i + 1} kriteria ${index + 1}`}
                            onClick={() =>
                              criterionChange(index, {
                                description: c.description
                                  .split("\n")
                                  .filter((_, j) => j !== i)
                                  .join("\n"),
                              })
                            }
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto w-full p-0 text-s9 md:text-s9"
                    onClick={() =>
                      criterionChange(index, {
                        description: `${c.description}\n`,
                      })
                    }
                  >
                    <Plus className="size-3" />
                    Tambah indikator
                  </Button>
                  <details className="text-b9 text-neutral-60">
                    <summary className="cursor-pointer">
                      Pengaturan kriteria
                    </summary>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`code-${index}`}>Kode</Label>
                        <Input
                          className="border border-neutral-50"
                          id={`code-${index}`}
                          required
                          maxLength={40}
                          value={c.code}
                          onChange={(e) =>
                            criterionChange(index, { code: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`required-${index}`}
                          checked={c.required}
                          onCheckedChange={(checked) =>
                            criterionChange(index, { required: checked })
                          }
                        />
                        <Label htmlFor={`required-${index}`}>
                          Kriteria wajib
                        </Label>
                      </div>
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={draft.criteria.length >= 30}
                onClick={() =>
                  setDraft({
                    ...draft,
                    criteria: [
                      ...draft.criteria,
                      blankCriterion(draft.criteria.length + 1),
                    ],
                  })
                }
              >
                <Plus className="size-4" />
                Tambah Kriteria
              </Button>
              <Button
                type="submit"
                className="min-w-60 text-s8 md:text-s8"
                disabled={
                  !draft.criteria.length ||
                  save.isPending ||
                  extraction.isPending
                }
              >
                <DesignIcon name="save-white" />
                {save.isPending ? "Menyimpan…" : "Simpan Rubrik Digital"}
              </Button>
            </div>
            {validation && (
              <Alert variant="destructive">
                <AlertDescription role="alert">{validation}</AlertDescription>
              </Alert>
            )}
            {save.error && <ErrorState error={save.error} />}
          </div>
        </div>
      </fieldset>
    </form>
  );
}
