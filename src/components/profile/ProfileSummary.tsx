"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Award } from "lucide-react";
import {
  defaultProfile,
  PROFILE_SAVED_EVENT,
  PROFILE_STORAGE_KEY,
  type ProfilePreferences,
} from "@/components/profile/ProfileEditor";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`.toLocaleUpperCase("pt-BR");
}

export function ProfileSummary() {
  const [profile, setProfile] = useState(defaultProfile);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!stored) return;

      try {
        setProfile({ ...defaultProfile, ...(JSON.parse(stored) as Partial<ProfilePreferences>) });
      } catch {
        // Mantém os dados de demonstração quando o conteúdo local é inválido.
      }
    });

    const handleProfileSaved = (event: Event) => {
      setProfile((event as CustomEvent<ProfilePreferences>).detail);
    };

    window.addEventListener(PROFILE_SAVED_EVENT, handleProfileSaved);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(PROFILE_SAVED_EVENT, handleProfileSaved);
    };
  }, []);

  return (
    <div className="editorial-card overflow-hidden">
      <div className="h-20 bg-primary-pale" aria-hidden="true">
        <div className="h-full w-full bg-[radial-gradient(circle_at_15%_20%,rgba(49,87,183,0.15),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(201,121,87,0.16),transparent_26%)]" />
      </div>
      <div className="px-5 pb-5">
        <div className="-mt-10 grid h-20 w-20 place-items-center rounded-[14px] border-4 border-surface bg-primary font-display text-2xl font-extrabold text-on-primary shadow-sm">
          {getInitials(profile.name)}
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-ink">{profile.name || "Seu nome"}</h2>
        <p className="mt-1 text-sm text-text-soft">{profile.role || "Seu cargo"} · {profile.company || "Sua empresa"}</p>
        <p className="mt-1 break-all text-sm text-text-mute">{profile.email}</p>
        {(profile.city || profile.state || profile.country) && (
          <p className="mt-1 text-sm text-text-soft">
            {[profile.city, profile.state, profile.country].filter(Boolean).join(", ")}
          </p>
        )}

        <div className="mt-5 rounded-[10px] border border-primary/15 bg-primary-pale/70 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface text-primary shadow-sm">
              <Award className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary-active">Perfil de liderança</p>
              <p className="mt-1 text-sm font-extrabold text-ink">Comunicadora empática</p>
            </div>
          </div>
          <Link href="/onboarding" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary-active hover:text-primary">
            Atualizar diagnóstico <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
