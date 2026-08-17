"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import { type Session, type User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import {
  defaultProfile,
  PROFILE_SAVED_EVENT,
  PROFILE_STORAGE_KEY,
  type ProfilePreferences,
} from "@/components/profile/ProfileEditor";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    // Inicialização da sessão
    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Erro ao obter sessão inicial:", error.message);
        }
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            syncUserProfile(initialSession.user);
          }
        }
      } catch (err) {
        console.error("Falha ao inicializar autenticação:", err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Listener para mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);

        if (event === "SIGNED_IN" && newSession?.user) {
          syncUserProfile(newSession.user);
          startTransition(() => {
            router.refresh();
          });
        } else if (event === "SIGNED_OUT") {
          startTransition(() => {
            router.refresh();
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const syncUserProfile = async (currentUser: User) => {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      let profile: ProfilePreferences = defaultProfile;
      if (stored) {
        try {
          profile = { ...defaultProfile, ...JSON.parse(stored) };
        } catch {
          // ignore
        }
      }

      // Tenta buscar dados mais recentes da tabela profiles
      let dbProfile: Record<string, unknown> | null = null;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();
        dbProfile = (data as Record<string, unknown>) || null;
      } catch {
        // ignore
      }

      const fullName = (dbProfile?.full_name as string) || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || profile.name;
      const username = (dbProfile?.username as string) || currentUser.user_metadata?.username || profile.username;
      const avatarUrl = (dbProfile?.avatar_url as string) || currentUser.user_metadata?.avatar_url || profile.avatarUrl;
      const email = currentUser.email || profile.email;
      const phone = (dbProfile?.phone as string) || profile.phone;
      const birthDate = (dbProfile?.birth_date as string) || currentUser.user_metadata?.birth_date || profile.birthDate;
      const gender = (dbProfile?.gender as string) || currentUser.user_metadata?.gender || profile.gender;
      const role = (dbProfile?.career_role as string) || currentUser.user_metadata?.role || profile.role;
      const company = (dbProfile?.company as string) || profile.company;
      const country = (dbProfile?.country as string) || profile.country;
      const state = (dbProfile?.state as string) || profile.state;
      const city = (dbProfile?.city as string) || profile.city;
      const bio = (dbProfile?.bio as string) || profile.bio;
      const weeklyGoal = typeof dbProfile?.weekly_goal === "number" ? dbProfile.weekly_goal : profile.weeklyGoal;
      const lessonReminders = typeof dbProfile?.lesson_reminders === "boolean" ? dbProfile.lesson_reminders : profile.lessonReminders;
      const emailDigest = typeof dbProfile?.email_digest === "boolean" ? dbProfile.email_digest : profile.emailDigest;
      const achievementAlerts = typeof dbProfile?.achievement_alerts === "boolean" ? dbProfile.achievement_alerts : profile.achievementAlerts;

      const updatedProfile: ProfilePreferences = {
        ...profile,
        name: fullName || profile.name,
        username: username || profile.username,
        avatarUrl: avatarUrl || profile.avatarUrl,
        email: email || profile.email,
        phone: phone || profile.phone,
        birthDate: birthDate || profile.birthDate,
        gender: gender || profile.gender,
        role: role || profile.role,
        company: company || profile.company,
        country: country || profile.country,
        state: state || profile.state,
        city: city || profile.city,
        bio: bio || profile.bio,
        weeklyGoal,
        lessonReminders,
        emailDigest,
        achievementAlerts,
      };

      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
      window.dispatchEvent(new CustomEvent(PROFILE_SAVED_EVENT, { detail: updatedProfile }));
    } catch {
      // Ignora erro em ambientes sem localStorage
    }
  };

  const refreshSession = async () => {
    try {
      const { data: { session: refreshedSession } } = await supabase.auth.getSession();
      setSession(refreshedSession);
      setUser(refreshedSession?.user ?? null);
      if (refreshedSession?.user) {
        syncUserProfile(refreshedSession.user);
      }
    } catch (err) {
      console.error("Erro ao atualizar sessão:", err);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      toast.success("Sessão encerrada com sucesso.");
      router.push("/acessar");
      router.refresh();
    } catch (error: any) {
      toast.danger("Erro ao sair da conta", { description: error?.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}
