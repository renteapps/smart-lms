"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight, X } from "lucide-react";
import { defaultProfile, PROFILE_SAVED_EVENT, PROFILE_STORAGE_KEY, type ProfilePreferences } from "@/components/profile/ProfileEditor";
import { usePathname } from "next/navigation";

export function ProfileBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only run on client
    const checkProfile = () => {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      let profile = defaultProfile;
      if (stored) {
        try {
          profile = { ...defaultProfile, ...(JSON.parse(stored) as Partial<ProfilePreferences>) };
        } catch {
          // Keep default if parse fails
        }
      }

      // Check if essential fields are missing
      const isComplete = profile.phone && profile.country && profile.state && profile.city && profile.gender && profile.birthDate;
      
      setIsVisible(!isComplete);
    };

    // Initial check
    checkProfile();

    // Listen for profile saves to update banner
    const handleProfileSaved = () => {
      checkProfile();
    };

    window.addEventListener(PROFILE_SAVED_EVENT, handleProfileSaved);
    return () => {
      window.removeEventListener(PROFILE_SAVED_EVENT, handleProfileSaved);
    };
  }, []);

  // Don't show on the profile page itself or if dismissed
  if (!isVisible || isDismissed || pathname === "/perfil") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-[76px] z-40 flex items-center justify-between gap-4 bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-md sm:px-6">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-4.5 w-4.5 shrink-0 opacity-80" aria-hidden="true" />
        <p>
          <span className="hidden sm:inline">Seu perfil está incompleto. </span>
          Complete suas informações para uma experiência personalizada.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link 
          href="/perfil" 
          className="group flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 transition-colors hover:bg-white/20"
        >
          Completar <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
        <button 
          onClick={() => setIsDismissed(true)}
          className="rounded-full p-1 text-on-primary/70 transition-colors hover:bg-white/10 hover:text-on-primary"
          aria-label="Fechar aviso"
        >
          <X className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
