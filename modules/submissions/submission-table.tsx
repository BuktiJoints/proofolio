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
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Video praktik</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dikirim</TableHead>
            <TableHead>Skor akhir</TableHead>
            <TableHead>
              <span className="sr-only">Aksi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell className="max-w-60 truncate font-medium">
                {submission.rubricTitle || submission.originalFilename}
              </TableCell>
              <TableCell>
                <StatusBadge status={submission.status} />
              </TableCell>
              <TableCell>{dateLabel(submission.createdAt)}</TableCell>
              <TableCell>
                {submission.status === "COMPLETED"
                  ? `${submission.normalizedScore ?? "—"} / 100`
                  : "—"}
              </TableCell>
              <TableCell>
                <LinkButton
                  href={`${base}/submissions/${submission.id}`}
                  variant="outline"
                >
                  Lihat detail
                </LinkButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
