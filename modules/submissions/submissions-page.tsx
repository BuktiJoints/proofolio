"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import {
  Choice,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeading,
} from "@/modules/shared/ui";
import { statusLabels } from "@/modules/shared/presentation";
import type { Paginated, Role, Submission } from "@/modules/shared/types";
import { SubmissionTable } from "./submission-table";
export function SubmissionsPage({ role }: { role: Role }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const base = role === "STUDENT" ? "/student" : "/assessor";
  const query = useQuery({
    queryKey: ["submissions", role, page, status],
    queryFn: () =>
      api<Paginated<Submission>>(
        `/api/v1/submissions?page=${page}&limit=10${status === "all" ? "" : `&status=${status}`}`,
      ),
    refetchInterval: 15000,
  });
  return (
    <>
      <PageHeading
        title={role === "STUDENT" ? "Riwayat pengajuan" : "Pengajuan siswa"}
        description="Lihat status dan buka detail penilaian setiap video."
        action={
          role === "STUDENT" && (
            <LinkButton href="/student/submissions/new">
              Ajukan video
            </LinkButton>
          )
        }
      />
      <div className="max-w-xs space-y-2">
        <Label htmlFor="status-filter">Filter status</Label>
        <Choice
          id="status-filter"
          label="Filter status"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "Semua status" },
            ...Object.entries(statusLabels).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <SubmissionTable submissions={query.data.data} base={base} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Halaman {page} · {query.data.meta.total} pengajuan
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
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
