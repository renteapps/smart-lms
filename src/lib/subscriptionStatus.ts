/**
 * Como cada status de assinatura se apresenta para quem lê.
 *
 * O vocabulário de `subscriptions.status` é do banco (em inglês, travado por
 * CHECK); a tradução para português e o tom de cor são decisão de interface. Ter
 * isso num módulo só existe porque a versão anterior tinha o de-para escrito
 * direto no JSX comparando com `"ativo"/"atrasado"/"cancelado"` — palavras que o
 * banco nunca gravou, então toda linha real aparecia como "Desconhecido".
 */

export type SubscriptionTone = "success" | "warning" | "danger" | "neutral";

export type SubscriptionStatusPresentation = {
  label: string;
  tone: SubscriptionTone;
  /** Frase para o aluno, na primeira pessoa do produto. */
  studentNote: string;
};

const PRESENTATIONS: Record<string, SubscriptionStatusPresentation> = {
  active: {
    label: "Ativa",
    tone: "success",
    studentNote: "Sua assinatura está em dia.",
  },
  trialing: {
    label: "Em teste",
    tone: "success",
    studentNote: "Você está no período de teste.",
  },
  pending: {
    label: "Pendente",
    tone: "neutral",
    studentNote: "Estamos aguardando a confirmação do primeiro pagamento.",
  },
  past_due: {
    label: "Em atraso",
    tone: "warning",
    studentNote: "Há uma cobrança em atraso. Seu acesso continua até o fim do período já pago.",
  },
  suspended: {
    label: "Suspensa",
    tone: "warning",
    studentNote: "Sua assinatura está suspensa por falta de pagamento.",
  },
  canceled: {
    label: "Cancelada",
    tone: "danger",
    studentNote: "Sua assinatura foi cancelada. Você mantém o acesso até o fim do período já pago.",
  },
  refunded: {
    label: "Reembolsada",
    tone: "danger",
    studentNote: "Esta compra foi reembolsada e o acesso foi encerrado.",
  },
  chargeback: {
    label: "Chargeback",
    tone: "danger",
    studentNote: "Houve uma contestação de pagamento e o acesso foi encerrado.",
  },
  expired: {
    label: "Expirada",
    tone: "neutral",
    studentNote: "O período da sua assinatura terminou.",
  },
};

const UNKNOWN: SubscriptionStatusPresentation = {
  label: "Desconhecido",
  tone: "neutral",
  studentNote: "Não conseguimos identificar a situação da sua assinatura.",
};

export function describeSubscriptionStatus(status: string | null | undefined): SubscriptionStatusPresentation {
  if (!status) return UNKNOWN;
  return PRESENTATIONS[status] ?? { ...UNKNOWN, label: status };
}

/** Classes utilitárias por tom, nos tokens semânticos do design system. */
export function subscriptionToneClasses(tone: SubscriptionTone): string {
  switch (tone) {
    case "success": return "bg-success-soft text-success-soft-foreground";
    case "warning": return "bg-warning-soft text-warning-soft-foreground";
    case "danger": return "bg-danger-soft text-danger-soft-foreground";
    default: return "bg-default-100 text-default-600";
  }
}

/**
 * O que dizer sobre a próxima data.
 *
 * Uma assinatura cancelada ainda tem `current_period_end` no futuro — é o
 * acesso já pago. Chamar isso de "próxima cobrança" seria mentira, então o
 * rótulo muda conforme a assinatura vai renovar ou apenas terminar.
 */
export function describeRenewal(input: {
  status: string | null | undefined;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}): { label: string; date: string | null } {
  if (!input.currentPeriodEnd) {
    const openEnded = input.status === "active" || input.status === "trialing";
    return { label: openEnded ? "Acesso sem prazo" : "Sem data de renovação", date: null };
  }

  const ending = input.cancelAtPeriodEnd
    || input.status === "canceled"
    || input.status === "expired"
    || input.status === "suspended";

  return {
    label: ending ? "Acesso disponível até" : "Próxima renovação",
    date: input.currentPeriodEnd,
  };
}
