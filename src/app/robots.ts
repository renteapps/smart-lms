import type { MetadataRoute } from "next";

function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://smartlms.com.br");
  return configured.replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/cursos",
          "/courses/",
          "/blog",
          "/blog/",
          "/pagina/",
          "/termos",
          "/privacidade",
        ],
        disallow: [
          "/admin/",
          "/api/",
          "/auth/",
          "/empresa/",
          "/minha-trilha",
          "/notas",
          "/onboarding",
          "/perfil",
          "/certificados/",
          "/completar-cadastro",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
