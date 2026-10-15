"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brand } from "@/modules/shared/brand";
import { PrintButton } from "@/modules/shared/print-button";
import { ErrorState, LoadingState, EmptyState } from "@/modules/shared/ui";
import { api } from "@/lib/api-client";
import { dateLabel } from "@/modules/shared/presentation";
import type { Envelope } from "@/modules/shared/types";
type PublicPortfolio = {
  student: {
    name: string;
    schoolName: string | null;
    programKeahlian: string | null;
  };
  expiresAt: string;
  items: {
    id: string;
    title: string;
    description: string | null;
    score: string;
    completedAt: string;
    feedback: string | null;
  }[];
};
export function PublicPortfolioPage({ token }: { token: string }) {
  const query = useQuery({
    queryKey: ["public-portfolio", token],
    queryFn: () =>
      api<Envelope<PublicPortfolio>>(
        `/api/public/portfolios/${encodeURIComponent(token)}`,
      ),
    retry: false,
  });
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-8 bg-neutral-10 p-6 md:p-10">
      <Brand />
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge variant="success">
                Portofolio kompetensi terverifikasi
              </Badge>
              <h1 className="text-h3">{query.data.data.student.name}</h1>
              <p className="text-b8 text-neutral-70">
                {[
                  query.data.data.student.schoolName,
                  query.data.data.student.programKeahlian,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <PrintButton label="Unduh Portofolio (PDF)" />
          </header>
          {query.data.data.items.length ? (
            query.data.data.items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <p className="text-b9 text-neutral-70">
                    Diverifikasi {dateLabel(item.completedAt)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge variant="success">Skor {item.score}/100</Badge>
                  {item.description && (
                    <p className="text-b8">{item.description}</p>
                  )}
                  {item.feedback && (
                    <div className="space-y-2 rounded-xl bg-secondary-10 p-4">
                      <h2 className="text-s8">Umpan balik asesor</h2>
                      <p className="whitespace-pre-wrap text-b8">
                        {item.feedback}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState title="Belum ada hasil dalam portofolio ini" />
          )}
          <p className="text-b9 text-neutral-70">
            Tautan berlaku sampai {dateLabel(query.data.data.expiresAt)}. Bukti
            ini merupakan hasil penilaian praktik, bukan sertifikat kompetensi
            resmi.
          </p>
        </>
      )}
    </main>
  );
}
