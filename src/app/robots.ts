import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

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
