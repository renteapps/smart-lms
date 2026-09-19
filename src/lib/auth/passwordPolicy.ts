/**
 * Espelho da política de senha configurada no Supabase Auth
 * (Authentication → Sign In / Providers → Email): mínimo de 8 caracteres,
 * com ao menos uma letra e um dígito ("Letters and digits").
 *
 * Validar aqui antes de chamar o Auth evita o erro genérico `weak_password`
 * e mostra ao aluno exatamente o que falta. Se mudar no painel, mude aqui.
 */
export const PASSWORD_MIN_LENGTH = 8;

export function passwordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha precisa ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "A senha precisa ter pelo menos uma letra e um número.";
  }
  return null;
}
