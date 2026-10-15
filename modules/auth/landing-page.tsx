import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brand } from "@/modules/shared/brand";

const steps = [
  [
    "upload",
    "Unggah praktik",
    "Rekam demonstrasi keterampilan sesuai rubrik UKK.",
  ],
  [
    "sparkles",
    "Analisis AI",
    "AI menandai bukti keterampilan lengkap dengan timestamp.",
  ],
  [
    "verified",
    "Verifikasi asesor",
    "Keputusan akhir tetap di tangan guru atau asesor.",
  ],
  [
    "portfolio",
    "Portofolio terbukti",
    "Bagikan bukti kompetensi ke calon pemberi kerja.",
  ],
];
export function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-10">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
        <Brand />
        <p className="hidden text-b9 text-neutral-70 sm:block">
          Platform Verifikasi Kompetensi SMK
        </p>
      </header>
      <main>
        <section className="border-y border-primary-20 md:min-h-[688px]">
          <div className="mx-auto max-w-7xl space-y-12 px-5 py-12 md:px-8 md:py-20">
            <div className="space-y-4">
              <h1 className="max-w-5xl text-h4 text-primary-100 md:text-h2">
                Selamat Datang di Platform Verifikasi Kompetensi SMK
              </h1>
              <p className="text-b7 text-neutral-80 md:text-b6">
                Pilih peran Anda untuk melanjutkan ke platform verifikasi
                keterampilan berbasis AI.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {[false, true].map((assessor) => (
                <Card
                  key={String(assessor)}
                  className={`relative overflow-hidden rounded-2xl border p-8 shadow-none ring-0 transition-shadow duration-200 hover:shadow-[0_24px_48px_-24px_var(--color-primary-40)] ${assessor ? "border-primary-90 bg-primary-90 text-neutral-10" : "border-primary-20"}`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute -top-10 -right-10 size-40 rounded-full border-[17px] ${assessor ? "border-primary-80" : "border-primary-10"}`}
                  />
                  <CardContent className="relative space-y-6 p-0">
                    <span
                      className={`flex size-14 items-center justify-center rounded-xl ${assessor ? "bg-secondary-50" : "bg-primary-70"}`}
                    >
                      <Image
                        src={`/design/${assessor ? "assessor" : "student"}.svg`}
                        width={28}
                        height={28}
                        alt=""
                      />
                    </span>
                    <div className="space-y-2">
                      <h2 className="text-h5 md:text-h4">
                        {assessor
                          ? "Masuk sebagai Asesor / Guru"
                          : "Masuk sebagai Siswa"}
                      </h2>
                      <p
                        className={`text-b7 ${assessor ? "text-primary-30" : "text-neutral-70"}`}
                      >
                        {assessor
                          ? "Tinjau video praktik siswa, verifikasi bukti AI Gemini, dan kelola rubrik UKK digital."
                          : "Unggah video praktik, dapatkan hasil analisis AI, dan bangun portofolio digital berbasis bukti."}
                      </p>
                    </div>
                    <Button
                      nativeButton={false}
                      role="link"
                      render={
                        <Link href={assessor ? "/assessor/login" : "/login"} />
                      }
                      variant={assessor ? "neutral" : "default"}
                      className="text-s8 md:text-s8"
                    >
                      {assessor
                        ? "Masuk Portal Asesor"
                        : "Masuk / Daftar Siswa"}
                      <Image
                        src={`/design/${assessor ? "assessor" : "student"}-arrow.svg`}
                        width={16}
                        height={16}
                        alt=""
                      />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl space-y-6 px-5 py-16 md:px-8">
          <h2 className="text-h5">Dari praktik menjadi bukti kompetensi</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([icon, title, description], i) => (
              <Card
                key={icon}
                className="gap-3 border border-neutral-30 p-5 shadow-none ring-0"
              >
                <div className="flex items-center justify-between">
                  <Image
                    src={`/design/${icon}.svg`}
                    width={24}
                    height={24}
                    alt=""
                  />
                  <span className="text-h7 text-primary-30">0{i + 1}</span>
                </div>
                <h3 className="text-s7">{title}</h3>
                <p className="text-b8 text-neutral-70">{description}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-neutral-30 p-6 text-center text-b9 text-neutral-60">
        © 2026 Proofolio · Platform bukti kompetensi siswa
      </footer>
    </div>
  );
}
