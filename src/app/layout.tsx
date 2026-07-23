import type { Metadata } from "next";
import { Inter, Manrope, DM_Sans, Public_Sans } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { AppProviders } from "@/components/providers/AppProviders";

import ChatSticker from "@/components/ChatSticker";
import { cn } from "@/lib/utils";

const publicSansHeading = Public_Sans({subsets:['latin'],variable:'--font-heading'});

const dmSans = DM_Sans({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Smart LMS",
  description: "Plataforma de cursos online rápida e moderna",
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn(inter.variable, manrope.variable, "font-sans", dmSans.variable, publicSansHeading.variable)}>
      <body className="font-sans antialiased selection:bg-primary selection:text-primary-foreground bg-background text-foreground">
        <AppProviders>
          <NavBar />
            <main className="flex-grow w-full">
              {children}
            </main>
          <Footer />
          <ChatSticker />
        </AppProviders>
      </body>
    </html>
  );
}
