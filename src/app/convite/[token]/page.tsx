import type { Metadata } from "next";
import { getSessionUser } from "@/lib/supabase/auth";
import { InviteView, type InviteInfo } from "./InviteView";

export const metadata: Metadata = {
  title: "Convite da sua empresa",
  description: "Aceite o convite para acessar a plataforma com a sua equipe.",
  robots: { index: false, follow: false },
};

/**
 * Destino do e-mail de convite de empresa. Qualquer pessoa com o link vê de
 * qual empresa é o convite (o token é o segredo); só a conta com o e-mail
 * convidado consegue aceitar — ver `accept_org_invite`.
 */
export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { supabase, user } = await getSessionUser();

  const { data, error } = await supabase.rpc("get_org_invite", { p_token: token });
  if (error) console.error("[convite] get_org_invite falhou", error.message);

  const row = (data ?? {}) as { state?: string; email?: string; organization_name?: string };
  const invite: InviteInfo = {
    state: (row.state as InviteInfo["state"]) ?? "invalid",
    email: row.email ?? "",
    organizationName: row.organization_name ?? "",
  };

  return <InviteView token={token} invite={invite} sessionEmail={user?.email ?? null} />;
}
