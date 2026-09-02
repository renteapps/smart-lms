import type { Metadata } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import "./globals.css";
import { cn, getContrastForeground } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppearanceConfig } from "@/lib/data/appearance";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { Toaster } from "sonner";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createAdminClient();
  const appearance = await getAppearanceConfig(supabase);

  return {
    title: {
      default: appearance.platformName,
      template: `%s | ${appearance.platformName}`,
    },
    description: appearance.slogan,
    icons: appearance.faviconUrl
      ? {
          icon: appearance.faviconUrl,
          shortcut: appearance.faviconUrl,
          apple: appearance.faviconUrl,
        }
      : undefined,
    openGraph: appearance.ogImageUrl
      ? {
          title: appearance.platformName,
          description: appearance.slogan,
          images: [appearance.ogImageUrl],
        }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createAdminClient();
  const appearance = await getAppearanceConfig(supabase);
  const primaryColor = appearance.primaryColor || "#3157B7";
  const accentForeground = getContrastForeground(primaryColor);

  return (
    <html lang="pt-BR" className={cn(dmSans.variable, manrope.variable)}>
      <head>
        {appearance.faviconUrl && (
          <>
            <link rel="icon" href={appearance.faviconUrl} sizes="any" />
            <link rel="apple-touch-icon" href={appearance.faviconUrl} />
          </>
        )}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          :root, .dark, [data-theme="dark"] {
            --accent: ${primaryColor};
            --accent-hover: color-mix(in srgb, ${primaryColor} 85%, black);
            --accent-soft: color-mix(in srgb, ${primaryColor} 15%, transparent);
            --accent-foreground: ${accentForeground};
            --primary: var(--accent);
            --primary-active: var(--accent-hover);
            --primary-pale: var(--accent-soft);
            --on-primary: var(--accent-foreground);
            --primary-foreground: var(--accent-foreground);
          }
        `,
          }}
        />
      </head>
      <body>
        <AppearanceProvider value={appearance}>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </AppearanceProvider>
      </body>
    </html>
  );
}
