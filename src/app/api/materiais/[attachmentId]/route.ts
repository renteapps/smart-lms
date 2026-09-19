import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import { getSessionUser } from "@/lib/supabase/auth";
import { LESSON_MATERIALS_BUCKET, lessonMaterialPath } from "@/lib/lessonMaterials";

export const dynamic = "force-dynamic";

/** Validade curta: o link só serve para o clique que o gerou. */
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Download de material complementar.
 *
 * O bucket `lesson-materials` é privado: a URL gravada no anexo não abre
 * sozinha. Aqui o anexo é lido com a sessão do aluno — a RLS de
 * `attachments` ("Anexos seguem a aula") só devolve a linha para quem tem
 * acesso ao curso — e só então o servidor assina uma URL temporária.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ attachmentId: string }> }) {
  const { attachmentId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(attachmentId)) {
    return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
  }

  const { supabase, user } = await getSessionUser();
  if (!user) {
    const login = new URL("/acessar", request.nextUrl.origin);
    login.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  const { data: attachment } = await supabase
    .from("attachments")
    .select("id, name, url")
    .eq("id", attachmentId)
    .maybeSingle();

  if (!attachment?.url) {
    return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
  }

  const path = lessonMaterialPath(attachment.url);
  if (!path) {
    // Link externo cadastrado pelo admin: só segue se for http(s).
    try {
      const external = new URL(attachment.url);
      if (external.protocol === "https:" || external.protocol === "http:") {
        return NextResponse.redirect(external, { headers: { "Cache-Control": "no-store" } });
      }
    } catch {
      // cai no 404 abaixo
    }
    return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
  }

  const storage = getSupabaseServiceRoleKey() ? createAdminClient() : supabase;
  const { data: signed, error } = await storage.storage
    .from(LESSON_MATERIALS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: attachment.name || true });

  if (error || !signed?.signedUrl) {
    console.error("[materiais] falha ao assinar URL", error);
    return NextResponse.json({ error: "Não foi possível abrir o material." }, { status: 502 });
  }

  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
