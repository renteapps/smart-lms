import type { Metadata } from "next";
import { verifyUnsubscribe } from "@/lib/emailUnsubscribe";
import { UnsubscribeView } from "./UnsubscribeView";

export const metadata: Metadata = {
  title: "Descadastrar e-mails",
  description: "Pare de receber os lembretes de reconquista.",
  robots: { index: false, follow: false },
};

/**
 * Destino do link "Descadastrar" dos e-mails de reconquista. O descadastro só
 * acontece no clique do botão: antivírus e pré-visualização de e-mail abrem
 * links sozinhos, e isso não pode tirar ninguém da lista.
 */
export default async function DescadastrarPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; c?: string; t?: string }>;
}) {
  const { u = "", c = "", t = "" } = await searchParams;
  return <UnsubscribeView userId={u} category={c} token={t} valid={verifyUnsubscribe(u, c, t)} />;
}
