"use client";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brand } from "@/modules/shared/brand";
import { api, errorMessage } from "@/lib/api-client";
import type { Envelope, Me, Role } from "@/modules/shared/types";
import { useMe, homeForMe } from "./session";

export function AuthPage({
  register = false,
  role = "STUDENT",
}: {
  register?: boolean;
  role?: Role;
}) {
  const [redirecting, setRedirecting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const client = useQueryClient();
  const me = useMe();
  const assessor = role === "ASSESSOR";
  const loginURL = assessor ? "/assessor/login" : "/login";
  const registerURL = assessor ? "/assessor/register" : "/register";
  useEffect(() => {
    if (me.data && me.isSuccess && !me.isFetching && !redirecting)
      router.replace(homeForMe(me.data));
  }, [me.data, me.isSuccess, me.isFetching, redirecting, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    const fields = Object.fromEntries(data.entries());
    try {
      await api(register ? "/api/v1/auth/register" : "/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(
          register
            ? { ...fields, intent: role }
            : { identifier: fields.identifier, password: fields.password },
        ),
      });
      setRedirecting(true);
      await client.cancelQueries();
      client.clear();
      const current = (await api<Envelope<Me>>("/api/v1/me")).data;
      client.setQueryData(["me"], current);
      router.replace(homeForMe(current));
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setRedirecting(false);
    } finally {
      setPending(false);
    }
  }
  function field(
    name: string,
    label: string,
    placeholder: string,
    extra: React.ComponentProps<typeof Input> = {},
  ) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {label}
          <span className="text-red-60" aria-hidden="true">
            *
          </span>
        </Label>
        <Input
          id={name}
          aria-label={label}
          name={name}
          placeholder={placeholder}
          required
          disabled={pending}
          {...extra}
        />
      </div>
    );
  }
  const title = register
    ? assessor
      ? "Pendaftaran Akun Asesor / Penguji UKK"
      : "Buat Akun Siswa Baru"
    : assessor
      ? "Masuk ke Akun Asesor / Guru"
      : "Masuk ke Akun Siswa";
  return (
    <main className="grid min-h-screen bg-neutral-10 lg:grid-cols-[45.45%_54.55%]">
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-primary-70 p-10 lg:flex">
        <div className="relative z-10">
          <Brand inverse />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-64 -left-56 size-[600px] -rotate-[20deg] opacity-20"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute size-96 rounded-[48px] border-t border-r border-primary-20"
              style={{ left: i * 64, top: i * 6 }}
            />
          ))}
        </div>
        <div className="relative z-10 max-w-xl space-y-4">
          <h2 className="text-h3 text-neutral-10">
            {assessor
              ? "Penilaian lebih cepat, keputusan tetap di tangan Anda."
              : "Keterampilanmu layak dibuktikan, bukan sekadar diklaim."}
          </h2>
          <p className="text-b7 text-primary-30">
            {assessor
              ? "AI menandai bukti keterampilan, Anda memverifikasi dan menetapkan nilai akhir."
              : "Setiap video praktik menjadi bukti kompetensi yang bisa dilacak dan dibagikan."}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-60 -bottom-64 size-[600px] rotate-[30deg] opacity-20"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute size-96 rounded-[48px] border-t border-r border-primary-20"
              style={{ left: i * 54, top: -i * 38 }}
            />
          ))}
        </div>
        <p className="relative z-10 text-b9 text-primary-30">
          © 2026 Proofolio
        </p>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between px-5 md:px-8">
          <div className="lg:invisible">
            <Brand />
          </div>
          <Button
            variant="link"
            size="sm"
            nativeButton={false}
            role="link"
            render={<Link href="/" />}
          >
            Ganti peran
          </Button>
        </header>
        <div className="flex flex-1 items-center justify-center px-5 pt-4 pb-12 md:px-8">
          <div
            className={`w-full space-y-8 ${register ? "max-w-lg" : "max-w-md"}`}
          >
            <div className="space-y-2">
              <h1 className="text-h5 md:text-h4">{title}</h1>
              <p className="text-b8 text-neutral-70">
                {register
                  ? assessor
                    ? "Daftarkan akun penguji Anda. Akses penilaian dibuka setelah disetujui administrator."
                    : "Lengkapi data diri Anda untuk mulai membangun portofolio kompetensi."
                  : assessor
                    ? "Masuk untuk meninjau submisi video praktik siswa dan mengelola rubrik."
                    : "Masuk untuk mengunggah video praktik dan memantau status penilaian Anda."}
              </p>
            </div>
            <form onSubmit={submit} className="space-y-5">
              {register && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    {field(
                      "name",
                      assessor ? "Nama lengkap & gelar" : "Nama lengkap",
                      "Masukkan nama lengkap",
                      { minLength: 2, maxLength: 120, autoComplete: "name" },
                    )}
                  </div>
                  {assessor
                    ? field(
                        "employeeId",
                        "NIP / ID Penguji",
                        "Masukkan NIP / ID penguji",
                        { minLength: 2, maxLength: 80 },
                      )
                    : field("nisn", "NISN", "10 digit NISN", {
                        pattern: "[0-9]{10}",
                        maxLength: 10,
                        inputMode: "numeric",
                      })}
                  {field(
                    "schoolName",
                    assessor ? "Asal Sekolah / Instansi" : "Asal Sekolah SMK",
                    "Nama sekolah / instansi",
                    { minLength: 2, maxLength: 180 },
                  )}
                  <div className="sm:col-span-2">
                    {field(
                      "programKeahlian",
                      assessor
                        ? "Mata Pelajaran / Program Keahlian"
                        : "Jurusan / Bidang Keahlian",
                      "Contoh: Teknik Komputer dan Jaringan",
                      { minLength: 2, maxLength: 180 },
                    )}
                  </div>
                  {!assessor && (
                    <div className="sm:col-span-2">
                      {field("phone", "Nomor telepon", "08xxxxxxxxxx", {
                        type: "tel",
                        autoComplete: "tel",
                        pattern: "(?:\\+62|62|0)8[1-9][0-9]{6,11}",
                      })}
                    </div>
                  )}
                </div>
              )}
              {register ? (
                field(
                  "email",
                  assessor ? "Email resmi" : "Email",
                  "nama@email.com",
                  { type: "email", autoComplete: "email" },
                )
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="identifier">
                    {assessor ? "Email / NIP" : "Email / Nomor telepon"}
                    <span className="text-red-60" aria-hidden="true">
                      *
                    </span>
                  </Label>
                  <div className="relative">
                    <Mail
                      aria-hidden="true"
                      className="pointer-events-none absolute top-4 left-5 z-10 size-4 text-neutral-60"
                    />
                    <Input
                      aria-label={
                        assessor ? "Email / NIP" : "Email / Nomor telepon"
                      }
                      id="identifier"
                      name="identifier"
                      className="pl-12 md:pl-12"
                      placeholder={
                        assessor
                          ? "nama@email.com atau NIP"
                          : "nama@email.com atau 08xx"
                      }
                      required
                      disabled={pending}
                      autoComplete="username"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Kata sandi
                  <span className="text-red-60" aria-hidden="true">
                    *
                  </span>
                </Label>
                <div className="relative">
                  <KeyRound
                    aria-hidden="true"
                    className="pointer-events-none absolute top-4 left-5 z-10 size-4 text-neutral-60"
                  />
                  <Input
                    aria-label="Kata sandi"
                    id="password"
                    name="password"
                    className="pl-12 md:pl-12"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    placeholder="Minimal 8 karakter"
                    disabled={pending}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                  />
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription role="alert">{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={pending || redirecting}
              >
                {pending || redirecting
                  ? "Memproses…"
                  : register
                    ? assessor
                      ? "Daftar Sebagai Asesor"
                      : "Buat Akun Siswa"
                    : assessor
                      ? "Masuk Portal Asesor"
                      : "Masuk"}
              </Button>
              <p className="text-center text-b8 text-neutral-70">
                {register ? "Sudah punya akun? " : "Belum punya akun? "}
                <Link
                  href={register ? loginURL : registerURL}
                  className="text-s8 text-primary-70 underline-offset-4 hover:underline"
                >
                  {register ? "Masuk di sini" : "Daftar di sini"}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
