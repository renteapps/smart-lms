export type EmailTemplateType =
  | "welcome"
  | "password_reset"
  | "course_enrollment"
  | "certificate"
  | "subscription"
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
}

export interface NotificationEmailCategories {
  newContent: boolean;
  communityReplies: boolean;
  broadcasts: boolean;
  inactivityReengagement: boolean;
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
