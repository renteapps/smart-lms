import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verificação de autenticidade dos webhooks de pagamento.
 *
 * Regra que vale para tudo neste arquivo: **sem segredo configurado, a
 * verificação falha**. Isso é deliberadamente diferente do webhook do QStash
 * (`api/webhooks/qstash/publish-scheduled`), que pula a checagem quando as
 * chaves não existem — lá o pior caso é revalidar o blog à toa, aqui o pior
 * caso é qualquer pessoa na internet conceder acesso pago a si mesma.
 */

/** Compara sem vazar, pelo tempo de resposta, quantos bytes bateram. */
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // `timingSafeEqual` exige o mesmo comprimento; comparar o tamanho antes não
  // vaza nada útil, porque o tamanho da assinatura é público.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function usableSecrets(secrets: readonly (string | null | undefined)[]): string[] {
  return secrets.map((s) => (s ?? "").trim()).filter((s) => s.length > 0);
}

/**
 * Eduzz: header `x-signature` = `hmac_sha256(chave_secreta, corpo_bruto)`.
 *
 * O painel da Eduzz permite cadastrar **várias** chaves ao mesmo tempo (é assim
 * que se faz rotação sem downtime), então aceita-se qualquer uma da lista.
 *
 * A assinatura é sobre os bytes crus: reserializar o JSON antes de conferir
 * muda espaçamento e ordem de chaves e invalida tudo.
 */
export function verifyEduzzSignature(
  rawBody: string | Uint8Array,
  signatureHeader: string | null | undefined,
  secrets: readonly (string | null | undefined)[],
): boolean {
  const received = (signatureHeader ?? "").trim();
  if (!received) return false;

  const keys = usableSecrets(secrets);
  if (keys.length === 0) return false;

  return keys.some((key) => {
    const expected = createHmac("sha256", key).update(rawBody).digest("hex");
    return safeEquals(received.toLowerCase(), expected);
  });
}

/**
 * Hotmart, modo token: header `x-hotmart-hottok`, um valor fixo por conta que
 * simplesmente se compara. Não há HMAC envolvido, então a única proteção é a
 * comparação em tempo constante e o segredo não vazar.
 */
export function verifyHotmartToken(
  tokenHeader: string | null | undefined,
  secrets: readonly (string | null | undefined)[],
): boolean {
  const received = (tokenHeader ?? "").trim();
  if (!received) return false;

  const keys = usableSecrets(secrets);
  if (keys.length === 0) return false;

  return keys.some((key) => safeEquals(received, key));
}

/**
 * Hotmart, modo assinatura: `x-hotmart-signature` com HMAC-SHA256 sobre o corpo
 * bruto, como na Eduzz. Contas mais novas usam este; contas antigas usam o
 * hottok. `verifyHotmartRequest` tenta os dois.
 */
export function verifyHotmartSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secrets: readonly (string | null | undefined)[],
): boolean {
  const received = (signatureHeader ?? "").trim();
  if (!received) return false;

  const keys = usableSecrets(secrets);
  if (keys.length === 0) return false;

  return keys.some((key) => {
    const expected = createHmac("sha256", key).update(rawBody, "utf8").digest("hex");
    return safeEquals(received.toLowerCase(), expected);
  });
}

/**
 * Aceita a requisição da Hotmart por qualquer um dos dois mecanismos, porque
 * qual deles a conta usa depende de quando a credencial foi gerada. Se nenhum
 * header vier, ou nenhum segredo estiver cadastrado, recusa.
 */
export function verifyHotmartRequest(input: {
  rawBody: string;
  hottokHeader?: string | null;
  signatureHeader?: string | null;
  secrets: readonly (string | null | undefined)[];
}): boolean {
  return (
    verifyHotmartToken(input.hottokHeader, input.secrets)
    || verifyHotmartSignature(input.rawBody, input.signatureHeader, input.secrets)
  );
}
