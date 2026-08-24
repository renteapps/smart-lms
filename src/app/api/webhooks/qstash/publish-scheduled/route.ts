import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Receiver } from "@upstash/qstash";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verificação de assinatura QStash se chaves estiverem configuradas
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

    if (currentSigningKey && nextSigningKey) {
      const signature = req.headers.get("upstash-signature");
      if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }

      const receiver = new Receiver({
        currentSigningKey,
        nextSigningKey,
      });

      const isValid = await receiver.verify({
        signature,
        body: rawBody,
        url: req.url,
      });

      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    let payload: { slug?: string } = {};
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        // Ignora erro de parse caso venha vazio
      }
    }

    // Revalida listagens e rotas do blog
    revalidatePath("/blog");
    revalidatePath("/admin/blog");
    if (payload.slug) {
      revalidatePath(`/blog/${payload.slug}`);
    }

    return NextResponse.json({
      success: true,
      revalidated: true,
      slug: payload.slug ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[QStash Webhook Error]:", error);
    return NextResponse.json({ error: "Internal error processing webhook" }, { status: 500 });
  }
}
