"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Company } from "@/types/business";
import { createClient } from "@/lib/supabase/client";

export function useCompanyManager() {
  const { user } = useAuth();
  const [isManager, setIsManager] = useState<boolean>(false);
  const [managedCompanies, setManagedCompanies] = useState<Company[]>([]);
  const [primaryCompany, setPrimaryCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const evaluateManagerStatus = async () => {
    if (!user) {
      setIsManager(false);
      setManagedCompanies([]);
      setPrimaryCompany(null);
      setIsLoading(false);
      return;
    }

    try {
      const db = createClient();
      const { data, error } = await db
        .from("organization_members")
        .select(`
          organization_id,
          role,
          organizations:organization_id (
            id, name, trade_name, max_seats, status
          )
        `)
        .eq("user_id", user.id)
        .in("role", ["admin", "manager"])
        .neq("status", "disabled");

      if (error) throw error;

      if (data && data.length > 0) {
        setIsManager(true);
        // Note: this is a simplified mapping for the hook, real companies are fetched via getCompanies
        const companies = data.map((d: any) => ({
          id: d.organizations?.id,
          name: d.organizations?.name,
          tradeName: d.organizations?.trade_name,
        } as Company));
        
        setManagedCompanies(companies);
        setPrimaryCompany(companies[0]);
      } else {
        setIsManager(false);
        setManagedCompanies([]);
        setPrimaryCompany(null);
      }
    } catch (err) {
      console.error("Error evaluating manager status:", err);
      setIsManager(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    evaluateManagerStatus();
  }, [user]);

  const toggleSimulatedManager = (_val?: boolean) => {
    // Only used for demo/mock mode, now disabled
  };

  return {
    isManager,
    managedCompanies,
    primaryCompany,
    isLoading,
    toggleSimulatedManager,
  };
}
