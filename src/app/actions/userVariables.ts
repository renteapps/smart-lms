"use server";

import { getOnboardingVariableDefinitions } from '@/lib/data/userVariables';
import { requireAdmin } from '@/lib/supabase/auth';

export async function getActiveOnboardingVariableCatalog() {
  try {
    const { adminClient } = await requireAdmin();
    const definitions = await getOnboardingVariableDefinitions(adminClient, { activeOnly: true });
    return { success: true as const, definitions };
  } catch (error) {
    return { success: false as const, definitions: [], message: (error as Error).message };
  }
}

