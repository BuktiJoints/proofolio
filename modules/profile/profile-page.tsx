"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProfileIdentity } from "@/modules/shared/profile-identity";
import { DesignIcon } from "@/modules/shared/design-icon";
import { useMe, profileComplete } from "@/modules/auth/session";
import { api, jsonBody, errorMessage } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { portfolioQueryOptions } from "@/modules/portfolio/queries";
import { ErrorState, LoadingState, LinkButton } from "@/modules/shared/ui";
import type { Me } from "@/modules/shared/types";
function ProfileForm({
  me,
  editing,
  onSaved,
}: {
  me: Me;
  editing: boolean;
  onSaved: () => void;
}) {
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (body: unknown) =>
      api("/api/v1/me/profile", { method: "PATCH", body: jsonBody(body) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["me"] });
      onSaved();
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
    });
  }
  const fields = [
    { name: "name", label: "Nama lengkap", value: me.user.name, max: 120 },
    {
      name: "email",
      label: "Email",
      value: me.user.email,
      max: 254,
      type: "email",
      permanentReadOnly: true,
    },
    {
      name: "nisn",
      label: "NISN",
      value: me.profile?.nisn ?? "",
      max: 10,
      pattern: "[0-9]{10}",
    },
    {
      name: "schoolName",
      label: "Nama sekolah",
      value: me.profile?.schoolName ?? "",
      max: 180,
    },
    {
      name: "phone",
      label: "Nomor telepon",
      value: me.profile?.phone ?? "",
      max: 20,
      pattern: "(?:\\+62|62|0)8[1-9][0-9]{6,11}",
    },
    {
      name: "programKeahlian",
      label: "Program keahlian",
      value: me.profile?.programKeahlian ?? "",
      max: 180,
    },
  ];
  return (
    <Card className="rounded-xl">
      <CardContent className="space-y-6">
        <h2 className="text-s6">Profil Saya</h2>
        <form
          key={String(editing)}
          onSubmit={submit}
          className="grid gap-5 sm:grid-cols-2"
        >
          {fields.map((f) => (
            <div key={f.name} className="space-y-2">
              <Label htmlFor={f.name}>
                {f.label}
                <span aria-hidden="true" className="text-red-60">
                  *
                </span>
              </Label>
              <Input
                id={f.name}
                aria-label={f.label}
                name={f.name}
                defaultValue={f.value}
                readOnly={!editing || f.permanentReadOnly}
                disabled={save.isPending}
                required
                minLength={2}
                maxLength={f.max}
                pattern={f.pattern}
                type={f.type}
                className="border border-neutral-50 read-only:cursor-default"
              />
            </div>
          ))}
          {editing ? (
            <>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-image">
                  URL foto profil (opsional)
                </Label>
                <Input
                  id="profile-image"
                  name="image"
                  type="url"
                  maxLength={2048}
                  defaultValue={me.user.image ?? ""}
                />
              </div>
              <Button type="submit" disabled={save.isPending} className="w-fit">
                {save.isPending ? "Menyimpan…" : "Simpan profil"}
              </Button>
            </>
          ) : (
            <input name="image" type="hidden" value={me.user.image ?? ""} />
          )}
          {save.error && <ErrorState error={save.error} />}
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
    const element = event.currentTarget;
    const form = new FormData(element);
    setError("");
    setPending(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: String(form.get("currentPassword")),
        newPassword: String(form.get("newPassword")),
        revokeOtherSessions: true,
      });
      if (result.error) {
        setError(result.error.message ?? "Password tidak dapat diubah");
        return;
      }
      element.reset();
      toast.success("Password berhasil diubah");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
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
      {error && (
        <p role="alert" className="text-b8 text-red-70">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Mengubah…" : "Simpan password"}
      </Button>
    </form>
  );
}
function AccountSettings({ me }: { me: Me }) {
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (change: {
      notificationStatusEnabled?: boolean;
      notificationResultEnabled?: boolean;
    }) =>
      api("/api/v1/me/profile", {
        method: "PATCH",
        body: jsonBody({
          name: me.user.name,
          schoolName: me.profile?.schoolName,
          programKeahlian: me.profile?.programKeahlian,
          ...change,
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["me"] });
      toast.success("Preferensi notifikasi disimpan");
    },
  });
  return (
    <Card className="rounded-xl">
      <CardContent className="space-y-5">
        <h2 className="text-s6">Pengaturan Akun</h2>
        <Dialog>
          <DialogTrigger
            render={<Button variant="outline" size="sm" className="w-full" />}
          >
            <DesignIcon name="key-blue" />
            Ubah Password
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ubah Password</DialogTitle>
              <DialogDescription>
                Gunakan password minimal 8 karakter.
              </DialogDescription>
            </DialogHeader>
            <PasswordForm />
          </DialogContent>
        </Dialog>
        <div className="space-y-3">
          <h3 className="text-s8">Notifikasi status penilaian</h3>
          {[
            {
              key: "notificationStatusEnabled",
              label: "Perubahan status pengajuan",
              value: me.profile?.notificationStatusEnabled ?? true,
            },
            {
              key: "notificationResultEnabled",
              label: "Hasil penilaian diterbitkan",
              value: me.profile?.notificationResultEnabled ?? true,
            },
          ].map((f) => (
            <div key={f.key} className="flex items-start gap-2">
              <Checkbox
                id={f.key}
                checked={f.value}
                disabled={
                  save.isPending ||
                  !me.profile?.schoolName ||
                  !me.profile?.programKeahlian
                }
                onCheckedChange={(checked) => save.mutate({ [f.key]: checked })}
              />
              <Label
                className="text-b8 font-normal text-neutral-90"
                htmlFor={f.key}
              >
                {f.label}
              </Label>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Checkbox id="email-notification" disabled checked={false} />
            <Label
              className="text-b8 font-normal text-neutral-70"
              htmlFor="email-notification"
            >
              Kirim juga melalui email
            </Label>
          </div>
          <p className="text-b10 text-neutral-60">
            Preferensi tersimpan. Pengiriman email belum tersedia.
          </p>
          {save.error && <ErrorState error={save.error} />}
        </div>
      </CardContent>
    </Card>
  );
}
function PortfolioSummary() {
  const portfolio = useQuery(portfolioQueryOptions);
  return (
    <Card className="rounded-xl">
      <CardContent className="space-y-5">
        <h2 className="text-s6">Ringkasan Portofolio</h2>
        {portfolio.isPending ? (
          <LoadingState />
        ) : portfolio.error ? (
          <ErrorState error={portfolio.error} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              [portfolio.data.length, "Video terverifikasi", "text-green-70"],
              [
                portfolio.data.reduce(
                  (sum, item) => sum + (item.verifiedCriterionCount ?? 0),
                  0,
                ),
                "Bukti kompetensi",
                "text-primary-70",
              ],
            ].map(([value, label, color]) => (
              <div
                key={String(label)}
                className="space-y-1 rounded-xl border border-neutral-30 p-4"
              >
                <p
                  data-testid={
                    label === "Video terverifikasi"
                      ? "profile-video-count"
                      : "profile-evidence-count"
                  }
                  className={`text-h4 ${color}`}
                >
                  {value}
                </p>
                <p className="text-b9 text-neutral-70">{label}</p>
              </div>
            ))}
          </div>
        )}
        <LinkButton
          href="/student/portfolio"
          className="w-full text-s8 md:text-s8"
        >
          <DesignIcon name="copy-white" />
          Buka Portofolio Digital
        </LinkButton>
      </CardContent>
    </Card>
  );
}
export function ProfilePage() {
  const me = useMe();
  const [editing, setEditing] = useState(false);
  if (me.isPending) return <LoadingState />;
  if (me.error) return <ErrorState error={me.error} />;
  const edit = editing || !profileComplete(me.data);
  return (
    <>
      <Card className="rounded-2xl ring-primary-20">
        <CardContent className="flex flex-wrap items-center justify-between gap-6 md:px-10">
          <ProfileIdentity me={me.data} showProgramBadge />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(!editing)}
          >
            <DesignIcon name="edit-blue" />
            {editing ? "Batal" : "Edit Profil"}
          </Button>
        </CardContent>
      </Card>
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <ProfileForm
          me={me.data}
          editing={edit}
          onSaved={() => setEditing(false)}
        />
        <div className="space-y-6">
          <PortfolioSummary />
          <AccountSettings me={me.data} />
        </div>
      </div>
    </>
  );
}
