import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Receiver } from "@upstash/qstash";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Sem as chaves de assinatura a rota fica fechada: antes ela pulava a
    // verificação e qualquer um disparava revalidações à vontade.
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (!currentSigningKey || !nextSigningKey) {
      return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
    }

    {
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
    const slug = typeof payload.slug === "string" && /^[a-z0-9-]{1,200}$/i.test(payload.slug) ? payload.slug : null;
    if (slug) {
      revalidatePath(`/blog/${slug}`);
    }

    return NextResponse.json({
      success: true,
      revalidated: true,
      slug,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[QStash Webhook Error]:", error);
    return NextResponse.json({ error: "Internal error processing webhook" }, { status: 500 });
  }
}
