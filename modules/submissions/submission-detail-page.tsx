"use client";
import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api-client";
import { useMe } from "@/modules/auth/session";
import {
  PageHeading,
  LoadingState,
  ErrorState,
  EmptyState,
  StatusBadge,
} from "@/modules/shared/ui";
import { isUuid, pollInterval, dateLabel } from "@/modules/shared/presentation";
import type { Envelope, SubmissionDetail, Role } from "@/modules/shared/types";
import { ReviewEditor } from "@/modules/assessment/review-editor";
import { VideoPlayer } from "./video-player";
export function SubmissionDetailPage({ id, role }: { id: string; role: Role }) {
  const player = useRef<HTMLVideoElement>(null);
  const me = useMe();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["submission", id],
    queryFn: () => api<Envelope<SubmissionDetail>>(`/api/v1/submissions/${id}`),
    enabled: isUuid(id),
    refetchOnWindowFocus: false,
    refetchInterval: (state) => pollInterval(state.state.data?.data.status),
  });
  const action = useMutation({
    mutationFn: (operation: "review/start" | "retry-analysis") =>
      api(`/api/v1/submissions/${id}/${operation}`, { method: "POST" }),
    onSuccess: async () => {
      toast.success("Status pengajuan diperbarui");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["submission", id] }),
        client.invalidateQueries({ queryKey: ["submissions"] }),
        client.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: async () => {
      await client.invalidateQueries({ queryKey: ["submission", id] });
    },
  });
  if (!isUuid(id)) return <EmptyState title="Pengajuan tidak ditemukan" />;
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const submission = query.data.data;
  const claimedByMe = submission.review?.assessorId === me.data?.user.id;
  return (
    <>
      <PageHeading
        title={submission.rubricVersion.title}
        description={`Video: ${submission.originalFilename} · ${dateLabel(submission.createdAt)}`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={submission.status} />
        {submission.status === "ANALYSIS_FAILED" && (
          <Button
            variant="outline"
            disabled={action.isPending}
            onClick={() => action.mutate("retry-analysis")}
          >
            Ulangi analisis
          </Button>
        )}
        {role === "ASSESSOR" && submission.status === "AWAITING_REVIEW" && (
          <Button
            disabled={action.isPending}
            onClick={() => action.mutate("review/start")}
          >
            Mulai review
          </Button>
        )}
      </div>
      {action.error && <ErrorState error={action.error} />}
      <VideoPlayer ref={player} src={`/api/v1/submissions/${id}/video`} />
      {submission.status === "QUEUED" || submission.status === "ANALYZING" ? (
        <Alert>
          <AlertDescription>
            Video sedang diproses. Status akan diperbarui otomatis.
          </AlertDescription>
        </Alert>
      ) : submission.status === "ANALYSIS_FAILED" ? (
        <Alert variant="destructive">
          <AlertDescription>
            Analisis video belum berhasil. Anda dapat mencoba ulang.
          </AlertDescription>
        </Alert>
      ) : role === "STUDENT" && submission.status !== "COMPLETED" ? (
        <Alert>
          <AlertDescription>
            Video menunggu atau sedang ditinjau asesor. Skor dan feedback
            tersedia setelah penilaian selesai.
          </AlertDescription>
        </Alert>
      ) : null}
      {role === "ASSESSOR" && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Bukti AI dan kriteria</h2>
          <p className="text-sm text-muted-foreground">
            Bukti AI adalah bantuan peninjauan. Verifikasi melalui video sebelum
            memberikan nilai.
          </p>
          {submission.criteria.map((criterion) => {
            const evidence = submission.analysis?.evidence.find(
              (item) => item.criterionId === criterion.id,
            );
            return (
              <Card key={criterion.id}>
                <CardHeader>
                  <CardTitle>
                    {criterion.order}. {criterion.title}
                  </CardTitle>
                  <CardDescription>{criterion.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {evidence ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {
                            {
                              OBSERVED: "Teramati",
                              NOT_OBSERVED: "Tidak teramati",
                              UNCERTAIN: "Tidak pasti",
                            }[evidence.status]
                          }
                        </Badge>
                        <Badge variant="outline">
                          {{
                            CLEAR: "Jelas",
                            PARTIAL: "Sebagian",
                            OCCLUDED: "Terhalang",
                          }[evidence.quality] ?? evidence.quality}
                        </Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {evidence.evidence}
                      </p>
                      {evidence.startMs !== null &&
                      evidence.endMs !== null &&
                      evidence.startMs >= 0 &&
                      evidence.endMs >= evidence.startMs &&
                      evidence.endMs <= submission.durationMs ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (player.current) {
                              player.current.currentTime =
                                evidence.startMs! / 1000;
                              player.current.focus();
                            }
                          }}
                        >
                          Lihat bukti {(evidence.startMs / 1000).toFixed(1)}–
                          {(evidence.endMs / 1000).toFixed(1)} detik
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Timestamp belum tersedia. Tinjau video secara manual.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Bukti AI belum tersedia.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
      {submission.status === "COMPLETED" && submission.review && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Hasil penilaian final</h2>
          <Card>
            <CardHeader>
              <CardTitle>
                Skor akhir: {submission.normalizedScore} / 100
              </CardTitle>
              <CardDescription>
                Selesai {dateLabel(submission.completedAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">
              {submission.review.feedback}
            </CardContent>
          </Card>
          {submission.criteria.map((criterion) => {
            const item = submission.review!.items.find(
              (i) => i.criterionId === criterion.id,
            );
            return (
              <Card key={criterion.id}>
                <CardHeader>
                  <CardTitle className="text-base">{criterion.title}</CardTitle>
                  <CardDescription>
                    {item
                      ? `${item.score} / ${criterion.maxScore} · ${{ CONFIRMED: "Dikonfirmasi", REJECTED: "Ditolak", ADJUSTED: "Disesuaikan" }[item.decision]}`
                      : `Tidak dinilai · 0 / ${criterion.maxScore}`}
                  </CardDescription>
                </CardHeader>
                {item?.note && (
                  <CardContent className="text-sm whitespace-pre-wrap">
                    {item.note}
                  </CardContent>
                )}
                {role === "STUDENT" && (() => {
                  const evidence = submission.analysis?.evidence.find((candidate) => candidate.criterionId === criterion.id);
                  return evidence?.startMs !== null && evidence?.startMs !== undefined && evidence.endMs !== null
                    ? <CardContent className="text-sm text-muted-foreground">Bukti disetujui pada {(evidence.startMs / 1000).toFixed(1)}–{(evidence.endMs / 1000).toFixed(1)} detik</CardContent>
                    : null;
                })()}
              </Card>
            );
          })}
        </section>
      )}
      {role === "ASSESSOR" &&
        submission.status === "IN_REVIEW" &&
        (claimedByMe ? (
          <ReviewEditor key={submission.review!.id} submission={submission} />
        ) : (
          <Alert>
            <AlertDescription>
              Pengajuan ini sedang dinilai oleh asesor lain.
            </AlertDescription>
          </Alert>
        ))}
    </>
  );
}
