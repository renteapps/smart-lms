"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { Company } from "@/types/business";

export function useCompanyManager() {
  const { isManager, isLoading, isCapabilitiesLoading } = useAuth();
  const managedCompanies: Company[] = [];
  const primaryCompany: Company | null = null;

  const toggleSimulatedManager = (_val?: boolean) => {
    // Only used for demo/mock mode, now disabled
    void _val;
  };

  return {
    isManager,
    managedCompanies,
    primaryCompany,
    isLoading: isLoading || isCapabilitiesLoading,
    toggleSimulatedManager,
  };
}
