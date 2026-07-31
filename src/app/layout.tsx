import type { Metadata } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";
import { RouteShell } from "@/components/RouteShell";

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
      <body>
        <AppProviders>
          <RouteShell>{children}</RouteShell>
        </AppProviders>
      </body>
    </html>
  );
}
