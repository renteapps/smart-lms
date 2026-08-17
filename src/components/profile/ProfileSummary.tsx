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
import { createClient } from "@/lib/supabase/client";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`.toLocaleUpperCase("pt-BR");
}

export function ProfileSummary() {
  const [profile, setProfile] = useState<ProfilePreferences>(defaultProfile);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      // 1. LocalStorage inicial
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        try {
          setProfile({ ...defaultProfile, ...(JSON.parse(stored) as Partial<ProfilePreferences>) });
        } catch {
          // ignore
        }
      }

      // 2. Busca do Supabase
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (dbProfile && isMounted) {
            const merged: ProfilePreferences = {
              ...defaultProfile,
              name: dbProfile.full_name || user.user_metadata?.full_name || defaultProfile.name,
              username: dbProfile.username || user.user_metadata?.username || defaultProfile.username,
              avatarUrl: dbProfile.avatar_url || user.user_metadata?.avatar_url || null,
              email: user.email || defaultProfile.email,
              phone: dbProfile.phone || defaultProfile.phone,
              birthDate: dbProfile.birth_date || user.user_metadata?.birth_date || defaultProfile.birthDate,
              gender: dbProfile.gender || user.user_metadata?.gender || defaultProfile.gender,
              role: dbProfile.career_role || user.user_metadata?.role || defaultProfile.role,
              company: dbProfile.company || defaultProfile.company,
              country: dbProfile.country || defaultProfile.country,
              state: dbProfile.state || defaultProfile.state,
              city: dbProfile.city || defaultProfile.city,
              bio: dbProfile.bio || defaultProfile.bio,
            };
            setProfile(merged);
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));
          }
        }
      } catch {
        // Modo offline
      }
    };

    loadProfile();

    const handleProfileSaved = (event: Event) => {
      setProfile((event as CustomEvent<ProfilePreferences>).detail);
    };

    window.addEventListener(PROFILE_SAVED_EVENT, handleProfileSaved);
    return () => {
      isMounted = false;
      window.removeEventListener(PROFILE_SAVED_EVENT, handleProfileSaved);
    };
  }, []);

  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(", ");

  return (
    <Card className="gap-0 overflow-hidden border-hairline p-0 shadow-elev-1">
      {/* Faixa de cor da marca */}
      <div
        aria-hidden="true"
        className="h-24 bg-gradient-to-br from-accent-soft via-surface to-success-soft"
      />

      <Card.Content className="gap-0 px-5 pb-5 pt-0">
        <Avatar size="lg" color="accent" className="-mt-10 size-20 ring-4 ring-surface overflow-hidden shadow-elev-2">
          {profile.avatarUrl ? (
            <Avatar.Image
              src={profile.avatarUrl}
              alt={profile.name}
              className="size-full object-cover"
            />
          ) : null}
          <Avatar.Fallback className="font-display text-2xl font-extrabold">
            {getInitials(profile.name)}
          </Avatar.Fallback>
        </Avatar>

        <div className="mt-4">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.025em] text-foreground">
            {profile.name || "Seu nome"}
          </h2>
          {profile.username && (
            <p className="text-xs font-semibold text-accent-soft-foreground">
              @{profile.username}
            </p>
          )}
        </div>

        <p className="mt-1 text-sm text-muted">
          {profile.role || "Seu cargo"} · {profile.company || "Sua empresa"}
        </p>

        {profile.bio && (
          <p className="mt-3 text-xs text-muted leading-relaxed line-clamp-3 italic bg-surface/50 p-2.5 rounded-lg border border-hairline">
            &ldquo;{profile.bio}&rdquo;
          </p>
        )}

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
