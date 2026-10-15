"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dateLabel } from "@/modules/shared/presentation";
import { EmptyState, LinkButton, StatusBadge } from "@/modules/shared/ui";
import type { Submission } from "@/modules/shared/types";
export function SubmissionTable({
  submissions,
  base,
}: {
  submissions: Submission[];
  base: string;
}) {
  if (!submissions.length)
    return (
      <EmptyState
        title="Belum ada pengajuan"
        description="Pengajuan video praktik akan muncul di sini."
      />
    );
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-30 p-2 md:p-6">
      <Table>
        <TableHeader className="bg-transparent">
          <TableRow>
            <TableHead>Judul Praktik</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Skor Akhir</TableHead>
            <TableHead>
              <span className="sr-only">Aksi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="min-w-52 whitespace-normal">
                <p className="text-s8">{s.rubricTitle || s.originalFilename}</p>
                <p className="mt-1 text-b9 text-neutral-60">
                  {base === "/assessor" && s.studentName
                    ? s.studentName
                    : s.originalFilename}
                </p>
              </TableCell>
              <TableCell className="text-b9 text-neutral-70">
                {dateLabel(s.createdAt)}
              </TableCell>
              <TableCell>
                <StatusBadge status={s.status} />
              </TableCell>
              <TableCell
                className={
                  s.status === "COMPLETED"
                    ? "text-s7 text-primary-70"
                    : "text-b9 text-neutral-50"
                }
              >
                {s.status === "COMPLETED"
                  ? `${s.normalizedScore ?? "—"}/100`
                  : "Belum ada skor"}
              </TableCell>
              <TableCell>
                <LinkButton
                  href={`${base}/submissions/${s.id}`}
                  variant="outline"
                  className="h-9 min-w-36 border-primary-30 text-s9 md:h-9 md:text-s9"
                >
                  {s.status === "COMPLETED"
                    ? "Lihat Hasil Penilaian"
                    : base === "/assessor"
                      ? "Tinjau"
                      : "Lihat Status"}
                </LinkButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
