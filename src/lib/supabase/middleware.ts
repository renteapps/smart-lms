import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

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

  // Define public prefixes
  const publicPrefixes = [
    "/acessar",
    "/criar-conta",
    "/resetar-senha",
    "/confirmar",
    "/empresa",
    "/cursos",
    "/api/"
  ];
  const isPublicRoute = request.nextUrl.pathname === "/" || 
                        publicPrefixes.some(prefix => request.nextUrl.pathname.startsWith(prefix));

  // Redirect unauthenticated users from protected routes
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/acessar";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Verify Admin access
  if (user && isAdminRoute) {
    const isMetaAdmin = user.user_metadata?.role === "admin";
    
    let isProfileAdmin = false;
    let dbError = null;
    let roleFound = null;

    if (!isMetaAdmin) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      dbError = error;
      roleFound = profile?.role;
      isProfileAdmin = profile?.role === "admin";
    }

    if (!isMetaAdmin && !isProfileAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set(
        "blocked_reason", 
        dbError ? `db_error_${dbError.code || dbError.message}` : `role_${roleFound}`
      );
      return NextResponse.redirect(url);
    }
  }
  
  return supabaseResponse;
}
