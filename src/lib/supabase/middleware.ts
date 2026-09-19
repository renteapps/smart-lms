import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProfileComplete } from "@/lib/profileCompleteness";
import { getSupabaseUrl, getSupabaseAnonKey } from "./env";
import { safeRedirect } from "@/lib/safeRedirect";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // DO NOT run code between createServerClient and supabase.auth.getUser().
  // Important: getUser is preferred for route protection rather than getSession
  // to ensure identity is verified against the database.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/acessar") || 
                      request.nextUrl.pathname.startsWith("/criar-conta") ||
                      request.nextUrl.pathname.startsWith("/resetar-senha");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  // Define public prefixes (rotas que não exigem bloqueio forçado por middleware)
  const publicPrefixes = [
    "/acessar",
    "/criar-conta",
    "/resetar-senha",
    "/confirmar",
    "/perfil",
    "/empresa",
    "/cursos",
    "/blog",
    "/certificados/",
    // Páginas personalizadas do criador de páginas: sempre públicas, sem gate de login.
    "/pagina",
    // Teste de perfil livre: a pessoa responde sem conta e só cria login no resultado.
    "/diagnostico",
    "/api/",
    /*
     * Quem clica num link de recuperação de senha, confirmação de cadastro ou
     * callback OAuth ainda não tem sessão — só tem o token na própria URL.
     * Sem este prefixo aqui, o bloco "usuário anônimo em rota protegida" logo
     * abaixo redirecionava para /acessar antes da rota processar o token,
     * quebrando magic link, recuperação de senha e o e-mail de boas-vindas
     * disparado na compra (que usa exatamente esse link).
     */
    "/auth/",
  ];
  const isPublicRoute = request.nextUrl.pathname === "/" || 
                        publicPrefixes.some(prefix => request.nextUrl.pathname.startsWith(prefix));

  // Helper para redirecionamento preservando cookies de sessão atualizados
  const createRedirectResponse = (targetUrl: URL) => {
    const redirectResponse = NextResponse.redirect(targetUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // Redirect unauthenticated users from protected routes
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/acessar";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return createRedirectResponse(url);
  }

  // Redirect authenticated users away from auth pages (respeitando o redirect se houver)
  if (user && isAuthRoute) {
    const redirectParam = request.nextUrl.searchParams.get("redirect") || request.nextUrl.searchParams.get("next");
    const target = new URL(safeRedirect(redirectParam, "/"), request.nextUrl.origin);
    // Voltar para outra tela de login criaria um loop de redirecionamento.
    const isAuthTarget = ["/acessar", "/criar-conta", "/resetar-senha"].some((prefix) =>
      target.pathname.startsWith(prefix),
    );
    return createRedirectResponse(isAuthTarget ? new URL("/", request.nextUrl.origin) : target);
  }

  // Verify Admin access
  if (user && isAdminRoute) {
    // app_metadata só é gravável pelo service role (sync_profile_role_to_app_metadata).
    // user_metadata NÃO entra aqui: o próprio usuário edita via auth.updateUser().
    const isAppMetaAdmin = user.app_metadata?.role === "admin";

    let isProfileAdmin = false;
    let dbError: unknown = null;

    if (!isAppMetaAdmin) {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        dbError = error;
        isProfileAdmin = profile?.role === "admin";
      } catch (err) {
        dbError = err;
      }
    }

    if (!isAppMetaAdmin && !isProfileAdmin) {
      if (dbError) console.error("[middleware] falha ao checar papel de admin", dbError);
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      url.searchParams.set("blocked_reason", dbError ? "db_error" : "not_admin");
      return createRedirectResponse(url);
    }
  }

  /*
   * Etapa obrigatória de perfil: Eduzz e Hotmart não coletam nome de usuário,
   * data de nascimento, gênero ou cargo no checkout — uma conta criada pelo
   * webhook de compra (ver lib/billing/provisioning.ts) nunca passa pelo
   * formulário de /criar-conta, então esses campos ficam vazios para sempre a
   * menos que alguém seja levado a preenchê-los. Este bloco fecha essa lacuna
   * bloqueando a navegação até `/completar-cadastro`, para qualquer conta com
   * perfil incompleto — não só as vindas de gateway, o critério é só "campo
   * obrigatório vazio", então cobre qualquer forma futura de provisionamento.
   *
   * `/admin` fica de fora porque é rota de equipe interna, não de aluno.
   */
  const completionExemptPrefixes = [
    "/completar-cadastro",
    "/perfil",
    "/acessar",
    "/criar-conta",
    "/resetar-senha",
    "/confirmar",
    "/auth/",
    "/api/",
    "/certificados/",
  ];
  const isCompletionExempt = isAdminRoute
    || completionExemptPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (user && !isCompletionExempt) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, username, phone, birth_date, gender, career_role")
      .eq("id", user.id)
      .maybeSingle();

    // Sem linha em profiles ainda (corrida rara com o trigger de criação) não
    // bloqueia — é melhor deixar passar uma vez do que travar o login. Admin
    // fica isento por papel, não só por rota: sem isso, um admin com perfil
    // de teste incompleto seria barrado ao simplesmente navegar por uma tela
    // de aluno fora de /admin (ex.: conferir /minha-trilha).
    if (profile && profile.role !== "admin") {
      const complete = isProfileComplete({
        fullName: profile.full_name,
        username: profile.username,
        phone: profile.phone,
        birthDate: profile.birth_date,
        gender: profile.gender,
        careerRole: profile.career_role,
      });

      if (!complete) {
        const url = request.nextUrl.clone();
        url.pathname = "/completar-cadastro";
        url.searchParams.set("next", request.nextUrl.pathname);
        return createRedirectResponse(url);
      }
    }
  }

  return supabaseResponse;
}
