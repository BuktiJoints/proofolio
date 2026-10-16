"use client";
import { AssessmentPrintDocument } from "@/modules/shared/print-document";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api-client";
import { useMe } from "@/modules/auth/session";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  StatusBadge,
  LinkButton,
} from "@/modules/shared/ui";
import { PrintButton } from "@/modules/shared/print-button";
import { isUuid, pollInterval, dateLabel } from "@/modules/shared/presentation";
import type {
  Envelope,
  SubmissionDetail,
  Role,
  ReviewDecision,
} from "@/modules/shared/types";
import { ReviewEditor } from "@/modules/assessment/review-editor";
import type { DraftItem } from "@/modules/assessment/review-validation";
import { VideoPlayer } from "./video-player";
import { ProgressTracker } from "./progress-tracker";
export function SubmissionDetailPage({ id, role }: { id: string; role: Role }) {
  const player = useRef<HTMLVideoElement>(null);
  const me = useMe();
  const client = useQueryClient();
  const router = useRouter();
  const student = role === "STUDENT";
  const base = student ? "/student" : "/assessor";
  const query = useQuery({
    queryKey: ["submission", id],
    queryFn: () => api<Envelope<SubmissionDetail>>(`/api/v1/submissions/${id}`),
    enabled: isUuid(id),
    refetchOnWindowFocus: false,
    refetchInterval: (state) => pollInterval(state.state.data?.data.status),
  });
  const action = useMutation({
    mutationFn: (operation: "review/start" | "retry-analysis" | "portfolio") =>
      api(`/api/v1/submissions/${id}/${operation}`, { method: "POST" }),
    onSuccess: async (_, operation) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["submission", id] }),
        client.invalidateQueries({ queryKey: ["submissions"] }),
        client.invalidateQueries({ queryKey: ["dashboard"] }),
        client.invalidateQueries({ queryKey: ["portfolio"] }),
      ]);
      if (operation === "portfolio") router.push("/student/portfolio");
    },
    onError: () =>
      void client.invalidateQueries({ queryKey: ["submission", id] }),
  });
  if (!isUuid(id)) return <EmptyState title="Pengajuan tidak ditemukan" />;
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const s = query.data.data;
  const completed = s.status === "COMPLETED";
  const mine = s.review?.assessorId === me.data?.user.id;
  const media = (
    <VideoPlayer ref={player} src={`/api/v1/submissions/${id}/video`} />
  );
  function evidencePanel(
    draft?: Record<string, DraftItem>,
    update?: (id: string, decision: ReviewDecision) => void,
  ) {
    return (
      <section className="space-y-4">
        <h2 className="text-s6">Bukti Keterampilan Teridentifikasi AI</h2>
        <p className="text-b9 text-neutral-70">
          Bukti AI adalah bantuan peninjauan. Verifikasi melalui video sebelum
          memberikan nilai.
        </p>
        <div className="divide-y divide-neutral-30">
          {s.criteria.map((c) => {
            const evidence = s.analysis?.evidence.find(
              (e) => e.criterionId === c.id,
            );
            const decision =
              draft?.[c.id]?.decision ??
              s.review?.items.find((i) => i.criterionId === c.id)?.decision;
            const validTime =
              evidence &&
              evidence.startMs !== null &&
              evidence.endMs !== null &&
              evidence.startMs >= 0 &&
              evidence.endMs >= evidence.startMs &&
              evidence.endMs <= s.durationMs;
            return (
              <div
                key={c.id}
                data-testid="evidence-row"
                className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 py-4 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]"
              >
                <Button
                  aria-label={`Lihat bukti ${c.title}`}
                  variant="link"
                  size="sm"
                  data-testid="evidence-timestamp"
                  className="h-8 w-14 min-w-14 shrink-0 px-0 text-s9 tabular-nums disabled:bg-transparent disabled:text-neutral-60 md:text-s9"
                  disabled={!validTime}
                  onClick={() => {
                    if (
                      player.current &&
                      evidence?.startMs !== null &&
                      evidence?.startMs !== undefined
                    ) {
                      player.current.currentTime = evidence.startMs / 1000;
                      player.current.focus();
                    }
                  }}
                >
                  {validTime
                    ? `${Math.floor(evidence!.startMs! / 60000)
                        .toString()
                        .padStart(2, "0")}:${Math.floor(
                        (evidence!.startMs! / 1000) % 60,
                      )
                        .toString()
                        .padStart(2, "0")}`
                    : "—"}
                </Button>
                <div className="min-w-0 space-y-1">
                  <p className="text-s8">{c.title}</p>
                  <p className="whitespace-pre-wrap text-b9 text-neutral-70">
                    {evidence?.evidence ?? "Bukti AI belum tersedia."}
                  </p>
                  {evidence && (
                    <span className="text-b10 text-neutral-60">
                      {
                        {
                          OBSERVED: "Teramati",
                          NOT_OBSERVED: "Tidak teramati",
                          UNCERTAIN: "Tidak pasti",
                        }[evidence.status]
                      }
                    </span>
                  )}
                </div>
                {update ? (
                  <div className="col-start-2 flex gap-2 sm:col-start-3 sm:row-start-1">
                    <Button
                      size="xs"
                      variant={decision === "REJECTED" ? "outline" : "default"}
                      onClick={() => update(c.id, "CONFIRMED")}
                    >
                      Valid
                    </Button>
                    <Button
                      size="xs"
                      variant={
                        decision === "REJECTED" ? "destructive" : "outline"
                      }
                      onClick={() => update(c.id, "REJECTED")}
                    >
                      Tidak Valid
                    </Button>
                  </div>
                ) : decision ? (
                  <Badge
                    className="col-start-2 justify-self-start sm:col-start-3 sm:row-start-1 sm:justify-self-end"
                    variant={
                      decision === "REJECTED" ? "destructive" : "success"
                    }
                  >
                    {decision === "REJECTED"
                      ? "Tidak valid"
                      : decision === "ADJUSTED"
                        ? "Disesuaikan"
                        : "Disetujui"}
                  </Badge>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  }
  function summary() {
    return (
      <div className="space-y-6">
        <Card className="bg-primary-10">
          <CardContent className="space-y-3 text-center">
            <p data-testid="final-score" className="text-h2 text-primary-70">
              {s.normalizedScore}
              <span className="text-b7">/100</span>
            </p>
            <p className="text-s8">Nilai akhir diterbitkan</p>
            <p className="text-b9 text-neutral-70">
              Diverifikasi oleh {s.review?.assessorName ?? "Asesor"} ·{" "}
              {dateLabel(s.completedAt)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-h6">Rincian Skor per Kriteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {s.criteria.map((c) => {
              const item = s.review?.items.find((i) => i.criterionId === c.id);
              return (
                <div key={c.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-b8">{c.title}</p>
                    <span className="text-s8 text-primary-70">
                      {item?.score ?? 0}/{c.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-primary-20">
                    <div
                      className="h-full bg-primary-70"
                      style={{
                        width: `${((item?.score ?? 0) / c.maxScore) * 100}%`,
                      }}
                    />
                  </div>
                  {item?.note && (
                    <p className="text-b9 text-neutral-70">{item.note}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card className="bg-secondary-20">
          <CardHeader>
            <CardTitle className="text-h6">Umpan Balik Asesor</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-b8">
            {s.review?.feedback}
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <>
      <div className="screen-only space-y-8">
        <LinkButton
          href={`${base}/submissions`}
          variant="neutral"
          className="h-9 text-s9 md:h-9 md:text-s9"
        >
          ← Kembali ke {student ? "Riwayat" : "Penilaian Siswa"}
        </LinkButton>
        <section className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-2">
            <h1 className="text-h5 md:text-h4">
              {!student && s.student?.name
                ? s.student.name
                : s.rubricVersion.title}
            </h1>
            <p className="text-b8 text-neutral-70">
              {!student
                ? `${s.student?.nisn ? `NISN ${s.student.nisn} · ` : ""}${s.student?.programKeahlian ?? ""} · ${s.rubricVersion.title}`
                : `Diunggah ${dateLabel(s.createdAt)} · ${s.originalFilename}`}
            </p>
            <StatusBadge status={s.status} />
          </div>
          <div className="flex flex-wrap gap-3">
            {student &&
              completed &&
              (s.portfolioIncluded ? (
                <LinkButton href="/student/portfolio">
                  Lihat Digital Portofolio
                </LinkButton>
              ) : (
                <Button
                  disabled={action.isPending}
                  onClick={() => action.mutate("portfolio")}
                >
                  Tambahkan ke Digital Portofolio
                </Button>
              ))}
            {completed && <PrintButton label="Unduh Bukti Penilaian (PDF)" />}
          </div>
        </section>
        {action.error && <ErrorState error={action.error} />}
        {completed && (
          <Alert variant="success">
            <AlertTitle>Penilaian berhasil diterbitkan</AlertTitle>
            <AlertDescription>
              Hasil berikut sudah diverifikasi oleh asesor.
            </AlertDescription>
          </Alert>
        )}
        {!completed && student ? (
          <>
            <Card>
              <CardContent className="space-y-6">
                <ProgressTracker status={s.status} />
                <div className="grid gap-5 sm:grid-cols-3">
                  <div>
                    <p className="text-b9 text-neutral-60">Tanggal pengajuan</p>
                    <p className="mt-1 text-s8">{dateLabel(s.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-b9 text-neutral-60">Analisis AI</p>
                    <p className="mt-1 text-s8">
                      {s.status === "ANALYSIS_FAILED"
                        ? "Belum berhasil"
                        : s.status === "QUEUED"
                          ? "Dalam antrean"
                          : s.status === "ANALYZING"
                            ? "Sedang berjalan"
                            : "Selesai"}
                    </p>
                  </div>
                  <div>
                    <p className="text-b9 text-neutral-60">Asesor</p>
                    <p className="mt-1 text-s8">
                      {s.status === "IN_REVIEW"
                        ? "Sedang meninjau"
                        : "Menunggu verifikasi"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Alert>
              <AlertTitle>Penilaian masih berlangsung</AlertTitle>
              <AlertDescription>
                Skor akhir dan umpan balik akan tampil setelah asesor
                menyelesaikan verifikasi. Status diperbarui otomatis.
              </AlertDescription>
            </Alert>
            {s.status === "ANALYSIS_FAILED" && (
              <Button
                disabled={action.isPending}
                onClick={() => action.mutate("retry-analysis")}
              >
                Ulangi analisis
              </Button>
            )}
          </>
        ) : !student && s.status === "IN_REVIEW" && mine ? (
          <ReviewEditor
            key={s.review!.id}
            submission={s}
            media={media}
            renderEvidence={evidencePanel}
          />
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-6">
              {media}
              {evidencePanel()}
            </div>
            {completed ? (
              summary()
            ) : (
              <Card>
                <CardContent className="space-y-4">
                  <h2 className="text-h5">Detail Penilaian</h2>
                  <p className="text-b8 text-neutral-70">
                    {s.status === "AWAITING_REVIEW"
                      ? "Analisis AI selesai. Mulai review untuk memverifikasi bukti dan mengisi nilai."
                      : s.status === "IN_REVIEW"
                        ? "Pengajuan ini sedang dinilai oleh asesor lain."
                        : "Video sedang diproses. Penilaian dapat dimulai setelah analisis AI selesai."}
                  </p>
                  {s.status === "AWAITING_REVIEW" && (
                    <Button
                      disabled={action.isPending}
                      onClick={() => action.mutate("review/start")}
                    >
                      Mulai review
                    </Button>
                  )}
                  {s.status === "ANALYSIS_FAILED" && (
                    <Button
                      disabled={action.isPending}
                      onClick={() => action.mutate("retry-analysis")}
                    >
                      Ulangi analisis
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      {completed && (
        <AssessmentPrintDocument
          submission={s}
          student={
            student
              ? {
                  name: me.data?.user.name ?? "Siswa",
                  schoolName: me.data?.profile?.schoolName,
                  programKeahlian: me.data?.profile?.programKeahlian,
                }
              : {
                  name: s.student?.name ?? "Siswa",
                  schoolName: s.student?.schoolName,
                  programKeahlian: s.student?.programKeahlian,
                }
          }
        />
      )}
    </>
  );
}
