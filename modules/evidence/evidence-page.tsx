"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { api, ClientApiError } from "@/lib/api-client";
import {
  PageHeading,
  ErrorState,
  EmptyState,
  LoadingState,
} from "@/modules/shared/ui";
import { dateLabel } from "@/modules/shared/presentation";
import { VideoPlayer } from "@/modules/submissions/video-player";
import type { Envelope, ReviewItem } from "@/modules/shared/types";
type PublicEvidence = {
  student: { name: string; schoolName?: string; programKeahlian?: string };
  rubric: { title: string; description: string | null };
  result: {
    normalizedScore: string;
    feedback: string;
    completedAt: string;
    criteria: {
      code: string;
      title: string;
      maxScore: number;
      review: ReviewItem | null;
    }[];
  };
  videoUrl: string;
  expiresAt: string;
};
export function EvidencePage({ token }: { token: string }) {
  const query = useQuery({
    queryKey: ["public-evidence", token],
    queryFn: () =>
      api<Envelope<PublicEvidence>>(
        `/api/public/evidence/${encodeURIComponent(token)}`,
      ),
    retry: false,
    refetchInterval: 30000,
  });
  const evidence = query.data?.data;
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 py-8 md:p-8">
      <p className="font-semibold">BuktiPraktik · Bukti keterampilan</p>
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        query.error instanceof ClientApiError && query.error.status === 404 ? (
          <EmptyState
            title="Tautan tidak tersedia"
            description="Tautan mungkin sudah dicabut, kedaluwarsa, atau tidak valid."
          />
        ) : (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        )
      ) : (
        evidence && (
          <>
            <PageHeading
              title={evidence.rubric.title}
              description={evidence.rubric.description ?? undefined}
            />
            <Card>
              <CardHeader>
                <CardTitle>{evidence.student.name}</CardTitle>
                <CardDescription>
                  {evidence.student.schoolName} ·{" "}
                  {evidence.student.programKeahlian}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-3xl font-semibold">
                  {evidence.result.normalizedScore} / 100
                </p>
                <p className="text-sm">
                  Hasil diverifikasi asesor pada{" "}
                  {dateLabel(evidence.result.completedAt)}.
                </p>
                <p className="whitespace-pre-wrap">
                  {evidence.result.feedback}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tautan berlaku sampai {dateLabel(evidence.expiresAt)}. Bukti
                  ini merupakan dokumentasi penilaian praktik, bukan sertifikat
                  kompetensi resmi.
                </p>
              </CardContent>
            </Card>
            <VideoPlayer src={evidence.videoUrl} />
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Penilaian per kriteria</h2>
              {evidence.result.criteria.map((criterion) => (
                <Card key={criterion.code}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {criterion.title}
                    </CardTitle>
                    <CardDescription>
                      {criterion.review
                        ? `${criterion.review.score} / ${criterion.maxScore} · ${{ CONFIRMED: "Dikonfirmasi", REJECTED: "Ditolak", ADJUSTED: "Disesuaikan" }[criterion.review.decision]}`
                        : `Tidak dinilai · 0 / ${criterion.maxScore}`}
                    </CardDescription>
                  </CardHeader>
                  {criterion.review?.note && (
                    <CardContent className="text-sm whitespace-pre-wrap">
                      {criterion.review.note}
                    </CardContent>
                  )}
                </Card>
              ))}
            </section>
          </>
        )
      )}
    </main>
  );
}
