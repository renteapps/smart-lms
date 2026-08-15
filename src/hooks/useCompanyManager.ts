"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Company } from "@/types/business";
import {
  checkIsCompanyManager,
  setSimulatedManagerStatus,
  SIMULATED_MANAGER_STORAGE_KEY,
} from "@/lib/businessStorage";

export function useCompanyManager() {
  const { user } = useAuth();
  const [isManager, setIsManager] = useState<boolean>(false);
  const [managedCompanies, setManagedCompanies] = useState<Company[]>([]);
  const [primaryCompany, setPrimaryCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const evaluateManagerStatus = () => {
    const status = checkIsCompanyManager(user?.email);
    setIsManager(status.isManager);
    setManagedCompanies(status.managedCompanies);
    setPrimaryCompany(status.primaryCompany);
    setIsLoading(false);
  };

  useEffect(() => {
    evaluateManagerStatus();

    const handleUpdate = () => {
      evaluateManagerStatus();
    };

    window.addEventListener("smartlms:manager_status_changed", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("smartlms:manager_status_changed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [user]);

  const toggleSimulatedManager = (enable?: boolean) => {
    if (enable !== undefined) {
      setSimulatedManagerStatus(enable);
    } else {
      setSimulatedManagerStatus(!isManager);
    }
  };

  return {
    isManager,
    managedCompanies,
    primaryCompany,
    isLoading,
    toggleSimulatedManager,
  };
}
