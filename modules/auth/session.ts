"use client";
import { useQuery } from "@tanstack/react-query";
import { api, ClientApiError } from "@/lib/api-client";
import type { Envelope, Me, Role } from "@/modules/shared/types";
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api<Envelope<Me>>("/api/v1/me")).data,
    retry: false,
    staleTime: 0,
  });
}
export const homeForRole = (role: Role) =>
  role === "ASSESSOR" ? "/assessor/dashboard" : "/student/dashboard";
export const profileComplete = (me: Me) =>
  !!me.profile?.schoolName &&
  !!me.profile?.programKeahlian &&
  !!me.profile?.nisn &&
  !!me.profile?.phone;
export const unauthenticated = (error: unknown) =>
  error instanceof ClientApiError && error.status === 401;
