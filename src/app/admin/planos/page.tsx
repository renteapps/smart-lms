import { createClient } from "@/lib/supabase/server";
import { getPlans } from "@/lib/data/plans";
import { AdminPlanosClient } from "./AdminPlanosClient";

export default async function PlanosPage() {
  const supabase = await createClient();
  const plans = await getPlans(supabase);

  return <AdminPlanosClient initialPlans={plans} />;
}

