import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({
  href = "/",
  inverse = false,
}: {
  href?: string;
  inverse?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="Proofolio beranda"
      className={cn(
        "inline-flex shrink-0 items-center gap-2 text-h6",
        inverse ? "text-neutral-10" : "text-primary-90",
      )}
    >
      <span className="relative flex size-8 items-center justify-center rounded-lg bg-primary-70">
        <Image src="/design/logo-check.svg" width={16} height={16} alt="" />
        {!inverse && (
          <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-neutral-10 bg-secondary-50" />
        )}
      </span>
      Proofolio
    </Link>
  );
}
