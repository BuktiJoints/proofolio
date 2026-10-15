"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Info, TriangleAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription, AlertAction } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toggle } from "@/components/ui/toggle";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { palettes, typography } from "./tokens";

const buttonVariants = ["default", "ghost", "secondary", "secondary-ghost", "destructive", "destructive-ghost", "neutral", "link"] as const;
const badgeVariants = ["default", "secondary", "success", "warning", "destructive", "info", "outline"] as const;

export function DesignSystemPage() {
  const [showAlert, setShowAlert] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <main className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 md:px-8 md:py-12">
      <header className="space-y-3">
        <Badge variant="outline">SkillFolio · Design system</Badge>
        <h1 className="text-h5 md:text-h3">Fondasi dan komponen UI</h1>
        <p className="max-w-2xl text-b8 text-muted-foreground md:text-b7">Pratinjau komponen shadcn dengan warna, typography, dan interaksi dari desain SkillFolio.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Tombol</CardTitle><CardDescription>Coba hover, klik, dan fokus menggunakan tombol Tab.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {buttonVariants.map((variant) => <Button key={variant} variant={variant} data-testid={`button-${variant}`}><UserRound aria-hidden="true" />{variant === "default" ? "Primary" : variant}</Button>)}
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Profil"><UserRound /></Button>
        </CardContent>
      </Card>

      <section className="grid items-start gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Field input</CardTitle><CardDescription>Label, placeholder, disabled, dan validasi.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <Field><FieldLabel htmlFor="ds-name">Nama lengkap</FieldLabel><Input id="ds-name" placeholder="Masukkan nama lengkap" /></Field>
            <Field><FieldLabel htmlFor="ds-filled">Sekolah</FieldLabel><Input id="ds-filled" defaultValue="SMK Negeri 1" /></Field>
            <Field data-disabled="true"><FieldLabel htmlFor="ds-disabled">Field nonaktif</FieldLabel><Input id="ds-disabled" placeholder="Tidak dapat diubah" disabled /></Field>
            <Field data-invalid="true"><FieldLabel htmlFor="ds-error">NISN</FieldLabel><Input id="ds-error" defaultValue="123" aria-invalid="true" aria-describedby="ds-error-message" /><FieldError id="ds-error-message">NISN harus terdiri dari 10 digit.</FieldError></Field>
            <Field><FieldLabel htmlFor="ds-feedback">Feedback</FieldLabel><Textarea id="ds-feedback" placeholder="Tuliskan feedback untuk siswa" /><FieldDescription>Berikan catatan yang jelas dan dapat ditindaklanjuti.</FieldDescription></Field>
            <Field><FieldLabel htmlFor="ds-video">Video praktik</FieldLabel><FileUpload id="ds-video" accept="video/*" aria-describedby="ds-video-hint" /><FieldDescription id="ds-video-hint">Pilih video dari perangkat untuk melihat state file terpilih.</FieldDescription></Field>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Pilihan dan chips</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <Field><FieldLabel htmlFor="ds-select">Rubrik</FieldLabel><Select items={[{ value: "teaching", label: "Keterampilan mengajar" }, { value: "safety", label: "Keselamatan kerja" }]}><SelectTrigger id="ds-select"><SelectValue placeholder="Pilih rubrik" /></SelectTrigger><SelectContent><SelectItem value="teaching">Keterampilan mengajar</SelectItem><SelectItem value="safety">Keselamatan kerja</SelectItem></SelectContent></Select></Field>
              <div className="flex flex-wrap gap-5"><Label htmlFor="ds-checkbox"><Checkbox id="ds-checkbox" />Notifikasi status</Label><Label htmlFor="ds-checkbox-disabled"><Checkbox id="ds-checkbox-disabled" disabled />Nonaktif</Label></div>
              <RadioGroup defaultValue="student" aria-label="Peran pengguna"><Label htmlFor="ds-student"><RadioGroupItem id="ds-student" value="student" />Siswa</Label><Label htmlFor="ds-assessor"><RadioGroupItem id="ds-assessor" value="assessor" />Asesor</Label></RadioGroup>
              <div className="flex flex-wrap gap-3"><Toggle aria-label="Video" >Video</Toggle><Toggle variant="secondary" aria-label="Portofolio">Portofolio</Toggle></div>
              <div className="flex flex-wrap gap-2">{badgeVariants.map((variant) => <Badge key={variant} variant={variant}>{variant}</Badge>)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Alert</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive"><AlertCircle aria-hidden="true" /><AlertTitle>Error</AlertTitle><AlertDescription>Video gagal diproses. Silakan coba lagi.</AlertDescription></Alert>
              <Alert variant="warning"><TriangleAlert aria-hidden="true" /><AlertTitle>Warning</AlertTitle><AlertDescription>Lengkapi profil sebelum mengunggah video.</AlertDescription></Alert>
              <Alert variant="success"><CheckCircle aria-hidden="true" /><AlertTitle>Success</AlertTitle><AlertDescription>Penilaian berhasil disimpan.</AlertDescription></Alert>
              {showAlert && <Alert variant="info"><Info aria-hidden="true" /><AlertTitle>Info</AlertTitle><AlertDescription>Nilai akhir ditentukan oleh asesor.</AlertDescription><AlertAction><Button size="icon-xs" variant="link" aria-label="Tutup informasi" onClick={() => setShowAlert(false)}>×</Button></AlertAction></Alert>}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader><CardTitle>Navigasi dan overlay</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-4">
            <DropdownMenu><DropdownMenuTrigger render={<Button variant="neutral" />}>Buka menu</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => toast.info("Profil dipilih")}>Profil</DropdownMenuItem><DropdownMenuItem disabled>Opsi nonaktif</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            <Sheet><SheetTrigger render={<Button variant="outline" />}>Buka panel</SheetTrigger><SheetContent><SheetHeader><SheetTitle>Detail penilaian</SheetTitle><SheetDescription>Contoh panel samping shadcn.</SheetDescription></SheetHeader><p className="px-4 text-b8">Tutup panel dengan tombol tutup atau Escape.</p></SheetContent></Sheet>
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}><AlertDialogTrigger render={<Button />}>Buka konfirmasi</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Simpan penilaian?</AlertDialogTitle><AlertDialogDescription>Ini hanya contoh interaksi komponen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => { setDialogOpen(false); setConfirmed(true); toast.success("Penilaian contoh disimpan"); }}>Simpan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            <Button variant="secondary" onClick={() => toast.success("Perubahan tersimpan", { description: "Contoh notifikasi sukses." })}>Tampilkan toast</Button>
          </div>
          {confirmed && <p role="status" className="text-b8 text-green-80">Penilaian contoh disimpan.</p>}
          <Tabs defaultValue="summary"><TabsList><TabsTrigger value="summary">Ringkasan</TabsTrigger><TabsTrigger value="history">Riwayat</TabsTrigger></TabsList><TabsContent value="summary" className="py-3">Ringkasan hasil praktik.</TabsContent><TabsContent value="history" className="py-3">Riwayat penilaian praktik.</TabsContent></Tabs>
          <Accordion><AccordionItem value="ai"><AccordionTrigger>Bagaimana AI membantu penilaian?</AccordionTrigger><AccordionContent>AI menemukan calon bukti dari video. Asesor memverifikasi bukti dan menentukan nilai akhir.</AccordionContent></AccordionItem></Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tabel dan loading</CardTitle><CardDescription>Komponen pendukung mengikuti token yang sama.</CardDescription></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Praktik</TableHead><TableHead>Status</TableHead><TableHead>Nilai</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Keterampilan mengajar</TableCell><TableCell><Badge variant="success">Selesai</Badge></TableCell><TableCell>88</TableCell></TableRow><TableRow><TableCell>Keselamatan kerja</TableCell><TableCell><Badge variant="info">Menunggu asesor</Badge></TableCell><TableCell>—</TableCell></TableRow></TableBody></Table>
          <Separator className="my-6" />
          <div className="space-y-3" role="status" aria-label="Contoh loading"><Skeleton className="h-5 w-40" /><Skeleton className="h-20 w-full" /><span className="sr-only">Memuat…</span></div>
        </CardContent>
        <CardFooter><p className="text-b9 text-muted-foreground">Data di halaman ini hanya contoh tampilan.</p></CardFooter>
      </Card>

      <Card>
        <CardHeader><CardTitle>Warna</CardTitle><CardDescription>Tujuh palet, masing-masing tingkat 10–100.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(palettes).map(([name, classes]) => <div key={name} className="space-y-2"><h2 className="text-s7 capitalize">{name}</h2><div className="grid grid-cols-5 gap-2 md:grid-cols-10">{classes.map((className, i) => <div key={className}><div data-testid={className} className={`${className} h-14 rounded-lg border border-neutral-40`} /><p className="mt-1 text-center text-b9">{(i + 1) * 10}</p></div>)}</div></div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Typography</CardTitle><CardDescription>Sora Bold untuk heading; Poppins SemiBold dan Regular untuk subheading dan body.</CardDescription></CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-3">
          {Object.entries(typography).map(([family, classes]) => <div key={family} className="min-w-0 space-y-5"><h2 className="text-s7">{family === "h" ? "Heading" : family === "s" ? "Subheading" : "Body"}</h2>{classes.map((className) => <div key={className} className="flex flex-wrap items-baseline justify-between gap-2"><span className={className} data-testid={className}>Aa</span><code className="text-b9 text-muted-foreground">{className}</code></div>)}</div>)}
        </CardContent>
      </Card>
    </main>
  );
}
