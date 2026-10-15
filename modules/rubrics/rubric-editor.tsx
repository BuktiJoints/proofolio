"use client";
import { useState, type FormEvent, type SetStateAction } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { api, jsonBody } from "@/lib/api-client";
import { ErrorState } from "@/modules/shared/ui";
import type {
  CriterionInput,
  Envelope,
  RubricInput,
  Rubric,
} from "@/modules/shared/types";
import { rubricFormSchema } from "./rubric-validation";
const blankCriterion = (order: number): CriterionInput => ({
  code: "",
  title: "",
  description: "",
  required: true,
  maxScore: 10,
  order,
});
export function RubricEditor({
  initial,
  rubricId,
  onDirtyChange,
}: {
  initial?: RubricInput;
  rubricId?: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, storeDraft] = useState<RubricInput>(
    initial ?? { title: "", description: "", criteria: [blankCriterion(1)] },
  );
  function setDraft(value: SetStateAction<RubricInput>) {
    storeDraft(value);
    onDirtyChange?.(true);
  }
  const [validation, setValidation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (body: RubricInput) =>
      api<Envelope<Rubric>>(
        rubricId ? `/api/v1/rubrics/${rubricId}/draft` : "/api/v1/rubrics",
        { method: rubricId ? "PUT" : "POST", body: jsonBody(body) },
      ),
    onSuccess: async (result) => {
      toast.success("Draft rubrik tersimpan");
      await client.invalidateQueries({ queryKey: ["rubrics"] });
      if (rubricId)
        await client.invalidateQueries({ queryKey: ["rubric", rubricId] });
      else router.push(`/assessor/rubrics/${result.data.id}`);
      onDirtyChange?.(false);
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
      criteria: current.criteria.map((criterion, i) =>
        i === index ? { ...criterion, ...changes } : criterion,
      ),
    }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setValidation("");
    const parsed = rubricFormSchema.safeParse(draft);
    if (!parsed.success) {
      setValidation(
        parsed.error.issues.some((issue) => issue.code === "custom")
          ? "Kode kriteria harus unik."
          : "Periksa seluruh field: judul dan deskripsi kriteria minimal 2 karakter, kode wajib diisi, dan skor maksimal harus bilangan bulat 1–100.",
      );
      return;
    }
    onDirtyChange?.(true);
    save.mutate(parsed.data);
  }
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader>
          <CardTitle>AI Document Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            PDF maksimal 10 MiB. Hasil AI perlu ditinjau sebelum disimpan dan
            diterbitkan.
          </p>
          <Label htmlFor="rubric-file">File rubrik PDF</Label>
          <FileUpload
            id="rubric-file"
            disabled={extraction.isPending || save.isPending}
            accept="application/pdf,.pdf"
            onChange={(event) => {
              extraction.reset();
              setFile(event.target.files?.[0] ?? null);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={
              !file ||
              file.size > 10 * 1024 * 1024 ||
              extraction.isPending ||
              save.isPending
            }
            onClick={() => extraction.mutate()}
          >
            {extraction.isPending
              ? "Mengekstrak PDF…"
              : "Generate Rubrik Digital via AI"}
          </Button>
          {file && file.size > 10 * 1024 * 1024 && (
            <p role="alert" className="text-sm text-destructive">
              Ukuran PDF maksimal 10 MiB.
            </p>
          )}
          {extraction.error && <ErrorState error={extraction.error} />}{" "}
          {extraction.data && (
            <Alert>
              <AlertDescription>
                <p>
                  {extraction.data.data.simulated
                    ? "Mode simulasi: hasil contoh ini bukan pembacaan isi PDF."
                    : "Calon rubrik berhasil diekstrak. Periksa setiap kriteria dan bobotnya."}
                </p>
                <p>
                  {extraction.data.data.draft.title} ·{" "}
                  {extraction.data.data.draft.criteria.length} kriteria
                </p>
                <Button
                  type="button"
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
      <form onSubmit={submit}>
        <fieldset disabled={save.isPending} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h5">Editor Rubrik Interaktif</h2>
            <span className="text-s9 text-primary-70">
              Total {draft.criteria.reduce((sum, c) => sum + c.maxScore, 0)}{" "}
              poin
            </span>
          </div>
          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rubric-title">Judul rubrik</Label>
                <Input
                  id="rubric-title"
                  required
                  minLength={2}
                  maxLength={180}
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rubric-description">Deskripsi rubrik</Label>
                <Textarea
                  id="rubric-description"
                  maxLength={4000}
                  value={draft.description ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                { key: "programKeahlian", label: "Jurusan / Program Keahlian" },
                { key: "partnerName", label: "Nama Mitra" },
                {
                  key: "requirements",
                  label: "Persyaratan / Peralatan Praktik",
                },
              ] as const
            ).map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  value={draft[f.key] ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value || null })
                  }
                  maxLength={f.key === "requirements" ? 4000 : 180}
                />
              </div>
            ))}
          </div>
          {draft.criteria.map((criterion, index) => (
            <Card key={index}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Kriteria {index + 1}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={draft.criteria.length === 1}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      criteria: draft.criteria
                        .filter((_, i) => i !== index)
                        .map((c, i) => ({ ...c, order: i + 1 })),
                    })
                  }
                >
                  Hapus kriteria {index + 1}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: "code" as const, label: "Kode", max: 40, min: 1 },
                    {
                      key: "title" as const,
                      label: "Judul kriteria",
                      max: 180,
                      min: 2,
                    },
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={`${field.key}-${index}`}>
                        {field.label}
                      </Label>
                      <Input
                        id={`${field.key}-${index}`}
                        required
                        minLength={field.min}
                        maxLength={field.max}
                        value={criterion[field.key]}
                        onChange={(event) =>
                          criterionChange(index, {
                            [field.key]: event.target.value,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`description-${index}`}>
                    Deskripsi yang dapat diamati
                  </Label>
                  <Textarea
                    id={`description-${index}`}
                    required
                    minLength={2}
                    maxLength={2000}
                    value={criterion.description}
                    onChange={(event) =>
                      criterionChange(index, {
                        description: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex flex-wrap items-center gap-5">
                  <div className="space-y-2">
                    <Label htmlFor={`score-${index}`}>Skor maksimal</Label>
                    <Input
                      id={`score-${index}`}
                      className="w-28"
                      type="number"
                      required
                      min={1}
                      max={100}
                      step={1}
                      value={
                        Number.isFinite(criterion.maxScore)
                          ? criterion.maxScore
                          : ""
                      }
                      onChange={(event) =>
                        criterionChange(index, {
                          maxScore: event.target.valueAsNumber,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`required-${index}`}
                      checked={criterion.required}
                      onCheckedChange={(checked) =>
                        criterionChange(index, { required: checked })
                      }
                    />
                    <Label htmlFor={`required-${index}`}>Kriteria wajib</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={draft.criteria.length >= 30 || save.isPending}
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
            Tambah kriteria
          </Button>
          {validation && (
            <Alert variant="destructive">
              <AlertDescription role="alert">{validation}</AlertDescription>
            </Alert>
          )}
          {save.error && <ErrorState error={save.error} />}
          <div>
            <Button
              type="submit"
              disabled={save.isPending || extraction.isPending}
            >
              {save.isPending ? "Menyimpan…" : "Simpan draft rubrik"}
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
