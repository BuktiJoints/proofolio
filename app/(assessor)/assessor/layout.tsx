import { RoleGate } from "@/modules/auth/role-gate";
import { AppShell } from "@/modules/shared/app-shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate role="ASSESSOR">
      <AppShell role="ASSESSOR">{children}</AppShell>
    </RoleGate>
  );
}
