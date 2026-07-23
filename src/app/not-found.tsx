"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────
   Floating Star / Particle
   ───────────────────────────────────────────── */
function Star({ delay, size, x, y, duration }: { delay: number; size: number; x: number; y: number; duration: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0.6, 1, 0],
        scale: [0, 1, 0.8, 1, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
      className="absolute rounded-full bg-primary"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        boxShadow: `0 0 ${size * 3}px ${size}px var(--primary)`,
      }}
    />
  );
}

/* ─────────────────────────────────────────────
   Starfield Background
   ───────────────────────────────────────────── */
function Starfield() {
  const [stars, setStars] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 3,
    }));
    setStars(generated);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <Star key={star.id} {...star} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Floating Astronaut SVG Illustration
   ───────────────────────────────────────────── */
function FloatingAstronaut() {
  return (
    <motion.div
      animate={{
        y: [0, -15, 0, 10, 0],
        rotate: [0, 3, -2, 1, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="relative w-48 h-48 md:w-64 md:h-64"
    >
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
        {/* Helmet */}
        <circle cx="100" cy="80" r="45" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
        <circle cx="100" cy="80" r="38" fill="var(--background)" opacity="0.8" />
        {/* Visor */}
        <ellipse cx="100" cy="78" rx="30" ry="25" fill="var(--primary)" opacity="0.2" />
        <ellipse cx="100" cy="78" rx="28" ry="23" fill="var(--primary)" opacity="0.15" />
        {/* Visor reflection */}
        <ellipse cx="90" cy="70" rx="10" ry="7" fill="white" opacity="0.25" transform="rotate(-15, 90, 70)" />
        {/* Body */}
        <rect x="70" y="120" width="60" height="50" rx="12" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
        {/* Backpack */}
        <rect x="55" y="125" width="18" height="35" rx="6" fill="var(--muted)" stroke="var(--border)" strokeWidth="1.5" />
        {/* Backpack detail */}
        <circle cx="64" cy="138" r="4" fill="var(--primary)" opacity="0.6" />
        <circle cx="64" cy="150" r="3" fill="var(--accent-cyan)" opacity="0.5" />
        {/* Antenna */}
        <line x1="100" y1="35" x2="100" y2="20" stroke="var(--border)" strokeWidth="2" />
        <motion.circle
          cx="100"
          cy="17"
          r="4"
          fill="var(--primary)"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Left arm */}
        <motion.g
          animate={{ rotate: [0, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "73px 130px" }}
        >
          <rect x="45" y="128" width="28" height="12" rx="6" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" transform="rotate(-20, 59, 134)" />
          {/* Glove */}
          <circle cx="46" cy="125" r="7" fill="var(--muted)" stroke="var(--border)" strokeWidth="1.5" />
        </motion.g>
        {/* Right arm */}
        <motion.g
          animate={{ rotate: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          style={{ transformOrigin: "127px 130px" }}
        >
          <rect x="127" y="128" width="28" height="12" rx="6" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" transform="rotate(20, 141, 134)" />
          {/* Glove */}
          <circle cx="154" cy="125" r="7" fill="var(--muted)" stroke="var(--border)" strokeWidth="1.5" />
        </motion.g>
        {/* Left leg */}
        <rect x="75" y="165" width="16" height="25" rx="6" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
        <rect x="72" y="185" width="22" height="10" rx="5" fill="var(--muted)" stroke="var(--border)" strokeWidth="1.5" />
        {/* Right leg */}
        <rect x="107" y="165" width="16" height="25" rx="6" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
        <rect x="104" y="185" width="22" height="10" rx="5" fill="var(--muted)" stroke="var(--border)" strokeWidth="1.5" />
        {/* Chest badge */}
        <rect x="88" y="130" width="24" height="16" rx="4" fill="var(--primary)" opacity="0.2" />
        <text x="100" y="142" textAnchor="middle" fontSize="8" fill="var(--primary)" fontWeight="bold" opacity="0.7">LMS</text>
      </svg>

      {/* Floating debris around astronaut */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-2 -right-4 w-3 h-3 rounded-sm bg-primary/30 border border-primary/20"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-4 -left-6 w-2 h-2 rounded-full bg-accent-cyan/40"
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 -right-8 w-1.5 h-1.5 rounded-full bg-primary/50"
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Glitching 404 Number
   ───────────────────────────────────────────── */
function Glitch404() {
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative select-none">
      <motion.h1
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="text-[120px] sm:text-[160px] md:text-[200px] font-display font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-primary via-primary to-primary/40"
        style={{
          filter: glitchActive ? "blur(1px)" : "none",
          textShadow: "0 0 80px color-mix(in oklch, var(--primary) 30%, transparent)",
        }}
      >
        404
      </motion.h1>

      {/* Glitch layers */}
      <AnimatePresence>
        {glitchActive && (
          <>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7, x: [-2, 3, -1, 2, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              aria-hidden
              className="absolute inset-0 text-[120px] sm:text-[160px] md:text-[200px] font-display font-black leading-none tracking-tighter text-primary/60"
              style={{ clipPath: "inset(20% 0 50% 0)" }}
            >
              404
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5, x: [3, -2, 1, -3, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              aria-hidden
              className="absolute inset-0 text-[120px] sm:text-[160px] md:text-[200px] font-display font-black leading-none tracking-tighter text-accent-cyan/60"
              style={{ clipPath: "inset(60% 0 10% 0)" }}
            >
              404
            </motion.h1>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Not Found Component
   ───────────────────────────────────────────── */
export default function NotFound() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/courses?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [searchQuery, router],
  );

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Background layers */}
      <Starfield />

      {/* Radial gradient bg glow */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, color-mix(in oklch, var(--primary) 8%, transparent), transparent)",
        }}
      />

      {/* Orbiting rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full border border-primary/5 pointer-events-none"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
        className="absolute w-[400px] h-[400px] md:w-[550px] md:h-[550px] rounded-full border border-primary/8 pointer-events-none"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
        {/* Astronaut Illustration */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mb-2"
        >
          <FloatingAstronaut />
        </motion.div>

        {/* 404 Glitch Number */}
        <Glitch404 />

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2 mb-3"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Perdido no espaço de aprendizado
          </h2>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-muted-foreground text-base md:text-lg max-w-md mx-auto mb-8 leading-relaxed"
        >
          O conteúdo que você procura pode ter sido movido ou não existe mais. Tente buscar pelo que precisa ou volte para um lugar seguro.
        </motion.p>

        {/* Search bar */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="w-full max-w-md mb-8"
        >
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cursos, aulas..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-sm"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors duration-200"
                >
                  Buscar
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.form>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
        >
          <button
            onClick={() => router.back()}
            className="group flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold bg-card text-foreground border border-border hover:bg-accent hover:border-primary/30 transition-all duration-300 text-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
            Voltar
          </button>

          <Link
            href="/"
            className="group flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all duration-300 shadow-[0_4px_24px_color-mix(in_oklch,var(--primary)_30%,transparent)] hover:shadow-[0_8px_32px_color-mix(in_oklch,var(--primary)_45%,transparent)] hover:-translate-y-0.5 text-sm"
          >
            <Home className="w-4 h-4" />
            Ir para a Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
