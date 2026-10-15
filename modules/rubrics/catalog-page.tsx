"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { api } from "@/lib/api-client";
import {
  PageHeading,
  LoadingState,
  ErrorState,
  EmptyState,
  LinkButton,
  Choice,
} from "@/modules/shared/ui";
import type { Envelope, Role, Rubric } from "@/modules/shared/types";
export function CatalogPage({ role }: { role: Role }) {
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("all");
  const [tab, setTab] = useState("all");
  const student = role === "STUDENT";
  const base = student ? "/student" : "/assessor";
  const query = useQuery({
    queryKey: ["rubrics", role],
    queryFn: () => api<Envelope<Rubric[]>>("/api/v1/rubrics"),
  });
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const rows = query.data.data;
  const programs = [
    ...new Set(
      rows.map((r) => r.programKeahlian).filter((v): v is string => !!v),
    ),
  ];
  const filtered = rows.filter(
    (r) =>
      (program === "all" || r.programKeahlian === program) &&
      (tab === "all" || (tab === "followed" ? r.followed : r.status === tab)) &&
      `${r.title} ${r.description ?? ""} ${r.partnerName ?? r.partner?.name ?? ""} ${r.programKeahlian ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title={
          student
            ? "Eksplorasi Uji Kompetensi Keahlian (UKK)"
            : "Manajemen Modul UKK & Rubrik Penilaian"
        }
        description={
          student
            ? "Temukan program UKK dari mitra sekolahmu, pelajari rubriknya, lalu unggah video demonstrasi terbaikmu."
            : "Kelola modul uji kompetensi sekolah dan pastikan rubrik siap digunakan AI."
        }
        action={
          !student && (
            <LinkButton href="/assessor/rubrics/new">
              + Tambah Modul UKK
            </LinkButton>
          )
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute top-4 left-4 size-4 text-neutral-60"
            aria-hidden="true"
          />
          <Input
            aria-label="Cari modul UKK"
            placeholder="Cari modul UKK, mata pelajaran, atau mitra"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-neutral-30 pl-11 md:pl-11"
          />
        </div>
        <div className="sm:w-64">
          <Choice
            id="catalog-program"
            label="Filter jurusan"
            value={program}
            onChange={setProgram}
            options={[
              { value: "all", label: "Semua jurusan" },
              ...programs.map((p) => ({ value: p, label: p })),
            ]}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {(student
          ? [
              ["all", "Semua"],
              ["PUBLISHED", "Aktif"],
              ["followed", "Diikuti"],
            ]
          : [
              ["all", "Semua"],
              ["PUBLISHED", "Aktif"],
              ["DRAFT", "Draft"],
              ["ARCHIVED", "Diarsipkan"],
            ]
        ).map(([value, label]) => (
          <Toggle
            key={value}
            pressed={tab === value}
            onPressedChange={() => setTab(value)}
          >
            {label}
          </Toggle>
        ))}
      </div>
      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardHeader className="gap-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-tertiary-20 text-tertiary-80">
                    <Building2 className="size-6" />
                  </span>
                  <Badge
                    variant={r.status === "PUBLISHED" ? "success" : "secondary"}
                  >
                    {r.status === "PUBLISHED"
                      ? "Aktif"
                      : r.status === "DRAFT"
                        ? "Draft"
                        : "Diarsipkan"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-b9 text-neutral-60">
                    {r.partnerName || r.partner?.name || "Mitra sekolah"}
                  </p>
                  <CardTitle className="text-s7">{r.title}</CardTitle>
                  <p className="line-clamp-3 text-b9 text-neutral-70">
                    {r.description ||
                      "Pelajari kriteria dan indikator praktik pada rubrik modul ini."}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-neutral-30 pt-4 text-s9 text-primary-70">
                  <span>{r.criterionCount ?? 0} kriteria</span>
                  {r.followed && <Badge variant="success">Diikuti</Badge>}
                  {r.programKeahlian && (
                    <span className="text-b9 text-neutral-60">
                      {r.programKeahlian}
                    </span>
                  )}
                </div>
                <LinkButton
                  href={`${base}/rubrics/${r.id}`}
                  variant="outline"
                  className="w-full border-primary-30 text-s8 md:text-s8"
                >
                  {student ? "Lihat Detail & Rubrik" : "Kelola & Edit Rubrik"}
                </LinkButton>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            search || program !== "all" || tab !== "all"
              ? "Modul UKK tidak ditemukan"
              : "Belum ada modul UKK"
          }
          description="Coba ubah pencarian atau filter. Modul siswa tersedia setelah rubrik diterbitkan asesor."
        />
      )}
    </>
  );
}
