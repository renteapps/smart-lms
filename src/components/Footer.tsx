"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Esconder o Footer na rota interna do curso (apenas na tela de assistir aulas)
  if (pathname.match(/^\/courses\/[^\/]+\/lessons/) || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="bg-background py-16 px-4 md:px-12 border-t border-border mt-20">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
        <div>
          <span className="text-primary font-display font-extrabold text-xl tracking-tighter block mb-4">
            Smart LMS
          </span>
          <p className="text-muted-foreground text-sm max-w-sm">
            Plataforma moderna para cursos online. Aprenda com os melhores de forma rápida e objetiva.
          </p>
        </div>
        
        <div className="flex gap-16">
          <div className="flex flex-col gap-3 text-sm">
            <span className="font-semibold text-muted-foreground mb-1">Links Rápidos</span>
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors duration-[var(--duration-md)] ease-[var(--ease-zen)]">Início</Link>
            <Link href="/cursos" className="text-muted-foreground hover:text-foreground transition-colors duration-[var(--duration-md)] ease-[var(--ease-zen)]">Todos os Cursos</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-[var(--duration-md)] ease-[var(--ease-zen)]">FAQ</Link>
          </div>
          
          <div className="flex flex-col gap-3 text-sm">
            <span className="font-semibold text-muted-foreground mb-1">Legal</span>
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-[var(--duration-md)] ease-[var(--ease-zen)]">Termos de Uso</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-[var(--duration-md)] ease-[var(--ease-zen)]">Privacidade</Link>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-border text-center text-muted-foreground text-xs">
        &copy; {new Date().getFullYear()} Smart LMS. Todos os direitos reservados.
      </div>
    </footer>
  );
}
