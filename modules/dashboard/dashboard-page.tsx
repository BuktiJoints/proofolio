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
import { statusLabels } from "@/modules/shared/presentation";
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
  return (
    <>
      <PageHeading
        title={role === "STUDENT" ? "Dashboard siswa" : "Dashboard asesor"}
        description="Pantau perkembangan pengajuan dan hasil penilaian praktik."
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
        {Object.entries(statusLabels).map(([status, label]) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {query.data.data.counts[status as SubmissionStatus] ?? 0}
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
      <SubmissionTable submissions={query.data.data.recent} base={base} />
    </>
  );
}
