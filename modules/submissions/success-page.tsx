"use client";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { ErrorState, LinkButton, LoadingState } from "@/modules/shared/ui";
import type { Envelope, SubmissionDetail } from "@/modules/shared/types";
export function SubmissionSuccessPage({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["submission", id],
    queryFn: () => api<Envelope<SubmissionDetail>>(`/api/v1/submissions/${id}`),
  });
  if (query.isPending) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;
  return (
    <section className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center gap-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-green-10">
        <CircleCheck className="size-11 text-green-70" />
      </div>
      <h1 className="text-h5">Video praktik berhasil dikumpulkan!</h1>
      <p className="text-b8 text-neutral-70">
        Video untuk {query.data.data.rubricVersion.title} sudah diterima. Pantau
        status analisis AI dan verifikasi asesor melalui halaman penilaian.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <LinkButton href={`/student/submissions/${id}`}>
          Pantau Status Penilaian
        </LinkButton>
        <LinkButton href="/student/dashboard" variant="outline">
          Kembali ke Beranda
        </LinkButton>
      </div>
    </section>
  );
}
