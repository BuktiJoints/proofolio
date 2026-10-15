"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import {
  PageHeading,
  LoadingState,
  ErrorState,
  EmptyState,
  LinkButton,
  StatusBadge,
  Choice,
} from "@/modules/shared/ui";
import { dateLabel } from "@/modules/shared/presentation";
import type { Paginated, Submission } from "@/modules/shared/types";
type Student = {
  id: string;
  name: string;
  nisn: string | null;
  schoolName: string | null;
  programKeahlian: string | null;
  submissionCount: number;
};
function StudentSubmissions({ id, group }: { id: string; group: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["submissions", "student", id, group, page],
    queryFn: () =>
      api<Paginated<Submission>>(
        `/api/v1/submissions?studentId=${id}&group=${group}&page=${page}&limit=10`,
      ),
    refetchInterval: 15000,
  });
  if (query.isPending) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;
  return (
    <div className="space-y-3">
      {query.data.data.map((s) => (
        <div
          key={s.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary-30 bg-neutral-10 p-4"
        >
          <div className="space-y-2">
            <StatusBadge status={s.status} />
            <h3 className="text-s8 text-neutral-100">{s.rubricTitle}</h3>
            <p className="text-b9 text-neutral-60">
              Diunggah {dateLabel(s.createdAt)}
              {s.status === "COMPLETED"
                ? ` · Skor ${s.normalizedScore}/100`
                : ""}
            </p>
          </div>
          <LinkButton
            href={`/assessor/submissions/${s.id}`}
            className="h-9 text-s9 md:h-9 md:text-s9"
          >
            {s.status === "COMPLETED"
              ? "Lihat Penilaian"
              : "Tinjau & Validasi UKK"}
          </LinkButton>
        </div>
      ))}
      {query.data.meta.total > 10 && (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Sebelumnya
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page * 10 >= query.data.meta.total}
            onClick={() => setPage(page + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
export function StudentsPage() {
  const [q, setQ] = useState("");
  const [program, setProgram] = useState("");
  const [group, setGroup] = useState("pending");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["assessment-students", q, program, group, page],
    queryFn: () =>
      api<Paginated<Student> & { meta: { programs: string[] } }>(
        `/api/v1/assessments/students?group=${group}&q=${encodeURIComponent(q)}&program=${encodeURIComponent(program)}&page=${page}&limit=10`,
      ),
    refetchInterval: 15000,
  });
  return (
    <>
      <PageHeading
        title="Penilaian Berdasarkan Siswa"
        description="Pantau status UKK setiap siswa secara real-time dan buka lembar verifikasi video."
      />
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Input
          aria-label="Cari nama siswa / NISN"
          placeholder="Cari nama siswa / NISN"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="border-neutral-30"
        />
        <Choice
          id="assessment-program"
          label="Filter jurusan"
          value={program || "all"}
          onChange={(value) => {
            setProgram(value === "all" ? "" : value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "Semua jurusan" },
            ...(query.data?.meta.programs ?? []).map((value) => ({
              value,
              label: value,
            })),
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        {[
          ["pending", "Perlu Diverifikasi"],
          ["completed", "Selesai Dinilai"],
        ].map(([value, label]) => (
          <Toggle
            key={value}
            pressed={group === value}
            onPressedChange={() => {
              setGroup(value);
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
      ) : !query.data.data.length ? (
        <EmptyState
          title="Tidak ada siswa pada daftar ini"
          description="Coba ubah filter atau tunggu pengajuan praktik siswa."
        />
      ) : (
        <>
          <Accordion>
            {query.data.data.map((student) => (
              <AccordionItem
                key={student.id}
                value={student.id}
                className="overflow-hidden rounded-xl border border-neutral-30"
              >
                <AccordionTrigger className="rounded-none bg-neutral-10 p-5 text-neutral-100 shadow-none hover:bg-primary-10">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-20 text-s9 text-secondary-80">
                    {student.name
                      .split(" ")
                      .slice(0, 2)
                      .map((x) => x[0])
                      .join("")}
                  </span>
                  <span className="space-y-1">
                    <span className="block text-s8">{student.name}</span>
                    <span className="block text-b9 text-neutral-60">
                      {student.nisn
                        ? `NISN ${student.nisn}`
                        : "NISN belum diisi"}{" "}
                      ·{" "}
                      {student.programKeahlian ||
                        student.schoolName ||
                        "Profil belum lengkap"}
                    </span>
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {student.submissionCount} UKK
                  </Badge>
                </AccordionTrigger>
                <AccordionContent className="border-0 bg-primary-10 p-2">
                  <StudentSubmissions id={student.id} group={group} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="flex items-center justify-between gap-3">
            <p className="text-b9 text-neutral-70">
              {query.data.meta.total} siswa · Halaman {page}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
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
