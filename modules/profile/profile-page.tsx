"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMe } from "@/modules/auth/session";
import { api, jsonBody } from "@/lib/api-client";
import {
  ErrorState,
  LoadingState,
  PageHeading,
  LinkButton,
} from "@/modules/shared/ui";
import type { Me } from "@/modules/shared/types";
function ProfileForm({ me }: { me: Me }) {
  const [saved, setSaved] = useState(false);
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (body: {
      name: string;
      schoolName: string;
      programKeahlian: string;
    }) => api("/api/v1/me/profile", { method: "PATCH", body: jsonBody(body) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["me"] });
      setSaved(true);
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
    });
  }
  return (
    <Card className="max-w-2xl">
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          {[
            {
              name: "name",
              label: "Nama lengkap",
              value: me.user.name,
              max: 120,
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
          ].map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                defaultValue={field.value}
                required
                minLength={2}
                maxLength={field.max}
              />
            </div>
          ))}
          {save.error && <ErrorState error={save.error} />}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={save.isPending}>
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
export function ProfilePage() {
  const me = useMe();
  if (me.isPending) return <LoadingState />;
  if (me.error) return <ErrorState error={me.error} />;
  return (
    <>
      <PageHeading
        title="Profil saya"
        description="Lengkapi nama, sekolah, dan program keahlian sebelum mengunggah video."
      />
      <ProfileForm me={me.data} />
    </>
  );
}
