"use client";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";
import { api, errorMessage } from "@/lib/api-client";
import type { Envelope, Me } from "@/modules/shared/types";
import { useMe, homeForRole } from "./session";
export function AuthPage({ register = false }: { register?: boolean }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState(""); const router = useRouter(); const client = useQueryClient(); const me = useMe();
  useEffect(() => { if (me.data) router.replace(homeForRole(me.data.user.role)); }, [me.data, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const data = new FormData(event.currentTarget); const email = String(data.get("email")).trim(); const password = String(data.get("password"));
    try {
      const result = register ? await authClient.signUp.email({ name: String(data.get("name")).trim(), email, password }) : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(register ? "Pendaftaran belum berhasil. Periksa data atau gunakan email lain." : "Email atau kata sandi tidak sesuai."); return;
      }
      await client.cancelQueries(); client.clear();
      const current = (await api<Envelope<Me>>("/api/v1/me")).data;
      client.setQueryData(["me"], current);
      router.replace(register ? "/student/profile" : homeForRole(current.user.role)); router.refresh();
    } catch (err) { setError(errorMessage(err)); }
    finally { setPending(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader><p className="mb-2 font-semibold">BuktiPraktik</p><CardTitle className="text-xl">{register ? "Daftar sebagai siswa" : "Masuk ke akun"}</CardTitle><CardDescription>{register ? "Dokumentasikan praktik dan bangun portofolio keterampilan." : "Siswa dan asesor masuk melalui halaman yang sama."}</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-4">{register && <div className="space-y-2"><Label htmlFor="name">Nama lengkap</Label><Input id="name" name="name" required minLength={2} maxLength={120} autoComplete="name"/></div>}<div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email"/></div><div className="space-y-2"><Label htmlFor="password">Kata sandi</Label><Input id="password" name="password" type="password" required minLength={8} maxLength={128} autoComplete={register ? "new-password" : "current-password"}/>{register && <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>}</div>{error && <Alert variant="destructive"><AlertDescription role="alert">{error}</AlertDescription></Alert>}<Button type="submit" className="w-full" disabled={pending}>{pending ? "Memproses…" : register ? "Daftar" : "Masuk"}</Button></form></CardContent><CardFooter className="justify-center text-sm"><Link href={register ? "/login" : "/register"} className="underline underline-offset-4">{register ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar siswa"}</Link></CardFooter></Card></main>;
}
