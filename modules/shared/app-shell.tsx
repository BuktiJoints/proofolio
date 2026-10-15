"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, LogOut, Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useMe } from "@/modules/auth/session";
import { Brand } from "./brand";
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
  const student = role === "STUDENT";
  const base = student ? "/student" : "/assessor";
  const links = student
    ? [
        ["dashboard", "Beranda"],
        ["rubrics", "Praktik"],
        ["portfolio", "Portofolio"],
        ["submissions", "Riwayat"],
        ["profile", "Profil"],
      ]
    : [
        ["dashboard", "Beranda"],
        ["rubrics", "Modul UKK"],
        ["submissions", "Penilaian"],
        ["history", "Riwayat"],
      ];
  const initials =
    me.data?.user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0])
      .join("") ?? "";
  const navigation = (
    <nav
      aria-label="Navigasi utama"
      className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-7"
    >
      {links.map(([path, label]) => {
        const href = `${base}/${path}`;
        const active =
          pathname === href ||
          pathname.startsWith(`${href}/`) ||
          (path === "rubrics" && pathname === "/student/submissions/new");
        return (
          <Link
            key={path}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-2 py-3 text-b8 transition-colors hover:text-primary-70",
              active ? "text-s8 text-primary-70" : "text-neutral-70",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
  async function logout() {
    setLoggingOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      await client.cancelQueries();
      client.clear();
      window.location.replace("/");
    } catch {
      toast.error("Gagal keluar. Silakan coba lagi.");
      setLoggingOut(false);
    }
  }
  return (
    <div className="min-h-screen bg-neutral-10">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4"
      >
        Lewati ke konten
      </a>
      <header
        data-app-header
        className="sticky top-0 z-20 border-b border-neutral-30 bg-neutral-10/90 backdrop-blur-md"
      >
        <div className="mx-auto flex h-[83px] max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="link"
                    size="icon-sm"
                    className="lg:hidden"
                    aria-label="Buka navigasi"
                  />
                }
              >
                <Menu />
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Navigasi Proofolio</SheetTitle>
                </SheetHeader>
                <div className="px-4">{navigation}</div>
              </SheetContent>
            </Sheet>
            <Brand href={`${base}/dashboard`} />
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {student ? "Siswa" : "Asesor"}
            </Badge>
          </div>
          <div className="hidden lg:block">{navigation}</div>
          <div className="flex shrink-0 items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="link"
                    size="icon-sm"
                    aria-label="Informasi notifikasi"
                  />
                }
              >
                <Bell className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 p-4">
                <p className="text-s8">Status penilaian</p>
                <p className="mt-2 text-b9 text-muted-foreground">
                  Status terbaru tersedia di halaman{" "}
                  {student ? "riwayat" : "penilaian"}. Pengiriman email belum
                  diaktifkan.
                </p>
                <DropdownMenuItem
                  render={<Link href={`${base}/submissions`} />}
                >
                  Lihat pengajuan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href={student ? "/student/profile" : "/assessor/dashboard"}
              aria-label={student ? "Profil saya" : "Dashboard asesor"}
              className="flex size-9 items-center justify-center rounded-full bg-secondary-30 text-s9 text-secondary-80"
            >
              {initials}
            </Link>
            <Button
              variant="link"
              size="icon-sm"
              onClick={logout}
              disabled={loggingOut}
              aria-label="Keluar"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-10"
      >
        {children}
      </main>
    </div>
  );
}
