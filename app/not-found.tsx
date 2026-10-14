import { EmptyState, LinkButton } from "@/modules/shared/ui";
export default function NotFound() { return <main className="mx-auto max-w-xl p-8"><EmptyState title="Halaman tidak ditemukan" description="Periksa alamat atau kembali ke dashboard." action={<LinkButton href="/">Kembali</LinkButton>}/></main>; }
