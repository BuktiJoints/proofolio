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
      <Image
        src="/design/proofolio-mark.svg"
        width={44}
        height={32.44}
        alt=""
        className={inverse ? "rounded bg-white p-0.5" : undefined}
      />
      <span>
        <span className={inverse ? "text-white" : "text-primary-70"}>Proo</span>
        <span className={inverse ? "text-secondary-30" : "text-secondary-50"}>
          folio
        </span>
      </span>
    </Link>
  );
}
