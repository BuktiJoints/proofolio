"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, LogOut, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { useMe } from "@/modules/auth/session";
import type { Role } from "./types";
import { cn } from "@/lib/utils";
export function AppShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const me = useMe();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const base = role === "STUDENT" ? "/student" : "/assessor";
  const links = [
    { href: `${base}/dashboard`, label: "Dashboard" },
    {
      href: `${base}/submissions`,
      label: role === "STUDENT" ? "Riwayat pengajuan" : "Pengajuan siswa",
    },
    { href: `${base}/rubrics`, label: "Rubrik kompetensi" },
    ...(role === "STUDENT"
      ? [
          { href: `${base}/portfolio`, label: "Portofolio" },
          { href: `${base}/profile`, label: "Profil saya" },
        ]
      : []),
  ];
  const navigation = (
    <nav aria-label="Navigasi utama" className="space-y-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => setOpen(false)}
          aria-current={
            pathname === link.href || pathname.startsWith(`${link.href}/`)
              ? "page"
              : undefined
          }
          className={cn(
            "block rounded-lg px-3 py-2 text-sm hover:bg-accent",
            (pathname === link.href || pathname.startsWith(`${link.href}/`)) &&
              "bg-accent font-medium",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
  async function logout() {
    setLoggingOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      await client.cancelQueries();
      client.clear();
      window.location.replace("/login");
    } catch {
      toast.error("Gagal keluar. Silakan coba lagi.");
      setLoggingOut(false);
    }
  }
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4"
      >
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background px-4 md:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Buka navigasi"
              />
            }
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>BuktiPraktik</SheetTitle>
            </SheetHeader>
            <div className="px-4">{navigation}</div>
          </SheetContent>
        </Sheet>
        <Link
          href={`${base}/dashboard`}
          className="flex items-center gap-2 font-semibold"
        >
          <GraduationCap className="size-6" />
          BuktiPraktik
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {me.data?.user.name} · {role === "STUDENT" ? "Siswa" : "Asesor"}
          </span>
          <Button variant="ghost" onClick={logout} disabled={loggingOut}>
            <LogOut />
            Keluar
          </Button>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-60 shrink-0 space-y-4 border-r p-5 md:block">
          <p className="px-3 text-xs font-medium text-muted-foreground">
            {role === "STUDENT" ? "RUANG SISWA" : "RUANG ASESOR"}
          </p>
          <Separator />
          {navigation}
        </aside>
        <main id="main-content" className="min-w-0 flex-1 space-y-6 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
