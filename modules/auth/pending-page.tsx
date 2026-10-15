"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, ShieldCheck } from "lucide-react";
import { Brand } from "@/modules/shared/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMe, homeForMe, unauthenticated } from "./session";
import { ErrorState, LoadingState } from "@/modules/shared/ui";
import { authClient } from "@/lib/auth-client";
export function PendingPage() {
  const me = useMe();
  const router = useRouter();
  useEffect(() => {
    if (unauthenticated(me.error)) router.replace("/assessor/login");
    else if (me.data && me.data.user.accessStatus === "ACTIVE")
      router.replace(homeForMe(me.data));
  }, [me.data, me.error, router]);
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 p-6">
      <Brand />
      {me.isPending ? (
        <LoadingState />
      ) : me.error ? (
        <ErrorState error={me.error} />
      ) : (
        <Card>
          <CardContent className="space-y-5 p-6">
            <Clock className="size-12 text-primary-70" />
            <h1 className="text-h4">
              {me.data.user.accessStatus === "REJECTED"
                ? "Permohonan belum disetujui"
                : "Menunggu persetujuan admin"}
            </h1>
            <p className="text-b7 text-neutral-70">
              Terima kasih, {me.data.user.name}. Permohonan akun asesor Anda
              sudah diterima. Akses penilaian siswa tersedia setelah
              administrator memverifikasi identitas dan instansi Anda.
            </p>
            <p className="flex items-center gap-2 text-b8">
              <ShieldCheck className="size-5 text-primary-70" />
              Akses data siswa masih terkunci.
            </p>
            <Button onClick={() => void me.refetch()}>Periksa status</Button>
            <Button
              variant="link"
              onClick={async () => {
                await authClient.signOut();
                window.location.replace("/");
              }}
            >
              Keluar
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
