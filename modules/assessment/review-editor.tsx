"use client";
import { useState, useEffect, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { api, jsonBody } from "@/lib/api-client";
import { Choice, ErrorState } from "@/modules/shared/ui";
import type { SubmissionDetail, ReviewDecision } from "@/modules/shared/types";
import { reviewPayload, type DraftItem } from "./review-validation";
export function ReviewEditor({
  submission,
  media,
  renderEvidence,
}: {
  submission: SubmissionDetail;
  media?: ReactNode;
  renderEvidence?: (
    decisions: Record<string, DraftItem>,
    updateDecision: (id: string, decision: ReviewDecision) => void,
  ) => ReactNode;
}) {
  const [draft, setDraft] = useState<Record<string, DraftItem>>(() =>
    Object.fromEntries(
      submission.criteria.map((criterion) => {
        const saved = submission.review?.items.find(
          (item) => item.criterionId === criterion.id,
        );
        return [
          criterion.id,
          {
            score: saved ? String(saved.score) : "",
            decision: saved?.decision ?? "CONFIRMED",
            note: saved?.note ?? "",
          },
        ];
      }),
    ),
  );
  const [feedback, setFeedback] = useState(submission.review?.feedback ?? "");
  const [validation, setValidation] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [dirty, setDirty] = useState(false);
  const client = useQueryClient();
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = useMutation({
    mutationFn: ({
      finalize,
      body,
    }: {
      finalize: boolean;
      body: ReturnType<typeof reviewPayload>;
    }) =>
      api(
        `/api/v1/submissions/${submission.id}/review${finalize ? "/finalize" : ""}`,
        { method: finalize ? "POST" : "PUT", body: jsonBody(body) },
      ),
    onSuccess: async (_, variables) => {
      setDirty(false);
      setConfirm(false);
      toast.success(
        variables.finalize
          ? "Penilaian difinalisasi"
          : "Draft penilaian tersimpan",
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ["submission", submission.id] }),
        client.invalidateQueries({ queryKey: ["submissions"] }),
        client.invalidateQueries({ queryKey: ["dashboard"] }),
        client.invalidateQueries({ queryKey: ["portfolio"] }),
      ]);
    },
  });
  function update(id: string, changes: Partial<DraftItem>) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      [id]: { ...current[id], ...changes },
    }));
  }
  function submit(finalize: boolean, confirmed = false) {
    setValidation("");
    try {
      const body = reviewPayload(
        submission.criteria,
        draft,
        feedback,
        finalize,
      );
      if (finalize && !confirmed) setConfirm(true);
      else save.mutate({ finalize, body });
    } catch (error) {
      setValidation(
        error instanceof Error ? error.message : "Periksa penilaian.",
      );
    }
  }
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        {media}
        {renderEvidence?.(draft, (id, decision) => update(id, { decision }))}
      </div>
      <section className="space-y-5 rounded-xl border border-neutral-30 p-5">
        <h2 className="text-h5">Detail Penilaian</h2>
        <Alert>
          <AlertDescription>
            Nilai dan keputusan ditentukan oleh Anda. Kriteria opsional yang
            tidak dinilai tetap masuk total bobot dengan nilai 0.
          </AlertDescription>
        </Alert>
        <fieldset disabled={save.isPending} className="space-y-4">
          {submission.criteria.map((criterion) => (
            <Card
              key={criterion.id}
              className="gap-3 border-b border-neutral-30 px-0 py-4 ring-0"
            >
              <CardHeader className="px-0">
                <CardTitle className="text-s8">{criterion.title}</CardTitle>
                <CardDescription>
                  {criterion.required ? "Wajib" : "Opsional"} · Maksimal{" "}
                  {criterion.maxScore} poin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`decision-${criterion.id}`}>
                      Keputusan bukti
                    </Label>
                    <Choice
                      id={`decision-${criterion.id}`}
                      label={`Keputusan ${criterion.title}`}
                      value={draft[criterion.id].decision}
                      onChange={(decision) =>
                        update(criterion.id, {
                          decision: decision as ReviewDecision,
                        })
                      }
                      options={[
                        { value: "CONFIRMED", label: "Dikonfirmasi" },
                        { value: "REJECTED", label: "Ditolak" },
                        { value: "ADJUSTED", label: "Disesuaikan" },
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`score-${criterion.id}`}>
                      Nilai {criterion.title}
                    </Label>
                    <Input
                      id={`score-${criterion.id}`}
                      type="number"
                      min={0}
                      max={criterion.maxScore}
                      step={1}
                      value={draft[criterion.id].score}
                      onChange={(event) =>
                        update(criterion.id, { score: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`note-${criterion.id}`}>
                    Catatan kriteria
                  </Label>
                  <Textarea
                    id={`note-${criterion.id}`}
                    maxLength={2000}
                    value={draft[criterion.id].note}
                    onChange={(event) =>
                      update(criterion.id, { note: event.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="space-y-2">
            <Label htmlFor="review-feedback">Feedback untuk siswa</Label>
            <Textarea
              id="review-feedback"
              maxLength={4000}
              value={feedback}
              onChange={(event) => {
                setDirty(true);
                setFeedback(event.target.value);
              }}
            />
          </div>
          <p className="text-s7 text-primary-70">
            Total{" "}
            {Object.values(draft).reduce(
              (sum, item) => sum + (Number(item.score) || 0),
              0,
            )}{" "}
            / {submission.criteria.reduce((sum, c) => sum + c.maxScore, 0)} poin
          </p>
          <p className="text-sm text-muted-foreground">
            {dirty
              ? "Ada perubahan yang belum disimpan."
              : "Draft mengikuti data terakhir yang dimuat atau disimpan."}
          </p>
          {validation && (
            <p role="alert" className="text-sm text-destructive">
              {validation}
            </p>
          )}
          {save.error && <ErrorState error={save.error} />}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => submit(false)}>
              {save.isPending ? "Menyimpan…" : "Simpan draft penilaian"}
            </Button>
            <Button
              className="w-full whitespace-normal"
              onClick={() => submit(true)}
            >
              Simpan & Terbitkan Penilaian
            </Button>
          </div>
        </fieldset>
        <AlertDialog
          open={confirm}
          onOpenChange={(open) => {
            if (!save.isPending) setConfirm(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalisasi penilaian?</AlertDialogTitle>
              <AlertDialogDescription>
                Hasil akan tersedia bagi siswa dan penilaian tidak dapat diedit
                lagi. Pastikan seluruh skor dan feedback sudah benar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={save.isPending}>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={save.isPending}
                onClick={() => submit(true, true)}
              >
                {save.isPending ? "Memfinalisasi…" : "Ya, finalisasi"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
