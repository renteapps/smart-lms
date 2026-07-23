"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, User } from "lucide-react";
import { clsx } from "clsx";
import { NotificationBell } from "./NotificationBell";

export default function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Esconder a NavBar na rota interna do curso (apenas na tela de assistir aulas)
  // Must be after hooks!
  if (pathname.match(/^\/courses\/[^\/]+\/lessons/) || pathname.startsWith("/admin")) {
    return null;
  }


  return (
    <header
      className={clsx(
        "fixed top-0 w-full z-50 transition-all duration-[var(--duration-lg)] ease-[var(--ease-zen)]",
        isScrolled ? "bg-background/90 backdrop-blur-md shadow-sm border-b border-border/50 py-2" : "bg-gradient-to-b from-background/90 to-transparent py-4"
      )}
    >
      <div className="flex items-center justify-between px-4 md:px-12 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-primary font-display font-extrabold text-2xl tracking-tighter">
            Smart LMS
          </Link>
          
          <nav className="hidden md:flex gap-4 text-sm font-medium">
            <Link href="/" className="hover:text-muted-foreground transition">Início</Link>
            <Link href="/cursos" className="hover:text-muted-foreground transition">Cursos</Link>
            <Link href="/minha-trilha" className="hover:text-muted-foreground transition text-primary">Minha Trilha</Link>
            <Link href="/blog" className="hover:text-muted-foreground transition">Blog</Link>
            <Link href="/notas" className="hover:text-muted-foreground transition text-emerald-500 font-bold flex items-center gap-1">Anotações</Link>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <button aria-label="Buscar" className="hover:text-muted-foreground transition">
            <Search className="w-5 h-5" />
          </button>
          <NotificationBell />
          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center overflow-hidden cursor-pointer">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </header>
  );
}
