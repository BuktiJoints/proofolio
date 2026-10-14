import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { GeistSans } from "geist/font/sans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "BuktiPraktik",
  description: "Bukti kompetensi praktik siswa yang terverifikasi asesor",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={cn(
        "h-full antialiased",
        GeistSans.className,
        GeistSans.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
