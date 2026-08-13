"use client";

import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ChatSticker from "@/components/ChatSticker";
import { ProfileBanner } from "@/components/profile/ProfileBanner";

export function RouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isClassroom = /^\/courses\/[^/]+\/lessons/.test(pathname);
  const isFocusedOnboarding = pathname === "/onboarding";
  /*
   * A conversa com um agente ocupa a altura toda e já tem a própria caixa de
   * mensagem: rodapé e bolha flutuante da IA só brigariam com ela.
   */
  const isAgentWorkspace = /^\/agentes\/[^/]+/.test(pathname);
  const hasStudentChrome = !isAdmin && !isClassroom;
  const hasFloatingChrome = !isFocusedOnboarding && !isAgentWorkspace;

  if (!hasStudentChrome) return <>{children}</>;

  return (
    /*
     * `ambient-canvas` pinta o gradiente suave atrás de toda a área do aluno.
     * É o que dá ao vidro do header e dos elementos flutuantes algo para
     * refratar — sem ele o efeito some sobre fundo chapado.
     */
    <div className="ambient-canvas">
      <NavBar />
      <ProfileBanner />
      <main className="min-h-screen w-full">{children}</main>
      {hasFloatingChrome && <Footer />}
      {hasFloatingChrome && <ChatSticker />}
    </div>
  );
}
