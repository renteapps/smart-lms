import type { DB } from "@/lib/data/types";
import type { BillingGateway } from "./types";

/**
 * Segredos de webhook dos gateways.
 *
 * Ficam em `integrations.secrets` (RLS de admin, lido pela service role), com
 * as variáveis de ambiente como alternativa — o mesmo desenho já usado pelo
 * PandaVideo e pelo OpenRouter. Guardar no banco é o que permite trocar a chave
 * pela tela de integrações sem redeploy.
 *
 * Aceita **lista** de segredos porque a Eduzz deixa cadastrar várias chaves ao
 * mesmo tempo, que é como se faz rotação sem derrubar webhook em produção.
 */

function splitSecrets(value: unknown): string[] {
  if (typeof value === "string") {
    // Uma variável de ambiente pode carregar várias chaves separadas por vírgula.
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function envSecrets(gateway: BillingGateway): string[] {
  if (gateway === "eduzz") {
    return splitSecrets(process.env.EDUZZ_WEBHOOK_SECRET);
  }
  return [
    ...splitSecrets(process.env.HOTMART_HOTTOK),
    ...splitSecrets(process.env.HOTMART_WEBHOOK_SECRET),
  ];
}

export type GatewayWebhookConfig = {
  enabled: boolean;
  secrets: string[];
  apiAccessToken?: string;
  producerId?: string;
  status?: string;
};

export async function loadGatewayWebhookConfig(
  db: DB,
  gateway: BillingGateway,
): Promise<GatewayWebhookConfig> {
  const { data, error } = await db
    .from("integrations")
    .select("enabled, config, secrets, status")
    .eq("slug", gateway)
    .maybeSingle();

  if (error) throw new Error(`Falha ao ler a configuração de ${gateway}: ${error.message}`);

  /*
   * Desligar a integração no admin desliga o webhook de verdade, inclusive o
   * que viria por variável de ambiente. Um botão "desativar" que não desativa
   * é pior do que não ter o botão.
   */
  if (data && data.enabled === false) {
    return { enabled: false, secrets: [] };
  }

  const stored = data?.secrets as Record<string, unknown> | null | undefined;
  const publicConfig = data?.config as Record<string, unknown> | null | undefined;
  const secrets = [
    ...splitSecrets(stored?.webhookSecret),
    ...splitSecrets(stored?.webhookSecrets),
    ...splitSecrets(stored?.hottok),
    ...envSecrets(gateway),
  ];

  const apiAccessToken = splitSecrets(stored?.accessToken)[0]
    ?? splitSecrets(process.env.EDUZZ_ACCESS_TOKEN)[0];
  const producerId = typeof publicConfig?.producerId === "string"
    ? publicConfig.producerId.trim()
    : undefined;

  return {
    enabled: true,
    secrets: Array.from(new Set(secrets)),
    apiAccessToken,
    producerId,
    status: typeof data?.status === "string" ? data.status : undefined,
  };
}
