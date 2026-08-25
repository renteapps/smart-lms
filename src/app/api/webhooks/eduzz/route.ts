import { NextRequest, NextResponse } from "next/server";

import { normalizeEduzzEvent } from "@/lib/billing/eduzz";
import { handleBillingWebhook } from "@/lib/billing/handleWebhook";
import { verifyEduzzSignature } from "@/lib/billing/signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 1_048_576;

export async function POST(req: NextRequest) {
  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Corpo excede o limite permitido." }, { status: 413 });
  }

  // A assinatura é sobre os bytes exatos recebidos, não sobre JSON
  // reserializado. O limite também é conferido após a leitura porque
  // Content-Length pode estar ausente (chunked) ou incorreto.
  const rawBytes = Buffer.from(await req.arrayBuffer());
  if (rawBytes.byteLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Corpo excede o limite permitido." }, { status: 413 });
  }
  const rawBody = rawBytes.toString("utf8");

  // Next.js não expõe o IP diretamente; o header padrão do Vercel/proxy é
  // x-forwarded-for. Fallback para "unknown" — o rate-limiter em memória
  // ainda funciona, só agrupa todos os IPs desconhecidos em um bucket.
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const signatureHeader = req.headers.get("x-signature");

  const { status, body } = await handleBillingWebhook({
    gateway: "eduzz",
    rawBody,
    clientIp,
    verifySignature: (secrets) =>
      verifyEduzzSignature(rawBytes, signatureHeader, secrets),
    normalize: normalizeEduzzEvent,
  });

  return NextResponse.json(body, { status });
}
