import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/acessar", req.url), {
    status: 302,
  });
}

// Sem GET: logout por GET deixava qualquer página deslogar o aluno com um
// simples <img src="/auth/signout">.
