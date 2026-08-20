import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error("❌ Faltam variáveis de ambiente (URL, ANON_KEY ou SERVICE_ROLE_KEY) no .env.local");
  process.exit(1);
}

// 1. Cliente Admin (ignora RLS, usado para "subir" os dados iniciais)
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 2. Cliente Anônimo (sujeito ao RLS, usado para testar se usuários deslogados veem os publicados)
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("🚀 Iniciando Teste de Integração e RLS (Cursos & Uploads)...");

  // 1. Criar uma "foto" falsa para o curso
  const bucketName = "public-assets";
  const dummyImageBuffer = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#4f46e5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="white">Test Course</text></svg>',
    'utf-8'
  );
  
  const fileName = `courses/test_cover_${crypto.randomUUID().split('-')[0]}.svg`;

  console.log(`\n📸 1. Fazendo upload de foto simulada: ${fileName}`);
  const { data: uploadData, error: uploadError } = await adminClient
    .storage
    .from(bucketName)
    .upload(fileName, dummyImageBuffer, {
      contentType: 'image/svg+xml',
      upsert: true
    });

  if (uploadError) {
    console.error("❌ Erro no upload da foto:", uploadError.message);
    return;
  }
  
  const { data: publicUrlData } = adminClient.storage.from(bucketName).getPublicUrl(fileName);
  const coverUrl = publicUrlData.publicUrl;
  console.log("✅ Upload com sucesso! URL pública:", coverUrl);

  // 2. Criar Cursos (Um rascunho, um publicado)
  console.log("\n📚 2. Criando Cursos de teste...");
  const draftCourse = {
    title: "Curso Rascunho (Teste)",
    description: "Este curso não está publicado.",
    is_published: false,
    cover_url: coverUrl,
    category: "Testes",
    level: "beginner"
  };

  const publishedCourse = {
    title: "Curso Publicado (Teste)",
    description: "Este curso ESTÁ publicado.",
    is_published: true,
    cover_url: coverUrl,
    category: "Testes",
    level: "advanced"
  };

  const { data: coursesData, error: coursesError } = await adminClient
    .from("courses")
    .insert([draftCourse, publishedCourse])
    .select();

  if (coursesError || !coursesData) {
    console.error("❌ Erro ao criar cursos:", coursesError);
    return;
  }
  console.log("✅ Cursos criados com sucesso! IDs:", coursesData.map(c => c.id));

  // 3. Teste de RLS (Client anônimo)
  console.log("\n🔐 3. Testando Segurança (RLS) com cliente anônimo...");
  const { data: fetchAnonData, error: fetchAnonError } = await anonClient
    .from("courses")
    .select("title, is_published")
    .eq("category", "Testes");

  if (fetchAnonError) {
    console.error("❌ Erro ao buscar cursos (Anon):", fetchAnonError.message);
  } else {
    console.log("Cursos visíveis para usuário sem permissão:");
    console.log(fetchAnonData);

    const hasDraft = fetchAnonData.some(c => !c.is_published);
    if (hasDraft) {
      console.error("❌ FALHA RLS: O usuário anônimo conseguiu ver um curso rascunho!");
    } else {
      console.log("✅ SUCESSO RLS: O usuário anônimo SÓ conseguiu ver o curso publicado!");
    }
  }

  // 4. Limpeza (Cleanup) - Removendo os dados gerados
  console.log("\n🧹 4. Limpando dados do teste...");
  const courseIds = coursesData.map(c => c.id);
  await adminClient.from("courses").delete().in("id", courseIds);
  await adminClient.storage.from(bucketName).remove([fileName]);
  
  console.log("✅ Limpeza concluída!");
  console.log("\n🎉 Teste finalizado com sucesso.");
}

run();
