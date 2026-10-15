import { PublicPortfolioPage } from "@/modules/portfolio/public-portfolio-page";
export const metadata = {
  title: "Portofolio Kompetensi · Proofolio",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  return <PublicPortfolioPage token={token} />;
}
