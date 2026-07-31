"use client";

import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ChatSticker from "@/components/ChatSticker";
import { ProfileBanner } from "@/components/profile/ProfileBanner";

export function RouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isClassroom = /^\/courses\/[^/]+\/lessons/.test(pathname);
  const isFocusedOnboarding = pathname === "/onboarding";
  const hasStudentChrome = !isAdmin && !isClassroom;

  if (!hasStudentChrome) return <>{children}</>;

  return (
    <>
      <NavBar />
      <ProfileBanner />
      <main className="min-h-screen w-full">{children}</main>
      {!isFocusedOnboarding && <Footer />}
      {!isFocusedOnboarding && <ChatSticker />}
    </>
  );
}
