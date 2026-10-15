import Image from "next/image";
import type { Me } from "./types";
export function ProfileIdentity({ me }: { me: Me }) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary-30 text-h6 text-secondary-80">
        {me.user.image ? (
          <Image
            src={me.user.image}
            alt={me.user.name}
            width={64}
            height={64}
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
      <div className="space-y-1">
        <h1 className="text-h5">{me.user.name}</h1>
        <p className="text-b8 text-neutral-70">
          {[
            me.profile?.schoolName,
            me.profile?.programKeahlian,
            me.profile?.nisn ? `NISN ${me.profile.nisn}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>
  );
}
