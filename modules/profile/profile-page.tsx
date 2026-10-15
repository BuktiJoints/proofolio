"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfileIdentity } from "@/modules/shared/profile-identity";
import { useMe, profileComplete } from "@/modules/auth/session";
import { api, jsonBody } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { ErrorState, LoadingState, LinkButton } from "@/modules/shared/ui";
import type {
  Envelope,
  Me,
  RubricVersion,
  Submission,
} from "@/modules/shared/types";
function ProfileForm({ me }: { me: Me }) {
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(!profileComplete(me));
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (body: {
      name: string;
      schoolName: string;
      programKeahlian: string;
      nisn: string;
      phone: string;
      image: string | null;
      notificationStatusEnabled: boolean;
    }) => api("/api/v1/me/profile", { method: "PATCH", body: jsonBody(body) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["me"] });
      setSaved(true);
      setEditing(false);
      toast.success("Profil berhasil disimpan");
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate({
      name: String(form.get("name")).trim(),
      schoolName: String(form.get("schoolName")).trim(),
      programKeahlian: String(form.get("programKeahlian")).trim(),
      nisn: String(form.get("nisn")).trim(),
      phone: String(form.get("phone")).trim(),
      image: String(form.get("image")).trim() || null,
      notificationStatusEnabled: form.get("notificationStatusEnabled") === "on",
    });
  }
  return (
    <Card>
      <CardContent>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-h5">Profil Saya</h2>
          <Button
            type="button"
            variant="neutral"
            onClick={() => setEditing(true)}
          >
            Edit Profil
          </Button>
        </div>
        <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={me.user.email}
              readOnly
            />
          </div>
          {[
            {
              name: "name",
              label: "Nama lengkap",
              value: me.user.name,
              max: 120,
            },
            {
              name: "nisn",
              label: "NISN",
              value: me.profile?.nisn ?? "",
              max: 10,
              pattern: "[0-9]{10}",
            },
            {
              name: "phone",
              label: "Nomor telepon",
              value: me.profile?.phone ?? "",
              max: 20,
              pattern: "(?:\\+62|62|0)8[1-9][0-9]{6,11}",
            },
            {
              name: "schoolName",
              label: "Nama sekolah",
              value: me.profile?.schoolName ?? "",
              max: 180,
            },
            {
              name: "programKeahlian",
              label: "Program keahlian",
              value: me.profile?.programKeahlian ?? "",
              max: 180,
            },
            {
              name: "image",
              label: "URL foto profil (opsional)",
              value: me.user.image ?? "",
              max: 2048,
              type: "url",
              optional: true,
            },
          ].map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                disabled={!editing || save.isPending}
                name={field.name}
                defaultValue={field.value}
                required={!field.optional}
                minLength={field.optional ? undefined : 2}
                maxLength={field.max}
                pattern={field.pattern}
                type={field.type}
              />
            </div>
          ))}
          <div className="flex items-center gap-3 sm:col-span-2">
            <Checkbox
              id="notificationStatusEnabled"
              name="notificationStatusEnabled"
              disabled={!editing || save.isPending}
              defaultChecked={me.profile?.notificationStatusEnabled ?? true}
            />
            <Label htmlFor="notificationStatusEnabled">
              Aktifkan preferensi notifikasi status penilaian
            </Label>
          </div>
          {save.error && <ErrorState error={save.error} />}
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit" disabled={save.isPending || !editing}>
              {save.isPending ? "Menyimpan…" : "Simpan profil"}
            </Button>
            {saved && (
              <LinkButton href="/student/submissions/new" variant="outline">
                Mulai pengajuan
              </LinkButton>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
function PasswordForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword"));
    const newPassword = String(form.get("newPassword"));
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Password tidak dapat diubah");
      return;
    }
    formElement.reset();
    toast.success("Password berhasil diubah");
  }
  return (
    <Card>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <h2 className="text-lg font-semibold">Pengaturan akun</h2>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Password saat ini</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Password baru</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Mengubah…" : "Ubah password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
function PortfolioSummary() {
  const portfolio = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () =>
      (
        await api<
          Envelope<Array<{ submission: Submission; rubric: RubricVersion }>>
        >("/api/v1/portfolio")
      ).data,
  });
  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Ringkasan portofolio</h2>
          <p className="text-sm text-muted-foreground">
            {portfolio.data?.length ?? 0} video terverifikasi di portofolio.
          </p>
        </div>
        {portfolio.data?.slice(0, 3).map((item) => (
          <div
            key={item.submission.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <span className="font-medium">{item.rubric.title}</span>
            <span className="text-sm">
              {item.submission.normalizedScore} / 100
            </span>
          </div>
        ))}
        <LinkButton href="/student/portfolio" variant="outline">
          Lihat dan bagikan portofolio
        </LinkButton>
      </CardContent>
    </Card>
  );
}
export function ProfilePage() {
  const me = useMe();
  if (me.isPending) return <LoadingState />;
  if (me.error) return <ErrorState error={me.error} />;
  return (
    <>
      <ProfileIdentity me={me.data} />
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_1fr]">
        <ProfileForm me={me.data} />
        <div className="space-y-6">
          <PortfolioSummary />
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
