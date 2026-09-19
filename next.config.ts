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
const isDev = process.env.NODE_ENV !== "production";

/**
 * Política completa em modo SÓ-RELATÓRIO: não bloqueia nada, só manda as
 * violações para /api/csp-report (aparecem no log da Vercel como
 * `[csp-report]`). Depois de alguns dias sem violação legítima, mova estas
 * diretivas para o header `Content-Security-Policy` para passar a bloquear.
 *
 * `'unsafe-inline'` em script-src é necessário enquanto o Next injetar
 * scripts inline sem nonce; ainda assim a política barra scripts de domínios
 * desconhecidos, que é o vetor de XSS com payload externo.
 */
const reportOnlyPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https://*.supabase.co https://*.pandavideo.com.br",
  [
    "connect-src 'self'",
    "https://*.supabase.co wss://*.supabase.co",
    "https://servicodados.ibge.gov.br",
    "https://openrouter.ai https://api.resend.com",
    "https://*.pandavideo.com.br",
    ...(isDev ? ["ws://localhost:*"] : []),
  ].join(" "),
  [
    "frame-src 'self'",
    "https://*.pandavideo.com.br",
    "https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  ].join(" "),
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "report-uri /api/csp-report",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "Content-Security-Policy-Report-Only", value: reportOnlyPolicy },
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
