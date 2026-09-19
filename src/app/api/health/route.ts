import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  try {
    const supabase = createAdminClient();
    // Teste simples de conexão rápida com timeout implícito
    const { error } = await supabase.from("app_settings").select("id").limit(1);

    const latencyMs = Date.now() - startTime;

    if (error) {
      return NextResponse.json(
        {
          status: "degraded",
          timestamp: new Date().toISOString(),
          latencyMs,
          database: "error",
          details: error.message,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      latencyMs,
      database: "connected",
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
