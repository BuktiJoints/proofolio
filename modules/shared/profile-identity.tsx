import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { Me } from "./types";
export function ProfileIdentity({
  me,
  showProgramBadge = false,
}: {
  me: Me;
  showProgramBadge?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <span className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary-30 text-h5 text-secondary-90">
        {me.user.image ? (
          <Image
            src={me.user.image}
            alt={me.user.name}
            width={96}
            height={96}
            className="size-full object-cover"
            unoptimized
          />
        ) : (
          me.user.name
            .split(" ")
            .slice(0, 2)
            .map((x) => x[0])
            .join("")
        )}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="break-words text-h5 md:text-h4">{me.user.name}</h1>
        <p className="text-b8 text-neutral-70">
          {[
            me.profile?.schoolName,
            me.profile?.programKeahlian,
            me.profile?.nisn ? `NISN ${me.profile.nisn}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {showProgramBadge && me.profile?.programKeahlian && (
          <Badge className="border-0 bg-primary-10 text-primary-70">
            {me.profile.programKeahlian}
          </Badge>
        )}
      </div>
    </div>
  );
}
