import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth";

/**
 * Grava a posição do vídeo via `navigator.sendBeacon`.
 *
 * Existe só porque Server Actions não são chamáveis por `sendBeacon` (o
 * protocolo de invocação do Next exige um header próprio que a API de beacon
 * não permite setar). É o único caminho confiável para capturar "o aluno
 * fechou a aba/trocou de página no meio do vídeo": nesse momento não há tempo
 * para esperar uma resposta de `fetch`, então o navegador entrega essa
 * requisição em segundo plano mesmo com a página já descarregando.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lessonId = typeof body?.lessonId === "string" ? body.lessonId : null;
    const second = Number(body?.second);

    if (!lessonId || !Number.isFinite(second)) {
      return NextResponse.json({ success: false, error: "Dados inválidos." }, { status: 400 });
    }

    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        last_watched_second: Math.max(0, Math.floor(second)),
      },
      { onConflict: "user_id,lesson_id" },
    );

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao salvar progresso.";
    const status = message.includes("Sessão") ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
