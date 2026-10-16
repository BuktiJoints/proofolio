import type { ReactNode } from "react";
import { Brand } from "./brand";
import { dateLabel } from "./presentation";
import type { SubmissionDetail } from "./types";

type StudentIdentity = {
  name: string;
  schoolName?: string | null;
  programKeahlian?: string | null;
};
export function PrintDocument({
  title,
  student,
  children,
}: {
  title: string;
  student: StudentIdentity;
  children: ReactNode;
}) {
  return (
    <article className="print-document" aria-label={title}>
      <header className="print-document-header">
        <Brand />
        <p>Dokumentasi kompetensi praktik</p>
      </header>
      <h1>{title}</h1>
      <section className="print-identity">
        <h2>{student.name}</h2>
        <p>
          {[student.schoolName, student.programKeahlian]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </section>
      {children}
      <footer>
        Hasil penilaian praktik yang diverifikasi asesor. Dokumen ini bukan
        sertifikat kompetensi resmi.
      </footer>
    </article>
  );
}
export function PortfolioPrintDocument({
  student,
  items,
}: {
  student: StudentIdentity;
  items: {
    id: string;
    title: string;
    score: string | null;
    completedAt: string | null;
    partnerName?: string | null;
    description?: string | null;
    feedback?: string | null;
  }[];
}) {
  return (
    <PrintDocument title="Portofolio Kompetensi" student={student}>
      <p className="print-summary">
        {items.length} hasil penilaian terverifikasi dalam portofolio.
      </p>
      <h2>Daftar Bukti Kompetensi</h2>
      {items.map((item, index) => (
        <section
          key={item.id}
          className="print-result"
          data-allow-break={
            (item.description?.length ?? 0) + (item.feedback?.length ?? 0) >
            1500
          }
        >
          <div className="print-result-heading">
            <h3>
              {index + 1}. {item.title}
            </h3>
            <strong>{item.score ?? "—"}/100</strong>
          </div>
          <p className="print-meta">
            {[item.partnerName, `Diverifikasi ${dateLabel(item.completedAt)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {item.description && <p>{item.description}</p>}
          {item.feedback && (
            <>
              <h4>Umpan balik asesor</h4>
              <p>{item.feedback}</p>
            </>
          )}
        </section>
      ))}
      {!items.length && <p>Belum ada hasil penilaian dalam portofolio.</p>}
    </PrintDocument>
  );
}
export function AssessmentPrintDocument({
  submission: s,
  student,
}: {
  submission: SubmissionDetail;
  student: StudentIdentity;
}) {
  const decisions = {
    CONFIRMED: "Disetujui",
    REJECTED: "Tidak valid",
    ADJUSTED: "Disesuaikan",
  };
  return (
    <PrintDocument title="Bukti Hasil Penilaian" student={student}>
      <h2>{s.rubricVersion.title}</h2>
      <div className="print-summary">
        <strong>Nilai akhir: {s.normalizedScore}/100</strong>
        <p>
          Diverifikasi oleh {s.review?.assessorName ?? "Asesor"} ·{" "}
          {dateLabel(s.completedAt)}
        </p>
        <p>
          Rubrik versi {s.rubricVersion.version} · Pengajuan {s.id}
        </p>
      </div>
      <h2>Rincian Penilaian dan Bukti</h2>
      {s.criteria.map((criterion, index) => {
        const item = s.review?.items.find(
          (i) => i.criterionId === criterion.id,
        );
        const evidence = s.analysis?.evidence.find(
          (i) => i.criterionId === criterion.id,
        );
        const time =
          evidence?.startMs != null
            ? `${Math.floor(evidence.startMs / 60000)
                .toString()
                .padStart(2, "0")}:${Math.floor((evidence.startMs / 1000) % 60)
                .toString()
                .padStart(2, "0")}`
            : "Tidak ada timestamp";
        return (
          <section
            className="print-result"
            key={criterion.id}
            data-allow-break={
              criterion.description.length +
                (evidence?.evidence.length ?? 0) +
                (item?.note?.length ?? 0) >
              1500
            }
          >
            <div className="print-result-heading">
              <h3>
                {index + 1}. {criterion.title}
              </h3>
              <strong>
                {item?.score ?? 0}/{criterion.maxScore}
              </strong>
            </div>
            <p className="print-meta">
              Keputusan asesor:{" "}
              {item ? decisions[item.decision] : "Belum dinilai"}
            </p>
            <h4>Indikator rubrik</h4>
            <p>{criterion.description}</p>
            {evidence && (
              <>
                <h4>Bukti AI · {time}</h4>
                <p>{evidence.evidence}</p>
              </>
            )}
            {item?.note && (
              <>
                <h4>Catatan asesor</h4>
                <p>{item.note}</p>
              </>
            )}
          </section>
        );
      })}
      <section className="print-result">
        <h2>Umpan Balik Asesor</h2>
        <p>{s.review?.feedback || "—"}</p>
      </section>
      <p className="print-meta">
        Bukti AI merupakan bantuan peninjauan. Skor dan keputusan akhir
        ditetapkan oleh asesor.
      </p>
    </PrintDocument>
  );
}
