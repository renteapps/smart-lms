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

  const syncUserProfile = (currentUser: User) => {
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

      const fullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || profile.name;
      const email = currentUser.email || profile.email;
      const birthDate = currentUser.user_metadata?.birth_date || profile.birthDate;
      const gender = currentUser.user_metadata?.gender || profile.gender;
      const role = currentUser.user_metadata?.role || profile.role;

      const updatedProfile: ProfilePreferences = {
        ...profile,
        name: fullName || profile.name,
        email: email || profile.email,
        birthDate: birthDate || profile.birthDate,
        gender: gender || profile.gender,
        role: role || profile.role,
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
