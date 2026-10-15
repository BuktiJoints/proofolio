"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { api } from "@/lib/api-client";
import { ErrorState, LoadingState, PageHeading } from "@/modules/shared/ui";
import type { Paginated, Role, Submission } from "@/modules/shared/types";
import { SubmissionTable } from "./submission-table";
export function SubmissionsPage({
  role,
  history = false,
}: {
  role: Role;
  history?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("all");
  const base = role === "STUDENT" ? "/student" : "/assessor";
  const group = history ? "completed" : tab === "all" ? "" : tab;
  const query = useQuery({
    queryKey: ["submissions", role, page, tab, history],
    queryFn: () =>
      api<Paginated<Submission>>(
        `/api/v1/submissions?page=${page}&limit=10${group ? `&group=${group}` : ""}${history && tab === "month" ? "&period=currentMonth" : ""}${history && tab === "high" ? "&minScore=85" : ""}`,
      ),
    refetchInterval: 15000,
  });
  return (
    <>
      <PageHeading
        title={history ? "Riwayat Penilaian" : "Riwayat Pengajuan"}
        description={
          history
            ? "Arsip seluruh penilaian yang telah Anda terbitkan."
            : "Rekap seluruh video praktik yang pernah kamu kumpulkan beserta status dan nilainya."
        }
      />
      <div className="flex flex-wrap gap-3">
        {(history
          ? [
              ["all", "Semua"],
              ["month", "Bulan Ini"],
              ["high", "Skor ≥ 85"],
            ]
          : [
              ["all", "Semua"],
              ["pending", "Sedang Ditinjau"],
              ["completed", "Selesai"],
            ]
        ).map(([value, label]) => (
          <Toggle
            key={value}
            pressed={tab === value}
            onPressedChange={() => {
              setTab(value);
              setPage(1);
            }}
          >
            {label}
          </Toggle>
        ))}
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <SubmissionTable submissions={query.data.data} base={base} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-b9 text-neutral-70">
              Halaman {page} · {query.data.meta.total} pengajuan
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 10 >= query.data.meta.total}
                onClick={() => setPage(page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
