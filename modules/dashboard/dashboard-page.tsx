"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { useMe, profileComplete } from "@/modules/auth/session";
import {
  LoadingState,
  ErrorState,
  LinkButton,
  StatusBadge,
} from "@/modules/shared/ui";
import { dateLabel } from "@/modules/shared/presentation";
import { SubmissionTable } from "@/modules/submissions/submission-table";
import { ProgressTracker } from "@/modules/submissions/progress-tracker";
import type {
  Envelope,
  Submission,
  SubmissionStatus,
  Role,
} from "@/modules/shared/types";
export function DashboardPage({ role }: { role: Role }) {
  const me = useMe();
  const student = role === "STUDENT";
  const base = student ? "/student" : "/assessor";
  const query = useQuery({
    queryKey: ["dashboard", role],
    queryFn: () =>
      api<
        Envelope<{
          counts: Partial<Record<SubmissionStatus, number>>;
          recent: Submission[];
          statistics: {
            averageScore: string | null;
            completedThisMonth: number;
            activeRubrics: number;
          };
        }>
      >("/api/v1/dashboard"),
    refetchInterval: 15000,
  });
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const { counts, recent, statistics } = query.data.data;
  const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
  const active = recent.find((s) => s.status !== "COMPLETED");
  const metrics = student
    ? [
        [total, "Total pengajuan", "text-primary-70"],
        [counts.COMPLETED ?? 0, "Terverifikasi", "text-green-70"],
        [total - (counts.COMPLETED ?? 0), "Dalam proses", "text-yellow-70"],
        [statistics.averageScore ?? "—", "Rata-rata skor", "text-secondary-70"],
      ]
    : [
        [counts.AWAITING_REVIEW ?? 0, "Perlu diverifikasi", "text-yellow-70"],
        [statistics.completedThisMonth, "Selesai bulan ini", "text-green-70"],
        [statistics.activeRubrics, "Modul UKK aktif", "text-primary-70"],
        [counts.IN_REVIEW ?? 0, "Sedang ditinjau", "text-secondary-70"],
      ];
  return (
    <>
      <section className="flex flex-col justify-between gap-6 rounded-2xl bg-primary-70 p-6 text-neutral-10 md:min-h-46 md:flex-row md:items-center md:p-10">
        <div className="min-w-0 flex-1 space-y-5">
          <h1 className="break-words text-h4 md:text-h2">
            {student ? "Halo, " : "Selamat datang, "}
            {me.data?.user.name}
            {student ? "!" : ""}
          </h1>
          <div className="flex flex-wrap gap-2">
            {(student
              ? [
                  me.data?.profile?.nisn
                    ? `NISN ${me.data.profile.nisn}`
                    : "NISN belum diisi",
                  me.data?.profile?.schoolName,
                  me.data?.profile?.programKeahlian,
                ]
              : [
                  me.data?.assessorProfile?.employeeId
                    ? `NIP ${me.data.assessorProfile.employeeId}`
                    : "Asesor",
                  me.data?.assessorProfile?.institution,
                  me.data?.assessorProfile?.programKeahlian,
                ]
            )
              .filter(Boolean)
              .map((label) => (
                <Badge
                  key={label}
                  className="border-0 bg-primary-20 text-b9 text-primary-70"
                >
                  {label}
                </Badge>
              ))}
          </div>
        </div>
        <LinkButton
          href={student ? "/student/rubrics" : "/assessor/submissions"}
          variant="neutral"
        >
          {student ? "+ Unggah Video Praktik" : "Masuk Penilaian Siswa"}
        </LinkButton>
      </section>
      {student && me.data && !profileComplete(me.data) && (
        <Alert>
          <AlertDescription>
            Lengkapi profil sebelum mengajukan video.{" "}
            <LinkButton href="/student/profile" variant="outline">
              Lengkapi profil
            </LinkButton>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map(([value, label, color]) => (
          <Card key={String(label)} className="gap-1 p-5">
            <p className={`text-h3 ${color}`}>{value}</p>
            <p className="text-b8 text-neutral-70">{label}</p>
          </Card>
        ))}
      </div>
      {student && active && (
        <section className="space-y-4">
          <h2 className="text-h5">Pantau perkembangan praktikmu</h2>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-s6">
                    {active.rubricTitle}
                  </CardTitle>
                  <p className="text-b8 text-neutral-60">
                    Diunggah {dateLabel(active.createdAt)}
                  </p>
                </div>
                <StatusBadge status={active.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ProgressTracker status={active.status} />
              <div className="flex justify-end">
                <LinkButton
                  href={`/student/submissions/${active.id}`}
                  variant="outline"
                  className="h-9 text-s9 md:h-9 md:text-s9"
                >
                  Lihat detail status
                </LinkButton>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h5">
            {student ? "3 pengajuan terakhir" : "Submisi Perlu Diverifikasi"}
          </h2>
          <LinkButton
            href={`${base}/submissions`}
            variant="neutral"
            className="text-s9 md:text-s9"
          >
            Lihat semua
          </LinkButton>
        </div>
        <SubmissionTable
          submissions={(student
            ? recent
            : recent.filter((s) => s.status !== "COMPLETED")
          ).slice(0, student ? 3 : 5)}
          base={base}
        />
      </section>
    </>
  );
}
