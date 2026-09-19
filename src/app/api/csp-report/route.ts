import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

type Violation = {
  directive: string;
  blocked: string;
  document: string;
};

function pickViolation(raw: Record<string, unknown>): Violation | null {
  // Formato antigo (`report-uri`): { "csp-report": {...} } com chaves kebab-case.
  // Formato novo (Reporting API): { type: "csp-violation", body: {...} } em camelCase.
  const body = (raw["csp-report"] ?? raw.body ?? raw) as Record<string, unknown>;
  const directive = body["effective-directive"] ?? body.effectiveDirective ?? body["violated-directive"];
  const blocked = body["blocked-uri"] ?? body.blockedURL;
  const document = body["document-uri"] ?? body.documentURL;
  if (typeof directive !== "string") return null;
  return {
    directive: directive.slice(0, 60),
    blocked: typeof blocked === "string" ? blocked.slice(0, 200) : "",
    // Só origem + caminho: a query pode carregar token de recuperação de senha.
    document: typeof document === "string" ? document.split(/[?#]/)[0].slice(0, 200) : "",
  };
}

/**
 * Recebe relatórios do `Content-Security-Policy-Report-Only` (next.config.ts)
 * e só registra no log da Vercel. Serve para descobrir o que ainda faltaria
 * liberar antes de trocar a política para modo de bloqueio.
 */
export async function POST(request: NextRequest) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  try {
    const parsed = JSON.parse(text) as unknown;
    const reports = Array.isArray(parsed) ? parsed : [parsed];
    for (const report of reports.slice(0, 10)) {
      if (!report || typeof report !== "object") continue;
      const violation = pickViolation(report as Record<string, unknown>);
      if (violation) console.warn("[csp-report]", JSON.stringify(violation));
    }
  } catch {
    // Relatório malformado: ignora sem erro, o navegador não reenvia.
  }

  return new NextResponse(null, { status: 204 });
}
