"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Award, Mail, MapPin } from "lucide-react";
import { Avatar, buttonVariants, Card, Chip } from "@heroui/react";
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

  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(", ");

  return (
    <Card className="gap-0 overflow-hidden border-hairline p-0">
      {/* Faixa de cor da marca: só tokens, sem gradiente hardcoded. */}
      <div
        aria-hidden="true"
        className="h-24 bg-gradient-to-br from-accent-soft via-surface to-success-soft"
      />

      <Card.Content className="gap-0 px-5 pb-5 pt-0">
        <Avatar size="lg" color="accent" className="-mt-10 size-20 ring-4 ring-surface">
          <Avatar.Fallback className="font-display text-2xl font-extrabold">{getInitials(profile.name)}</Avatar.Fallback>
        </Avatar>

        <h2 className="mt-4 font-display text-xl font-extrabold tracking-[-0.025em] text-foreground">
          {profile.name || "Seu nome"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {profile.role || "Seu cargo"} · {profile.company || "Sua empresa"}
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <dt className="sr-only">E-mail</dt>
            <Mail className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
            <dd className="min-w-0 break-all text-muted">{profile.email}</dd>
          </div>
          {location && (
            <div className="flex items-start gap-2">
              <dt className="sr-only">Localização</dt>
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              <dd className="min-w-0 text-muted">{location}</dd>
            </div>
          )}
        </dl>
      </Card.Content>

      <Card.Footer className="mt-2 flex-col items-start gap-3 border-t border-hairline bg-accent-soft/40 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-accent shadow-elev-1">
            <Award className="size-4" aria-hidden="true" />
          </span>
          <div>
            <Chip size="sm" variant="soft" color="accent">
              Perfil de liderança
            </Chip>
            <p className="mt-1.5 font-display text-sm font-extrabold text-foreground">Comunicadora empática</p>
          </div>
        </div>
        <Link href="/onboarding" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Atualizar diagnóstico <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </Card.Footer>
    </Card>
  );
}
