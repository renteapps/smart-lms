import type { Metadata } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Smart LMS",
  description: "Aprendizagem humana para habilidades que transformam carreiras.",
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn(dmSans.variable, manrope.variable)}>
      <body>{children}</body>
    </html>
  );
}
