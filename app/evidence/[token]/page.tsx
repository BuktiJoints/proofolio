import { EvidencePage } from "@/modules/evidence/evidence-page";
export const metadata = {
  title: "Bukti keterampilan — BuktiPraktik",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <EvidencePage token={token} />;
}
