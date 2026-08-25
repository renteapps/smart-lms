import { NextRequest, NextResponse } from "next/server";

import { handleBillingWebhook } from "@/lib/billing/handleWebhook";
import { normalizeHotmartEvent } from "@/lib/billing/hotmart";
import { verifyHotmartRequest } from "@/lib/billing/signature";

/**
 * Receptor do webhook da Hotmart.
 *
 * A tela de integração já divulgava esta URL (`/api/webhooks/hotmart`) para
 * colar no painel da Hotmart, mas a rota não existia — quem seguisse a
 * instrução apontava o webhook para um 404 e perdia toda venda em silêncio.
 *
 * Espelha a rota da Eduzz: a diferença entre os dois gateways é só como se
 * autentica a requisição e como se lê o payload. Todo o resto — lease do
 * evento, deduplicação, provisionamento e auditoria — é `handleBillingWebhook`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 1_048_576;

export async function POST(req: NextRequest) {
  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Corpo excede o limite permitido." }, { status: 413 });
  }

  const rawBytes = Buffer.from(await req.arrayBuffer());
  if (rawBytes.byteLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Corpo excede o limite permitido." }, { status: 413 });
  }
  const rawBody = rawBytes.toString("utf8");

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  /*
   * A Hotmart autentica de dois jeitos, dependendo de quando a credencial da
   * conta foi gerada: `x-hotmart-hottok` é um token fixo comparado por
   * igualdade; `x-hotmart-signature` é HMAC-SHA256 do corpo. Os dois são
   * aceitos e qualquer um que confira basta — sem segredo cadastrado, nenhum
   * confere e a requisição é recusada.
   */
  const hottokHeader = req.headers.get("x-hotmart-hottok");
  const signatureHeader = req.headers.get("x-hotmart-signature");

  const { status, body } = await handleBillingWebhook({
    gateway: "hotmart",
    rawBody,
    clientIp,
    verifySignature: (secrets) =>
      verifyHotmartRequest({ rawBody, hottokHeader, signatureHeader, secrets }),
    normalize: normalizeHotmartEvent,
  });

  return NextResponse.json(body, { status });
}
