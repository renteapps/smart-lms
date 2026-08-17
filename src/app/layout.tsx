import type { Metadata } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";
import { RouteShell } from "@/components/RouteShell";
import { getSessionUser } from "@/lib/supabase/auth";
import { getAgents } from "@/lib/data/agents";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Smart LMS",
  description: "Aprendizagem humana para habilidades que transformam carreiras.",
};



export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // O catálogo de agentes é global (navbar, vitrine e chat), então é lido uma
  // vez aqui em vez de em cada rota que o consome.
  const { supabase } = await getSessionUser();
  const agents = await getAgents(supabase);

  return (
    <html lang="pt-BR" className={cn(dmSans.variable, manrope.variable)}>
      <body>
        <AppProviders agents={agents}>
          <RouteShell>{children}</RouteShell>
        </AppProviders>
      </body>
    </html>
  );
}
