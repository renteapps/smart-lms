export type EmailTemplateType =
  | "welcome"
  | "plan_welcome"
  | "password_reset"
  | "course_enrollment"
  | "certificate"
  | "subscription"
  | "renewal_reminder"
  | "expiration_warning"
  | "subscription_expired"
  | "winback_1"
  | "winback_2"
  | "winback_3"
  | "winback_4"
  | "org_invite"
  | "notification"
  | "inactivity"
  | "test";

export interface EmailTemplateVariable {
  tag: string;
  label: string;
  example: string;
  description: string;
}

export interface CustomEmailTemplate {
  type: EmailTemplateType;
  name: string;
  description: string;
  category: "platform" | "notification";
  subject: string;
  previewText: string;
  html: string;
  isCustomized: boolean;
  updatedAt?: string;
  variables: EmailTemplateVariable[];
}

export interface PlatformEmailCategories {
  welcome: boolean;
  passwordReset: boolean;
  courseEnrollment: boolean;
  certificateIssued: boolean;
  subscriptionConfirmation: boolean;
  orgInvite: boolean;
  /** Aviso de vencimento (7 dias antes) e aviso de assinatura expirada. */
  renewalNotices: boolean;
}

export interface NotificationEmailCategories {
  newContent: boolean;
  communityReplies: boolean;
  broadcasts: boolean;
  inactivityReengagement: boolean;
  /** Sequência de reconquista (4 e-mails em 30 dias) para quem não renovou. */
  winback: boolean;
}

export interface ResendConfig {
  apiKey: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  enabled: boolean;
  categories: {
    platform: PlatformEmailCategories;
    notifications: NotificationEmailCategories;
  };
  domainStatus: "not_started" | "pending" | "verified";
  updatedAt?: string;
}

export interface EmailSendPayload {
  to: string | string[];
  /** Usuário cujo perfil deve resolver as variáveis personalizadas. */
  userId?: string;
  subject: string;
  template?: EmailTemplateType;
  html?: string;
  text?: string;
  data?: Record<string, unknown>;
  tags?: { name: string; value: string }[];
  /** Cabeçalhos extras (ex.: List-Unsubscribe nos e-mails de reconquista). */
  headers?: Record<string, string>;
}

export interface EmailSendResponse {
  success: boolean;
  id?: string;
  message?: string;
  error?: string;
  simulated?: boolean;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  template: EmailTemplateType | "custom";
  status: "sent" | "failed" | "simulated";
  resendId?: string;
  createdAt: string;
  error?: string;
}
