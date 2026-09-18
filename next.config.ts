import type { NextConfig } from "next";

/**
 * Headers de segurança para todas as respostas.
 *
 * O CSP aqui cobre só diretivas que não dependem de allow-list de script,
 * estilo ou iframe (players Panda/YouTube, scripts inline do Next): impede o
 * site de ser embutido por terceiros (clickjacking), plugins, troca de
 * `<base>` e formulários postando para fora. Um `script-src` completo exige
 * observar violações antes de bloquear.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
