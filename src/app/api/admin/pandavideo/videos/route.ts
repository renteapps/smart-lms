import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verifica autenticação/autorização básica
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tentar pegar a chave da integração no banco de dados primeiro
    // A integração deve estar com 'enabled' true e ter o 'secrets.apiKey'
    let apiKey = process.env.PANDAVIDEO_API_KEY;

    const { data: integration } = await supabase
      .from("integrations")
      .select("enabled, secrets")
      .eq("slug", "pandavideo")
      .single();

    if (integration && integration.enabled && integration.secrets?.apiKey) {
      apiKey = integration.secrets.apiKey;
    }

    if (!apiKey) {
      // Como fallback de mock caso não exista no DB, permitir passar pelo header pra teste
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        apiKey = authHeader.substring(7);
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: "PandaVideo API Key not configured" }, { status: 400 });
    }

    // Busca os vídeos do PandaVideo
    const response = await fetch("https://api-v2.pandavideo.com.br/videos", {
      headers: {
        "Authorization": apiKey,
        "Accept": "application/json"
      },
      next: { revalidate: 60 } // Cache opcional
    });

    if (!response.ok) {
      throw new Error(`PandaVideo API erro: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro ao listar vídeos PandaVideo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
