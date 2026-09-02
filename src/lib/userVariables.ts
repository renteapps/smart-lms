export type UserVariableMap = Record<string, string>;

export const USER_VARIABLES_UPDATED_EVENT = 'smartlms:user-variables-updated';

export type TemplateInterpolationResult = {
  value: string;
  missingKeys: string[];
};

export type OnboardingVariableDefinition = {
  key: string;
  questionId: string;
  questionText: string;
  questionType: 'single' | 'multiple' | 'open';
  active: boolean;
  publishedVersion: number;
};

/**
 * Nomes já usados por e-mails, checkout e dados básicos do perfil. Uma
 * variável de onboarding não pode sombrear nenhum deles.
 */
export const RESERVED_USER_VARIABLE_KEYS = new Set([
  'first_name', 'last_name', 'full_name', 'nome', 'name', 'email', 'user_email',
  'nome_plataforma', 'app_name', 'data_atual', 'current_date', 'ano_atual', 'current_year',
  'nome_curso', 'course_title', 'link_curso', 'course_url', 'link_login', 'login_url',
  'link_recuperacao', 'reset_url', 'codigo_certificado', 'certificate_code',
  'link_certificado', 'certificate_url', 'nome_plano', 'plan_name', 'valor_plano',
  'plan_price', 'dias_inativo', 'days_inactive', 'titulo_notificacao',
  'notification_title', 'mensagem_notificacao', 'notification_message', 'link_acao',
  'action_url', 'texto_acao', 'action_text', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_content', 'utm_term', 'contact', 'course', 'coupon', 'affiliate',
]);

export const USER_VARIABLE_KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]*)\s*(?:\|\s*([^{}]*?))?\s*\}\}/g;

export function normalizeVariableKey(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

export function isValidUserVariableKey(value?: string | null): boolean {
  const key = normalizeVariableKey(value);
  return USER_VARIABLE_KEY_PATTERN.test(key) && !RESERVED_USER_VARIABLE_KEYS.has(key);
}

export function extractTemplateVariableKeys(template: string): string[] {
  if (!template) return [];
  const keys = new Set<string>();
  for (const match of template.matchAll(new RegExp(TEMPLATE_VARIABLE_PATTERN.source, 'g'))) {
    keys.add(match[1].toLowerCase());
  }
  return [...keys];
}

export function normalizeUserVariableValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

export function formatUserVariableValues(values: readonly string[]): string {
  const normalized = values.map(normalizeUserVariableValue).filter(Boolean);
  if (normalized.length === 0) return '';
  if (normalized.length === 1) return normalized[0];
  return new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' }).format(normalized);
}

export function nativeUserVariables(input: {
  fullName?: string | null;
  email?: string | null;
}): UserVariableMap {
  const fullName = normalizeUserVariableValue(input.fullName);
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? '';
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
  const email = normalizeUserVariableValue(input.email);

  return {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    // Compatibilidade: no onboarding, {{nome}} já significa primeiro nome.
    nome: firstName,
    name: fullName,
    email,
    user_email: email,
    'contact.name': fullName,
    'contact.first_name': firstName,
    'contact.last_name': lastName,
    'contact.email': email,
  };
}

export function interpolateUserTemplate(
  template: string,
  variables: UserVariableMap,
  transform: (value: string, key: string) => string = (value) => value,
): TemplateInterpolationResult {
  if (!template) return { value: '', missingKeys: [] };
  const missing = new Set<string>();

  const value = template.replace(
    new RegExp(TEMPLATE_VARIABLE_PATTERN.source, 'g'),
    (_match, rawKey: string, rawFallback?: string) => {
      const key = rawKey.toLowerCase();
      const resolved = normalizeUserVariableValue(variables[key]);
      if (resolved) return transform(resolved, key);

      const fallback = normalizeUserVariableValue(rawFallback);
      if (fallback) return transform(fallback, key);

      missing.add(key);
      return '';
    },
  );

  return { value, missingKeys: [...missing] };
}

export function interpolateUserText(template: string, variables: UserVariableMap): TemplateInterpolationResult {
  return interpolateUserTemplate(template, variables);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function interpolateUserHtml(template: string, variables: UserVariableMap): TemplateInterpolationResult {
  return interpolateUserTemplate(template, variables, escapeHtml);
}

export function interpolateUserUrl(template: string, variables: UserVariableMap): TemplateInterpolationResult {
  return interpolateUserTemplate(template, variables, (value) => encodeURIComponent(value));
}

/** Evita que quebras e aspas de uma resposta livre alterem a estrutura do prompt. */
export function interpolateUserPrompt(template: string, variables: UserVariableMap): TemplateInterpolationResult {
  return interpolateUserTemplate(template, variables, (value) => JSON.stringify(value).slice(1, -1));
}

export function warnMissingUserVariables(context: string, keys: readonly string[]): void {
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) return;
  console.warn(`[user-variables:${context}] variáveis sem valor: ${unique.join(', ')}`);
}
