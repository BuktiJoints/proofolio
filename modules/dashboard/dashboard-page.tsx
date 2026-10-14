"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api-client";
import { useMe, profileComplete } from "@/modules/auth/session";
import {
  PageHeading,
  LoadingState,
  ErrorState,
  LinkButton,
} from "@/modules/shared/ui";
import { SubmissionTable } from "@/modules/submissions/submission-table";
import type {
  Envelope,
  Submission,
  SubmissionStatus,
  Role,
} from "@/modules/shared/types";
export function DashboardPage({ role }: { role: Role }) {
  const me = useMe();
  const query = useQuery({
    queryKey: ["dashboard", role],
    queryFn: () =>
      api<
        Envelope<{
          counts: Partial<Record<SubmissionStatus, number>>;
          recent: Submission[];
        }>
      >("/api/v1/dashboard"),
    refetchInterval: 15000,
  });
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const base = role === "STUDENT" ? "/student" : "/assessor";
  const counts = query.data.data.counts;
  const metrics = role === "STUDENT"
    ? [
        ["Total video diunggah", Object.values(counts).reduce((total, count) => total + (count ?? 0), 0)],
        ["Menunggu penilaian", (counts.QUEUED ?? 0) + (counts.ANALYZING ?? 0) + (counts.AWAITING_REVIEW ?? 0) + (counts.IN_REVIEW ?? 0)],
        ["Terverifikasi", counts.COMPLETED ?? 0],
      ] as const
    : [
        ["Menunggu review", counts.AWAITING_REVIEW ?? 0],
        ["Sedang direview", counts.IN_REVIEW ?? 0],
        ["Selesai", counts.COMPLETED ?? 0],
      ] as const;
  return (
    <>
      <PageHeading
        title={role === "STUDENT" && me.data ? `Halo, ${me.data.user.name}` : "Dashboard asesor"}
        description={role === "STUDENT" && me.data?.profile
          ? `${me.data.profile.nisn ?? "NISN belum diisi"} · ${me.data.profile.programKeahlian ?? "Jurusan belum diisi"} · ${me.data.profile.schoolName ?? "Sekolah belum diisi"}`
          : "Pantau perkembangan pengajuan dan hasil penilaian praktik."}
        action={
          <LinkButton
            href={
              role === "STUDENT"
                ? `${base}/submissions/new`
                : `${base}/submissions`
            }
          >
            {role === "STUDENT" ? "Ajukan video praktik" : "Tinjau pengajuan"}
          </LinkButton>
        }
      />
      {role === "STUDENT" && me.data && !profileComplete(me.data) && (
        <Alert>
          <AlertDescription>
            Lengkapi profil sebelum mengajukan video.{" "}
            <LinkButton href="/student/profile" variant="outline">
              Lengkapi profil
            </LinkButton>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([label, count]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {count}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pengajuan terbaru</h2>
        <LinkButton href={`${base}/submissions`} variant="ghost">
          Lihat semua
        </LinkButton>
      </div>
      <SubmissionTable submissions={query.data.data.recent.slice(0, 3)} base={base} />
      {role === "STUDENT" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Portofolio kompetensi</CardTitle></CardHeader>
          <CardContent>
            <LinkButton href="/student/portfolio" variant="outline">Lihat dan bagikan portofolio</LinkButton>
          </CardContent>
        </Card>
      )}
    </>
  );
}
