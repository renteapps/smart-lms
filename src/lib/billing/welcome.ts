import type { DB } from "@/lib/data/types";
import { sendEmail } from "@/lib/resendService";

/**
 * E-mail de boas-vindas para quem acabou de comprar e ainda não tinha conta.
 *
 * A conta é criada sem senha, então o "link de login" é na verdade um link de
 * recuperação: é por ele que a pessoa define a primeira senha. `generateLink`
 * apenas gera a URL — quem entrega é o Resend, com o template `welcome` que já
 * existe no admin.
 *
 * Falha aqui **não** derruba o provisionamento: o acesso já foi concedido, e um
 * e-mail não entregue se resolve pelo "reenviar acesso" na tela do usuário. Por
 * isso o retorno é um booleano e não uma exceção.
 */
export async function sendPurchaseWelcomeEmail(
  db: DB,
  input: { email: string; name?: string; productName: string },
): Promise<boolean> {
  try {
    const { data, error } = await db.auth.admin.generateLink({
      type: "recovery",
      email: input.email,
    });

    if (error) {
      console.error("[billing:welcome] falha ao gerar link de acesso", error.message);
      return false;
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) return false;

    const result = await sendEmail({
      to: input.email,
      subject: "",
      template: "welcome",
      data: {
        nome: input.name?.split(" ")[0] ?? "aluno(a)",
        email: input.email,
        link_login: actionLink,
        curso: input.productName,
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
