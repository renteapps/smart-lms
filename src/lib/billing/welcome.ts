import { generateFirstPartyAuthLink } from "@/lib/auth/accessLink";
import type { DB } from "@/lib/data/types";
import { sendConfiguredEmail } from "@/lib/resendServer";
import { exactEmailPattern, GATEWAY_PROVISIONED } from "./provisioning";

/**
 * Conta já existente que ainda espera o e-mail de primeiro acesso.
 *
 * O caso: o webhook cria a conta, mas algo depois falha (concessão, registro
 * da transação) e o gateway reenvia o evento. Na nova tentativa a conta já
 * existe (`created: false`) e, só com esse critério, as boas-vindas nunca
 * mais sairiam — o comprador ficaria com acesso pago e sem como entrar.
 *
 * Reenvia apenas se a conta: foi criada por uma compra, nunca fez login e não
 * tem boas-vindas enviadas com sucesso no histórico. Esse último critério é o
 * que impede e-mail repetido quando chega o segundo evento da mesma compra
 * (ex.: PURCHASE_APPROVED e depois PURCHASE_COMPLETE, na Hotmart).
 *
 * Devolve o e-mail da conta (o do Auth, não o do payload) ou `null`.
 */
export async function pendingFirstAccessEmail(db: DB, userId: string): Promise<string | null> {
  const { data, error } = await db.auth.admin.getUserById(userId);
  const account = data?.user;
  if (error || !account?.email) return null;
  if (account.last_sign_in_at) return null;
  if (account.app_metadata?.provisioned_by !== GATEWAY_PROVISIONED) return null;

  const { count, error: logError } = await db
    .from("email_logs")
    .select("id", { count: "exact", head: true })
    .ilike("recipient", exactEmailPattern(account.email))
    .in("template", ["welcome", "plan_welcome"])
    .eq("status", "sent");
  // Sem conseguir ler o histórico, não reenvia: repetir e-mail é pior que o
  // suporte usar "Reenviar acesso".
  if (logError || (count ?? 0) > 0) return null;
  return account.email;
}

/**
 * E-mail de boas-vindas para quem acabou de comprar e ainda não tinha conta.
 *
 * A conta é criada sem senha, então o "link de login" é na verdade um link de
 * recuperação: é por ele que a pessoa define a primeira senha. O link é de
 * primeira parte (`/auth/confirm`) para cair direto em "definir nova senha" —
 * ver `generateFirstPartyAuthLink`. Quem entrega é o Resend:
 *
 *  - assinatura de plano → `plan_welcome`, o e-mail didático do assinante novo
 *    (conta criada, passo a passo do primeiro acesso, dúvidas comuns);
 *  - curso avulso → `welcome` ("Primeiro acesso"), mais curto.
 *
 * Os dois precisam usar `{{link_login}}` no botão.
 *
 * Falha aqui **não** derruba o provisionamento: o acesso já foi concedido, e um
 * e-mail não entregue se resolve pelo "reenviar acesso" na tela do usuário. Por
 * isso o retorno é um booleano e não uma exceção.
 */
export async function sendPurchaseWelcomeEmail(
  db: DB,
  input: {
    userId?: string;
    email: string;
    name?: string;
    productName: string;
    productKind: "plan" | "course";
    /** Fim do período pago (ISO); `null` = sem data de término. */
    accessEndsAt?: string | null;
    origin?: string | null;
  },
): Promise<boolean> {
  try {
    const { link: actionLink, error } = await generateFirstPartyAuthLink(db, {
      kind: "recovery",
      email: input.email,
      next: "/resetar-senha?mode=update",
      origin: input.origin,
    });

    if (!actionLink) {
      console.error("[billing:welcome] falha ao gerar link de acesso", error);
      return false;
    }

    const isPlan = input.productKind === "plan";
    const result = await sendConfiguredEmail(db, {
      to: input.email,
      userId: input.userId,
      subject: "",
      template: isPlan ? "plan_welcome" : "welcome",
      data: {
        nome: input.name?.trim().split(/\s+/)[0] || "aluno(a)",
        email: input.email,
        link_login: actionLink,
        curso: input.productName,
        ...(isPlan && {
          nome_plano: input.productName,
          validade_plano: formatAccessEnd(input.accessEndsAt),
        }),
      },
      tags: [{ name: "origem", value: "webhook-pagamento" }],
    });

    if (!result.success) {
      console.error("[billing:welcome] falha ao enviar e-mail", result.error);
    }
    return result.success;
  } catch (error) {
    console.error("[billing:welcome] erro inesperado", (error as Error).message);
    return false;
  }
}

/** "até 25/09/2027", ou sem data quando o plano não tem término definido. */
export function formatAccessEnd(accessEndsAt: string | null | undefined): string {
  const end = accessEndsAt ? new Date(accessEndsAt) : null;
  if (!end || Number.isNaN(end.getTime())) return "enquanto a assinatura estiver ativa";
  return `até ${end.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;
}
