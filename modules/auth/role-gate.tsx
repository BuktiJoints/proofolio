"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMe, homeForRole, homeForMe, unauthenticated } from "./session";
import type { Role } from "@/modules/shared/types";
import { ErrorState, LoadingState } from "@/modules/shared/ui";
export function RoleGate({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const me = useMe();
  const router = useRouter();
  useEffect(() => {
    if (unauthenticated(me.error)) router.replace("/login");
    else if (
      me.data &&
      me.data.user.accessStatus &&
      me.data.user.accessStatus !== "ACTIVE"
    )
      router.replace("/assessor/pending");
    else if (
      me.data &&
      (me.data.user.role !== role ||
        (me.data.user.accessStatus && me.data.user.accessStatus !== "ACTIVE"))
    )
      router.replace(homeForRole(me.data.user.role));
  }, [me.error, me.data, role, router]);
  if (
    me.isPending ||
    unauthenticated(me.error) ||
    (me.data &&
      (me.data.user.role !== role ||
        (me.data.user.accessStatus && me.data.user.accessStatus !== "ACTIVE")))
  )
    return <LoadingState />;
  if (me.error)
    return <ErrorState error={me.error} retry={() => void me.refetch()} />;
  return children;
}
export function HomeRedirect() {
  const me = useMe();
  const router = useRouter();
  useEffect(() => {
    if (me.data) router.replace(homeForMe(me.data));
    else if (unauthenticated(me.error)) router.replace("/login");
  }, [me.data, me.error, router]);
  return (
    <main className="mx-auto w-full max-w-lg p-8">
      {me.error && !unauthenticated(me.error) ? (
        <ErrorState error={me.error} retry={() => void me.refetch()} />
      ) : (
        <LoadingState />
      )}
    </main>
  );
}
