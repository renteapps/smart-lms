"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle, ChevronRight, X } from "lucide-react";
import { Alert, Button, buttonVariants } from "@heroui/react";
import { defaultProfile, PROFILE_SAVED_EVENT, PROFILE_STORAGE_KEY, type ProfilePreferences } from "@/components/profile/ProfileEditor";

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
    <div className="pointer-events-none fixed inset-x-0 top-[76px] z-40 px-4 pt-3 sm:px-6">
      <Alert
        status="accent"
        className="editorial-container pointer-events-auto items-center gap-3 shadow-elev-3 sm:gap-4"
      >
        <Alert.Indicator>
          <AlertCircle className="size-5" aria-hidden="true" />
        </Alert.Indicator>
        <Alert.Content className="min-w-0">
          <Alert.Title>Seu perfil está incompleto</Alert.Title>
          <Alert.Description className="hidden sm:block">
            Complete suas informações para uma experiência personalizada.
          </Alert.Description>
        </Alert.Content>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Link href="/perfil" className={buttonVariants({ variant: "primary", size: "sm" })}>
            Completar <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
          <Button isIconOnly size="sm" variant="ghost" aria-label="Fechar aviso" onClick={() => setIsDismissed(true)}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}
