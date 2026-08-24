"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { NavigationConfig } from "@/types/navigation";

const ChatSticker = dynamic(() => import("@/components/ChatSticker"), { ssr: false });
/*
 * A paleta de busca (⌘K) só existe depois que alguém aperta o atalho, e ela
 * puxa junto as sugestões — não tem por que entrar no pacote inicial.
 */
const GlobalSearchPalette = dynamic(
  () => import("@/components/search/GlobalSearchPalette").then((m) => m.GlobalSearchPalette),
  { ssr: false },
);

export function RouteShell({
  children,
  navigation,
}: {
  children: React.ReactNode;
  navigation: NavigationConfig;
}) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isAdmin = pathname.startsWith("/admin");
  const isClassroom = /^\/courses\/[^/]+\/lessons/.test(pathname);
  const isFocusedOnboarding = pathname === "/onboarding";
  /*
   * A conversa com um agente ocupa a altura toda e já tem a própria caixa de
   * mensagem: rodapé e bolha flutuante da IA só brigariam com ela.
   */
  const isAgentWorkspace = pathname.startsWith("/agentes");
  const isAuthPage =
    pathname.startsWith("/acessar") ||
    pathname.startsWith("/criar-conta") ||
    pathname.startsWith("/resetar-senha") ||
    pathname.startsWith("/confirmar");
  const hasStudentChrome = !isAdmin && !isClassroom;
  const hasFloatingChrome = !isFocusedOnboarding && !isAgentWorkspace && !isAuthPage;
  const showAssistant =
    !isAuthLoading && isAuthenticated && !isAdmin && !isFocusedOnboarding && !isAgentWorkspace && !isAuthPage;

  if (!hasStudentChrome) {
    return (
      <>
        {children}
        {showAssistant && <ChatSticker />}
        {isAuthenticated && !isAdmin && <GlobalSearchPalette />}
      </>
    );
  }

  return (
    /*
     * `ambient-canvas` pinta o gradiente suave atrás de toda a área do aluno.
     * É o que dá ao vidro do header e dos elementos flutuantes algo para
     * refratar — sem ele o efeito some sobre fundo chapado.
     */
    <div className="ambient-canvas">
      {!isAuthPage && <NavBar items={navigation.menu} />}
      {!isAuthPage && <ProfileBanner />}
      {/* A conversa já trava a própria altura; `min-h-screen` sobraria como rolagem morta. */}
      <main className={cn("w-full", !isAgentWorkspace && "min-h-screen")}>{children}</main>
      {hasFloatingChrome && <Footer groups={navigation.footer.groups} />}
      {showAssistant && <ChatSticker />}
      {isAuthenticated && !isAdmin && <GlobalSearchPalette />}
    </div>
  );
}
