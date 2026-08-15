import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function verifyApiKey(authorizationHeader: string | null) {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", status: 401, organizationId: null };
  }

  const token = authorizationHeader.replace("Bearer ", "");
  const hash = crypto.createHash("sha256").update(token).digest("hex");

  const supabase = createAdminClient();
  
  const { data: key, error } = await supabase
    .from("api_keys")
    .select("*, organizations(id, is_active)")
    .eq("key_hash", hash)
    .single();

  if (error || !key || key.is_revoked) {
    return { error: "Invalid or revoked API key", status: 401, organizationId: null };
  }

  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { error: "API key expired", status: 401, organizationId: null };
  }

  // @ts-ignore - Supabase types via Join
  const orgIsActive = key.organizations?.is_active;

  if (!orgIsActive) {
    return { error: "Organization is inactive", status: 403, organizationId: null };
  }

  // Update last_used_at asynchronously
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)
    .then();

  return { 
    error: null, 
    status: 200, 
    organizationId: key.organization_id, 
    scopes: key.scopes 
  };
}
