import type { Metadata } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "appearance")
    .maybeSingle();

  const appearance = (settings?.value as Record<string, unknown> | null) ?? {};
  const platformName = typeof appearance.platformName === "string" ? appearance.platformName : "Smart LMS";
  const slogan = typeof appearance.slogan === "string" ? appearance.slogan : "Aprendizagem humana para habilidades que transformam carreiras.";
  const faviconUrl = typeof appearance.faviconUrl === "string" ? appearance.faviconUrl : undefined;
  const ogImageUrl = typeof appearance.ogImageUrl === "string" ? appearance.ogImageUrl : undefined;

  return {
    title: {
      default: platformName,
      template: `%s | ${platformName}`,
    },
    description: slogan,
    icons: faviconUrl ? { icon: faviconUrl } : undefined,
    openGraph: ogImageUrl ? {
      title: platformName,
      description: slogan,
      images: [ogImageUrl],
    } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "appearance")
    .maybeSingle();

  const appearance = (settings?.value as Record<string, unknown> | null) ?? {};
  const primaryColor = typeof appearance.primaryColor === "string" ? appearance.primaryColor : "#3157B7";

  return (
    <html lang="pt-BR" className={cn(dmSans.variable, manrope.variable)}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          :root, .dark, [data-theme="dark"] {
            --accent: ${primaryColor};
            --accent-hover: color-mix(in srgb, ${primaryColor} 85%, black);
            --accent-soft: color-mix(in srgb, ${primaryColor} 15%, transparent);
            --accent-foreground: #ffffff;
            --primary: var(--accent);
            --primary-active: var(--accent-hover);
            --primary-pale: var(--accent-soft);
            --on-primary: var(--accent-foreground);
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
