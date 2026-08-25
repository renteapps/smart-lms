/**
 * O que conta como "perfil completo" para liberar a plataforma.
 *
 * Existe porque Eduzz e Hotmart não coletam nada disso no checkout — só nome,
 * e-mail, telefone e documento. Uma conta provisionada pelo webhook de compra
 * (`resolveOrCreateUser`) nunca passa pelo formulário de `/criar-conta`, então
 * `username`, `birth_date`, `gender` e `career_role` ficam vazios para sempre a
 * menos que a pessoa seja levada a preencher em algum momento.
 *
 * `full_name` e `phone` entram na lista mesmo já vindo do gateway na maioria
 * das compras, porque nenhum dos dois é gerantido pelo payload — a Hotmart, por
 * exemplo, não obriga telefone no checkout. Testar os cinco por igual evita
 * depender de qual caminho de provisionamento criou a conta.
 */

export type ProfileCompletenessFields = {
  fullName?: string | null;
  username?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  careerRole?: string | null;
};

export const REQUIRED_PROFILE_FIELDS = [
  "fullName",
  "username",
  "phone",
  "birthDate",
  "gender",
  "careerRole",
] as const satisfies readonly (keyof ProfileCompletenessFields)[];

function isFilled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isProfileComplete(profile: ProfileCompletenessFields): boolean {
  return REQUIRED_PROFILE_FIELDS.every((field) => isFilled(profile[field]));
}

/** Para a UI mostrar exatamente o que falta, em vez de "está incompleto" genérico. */
export function missingProfileFields(profile: ProfileCompletenessFields): (keyof ProfileCompletenessFields)[] {
  return REQUIRED_PROFILE_FIELDS.filter((field) => !isFilled(profile[field]));
}
