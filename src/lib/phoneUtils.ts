export interface DdiOption {
  ddi: string;
  code: string;
  country: string;
  flag: string;
  mask?: string;
  placeholder?: string;
}

export const DDI_OPTIONS: DdiOption[] = [
  { ddi: "+55", code: "BR", country: "Brasil", flag: "🇧🇷", placeholder: "(00) 00000-0000" },
  { ddi: "+351", code: "PT", country: "Portugal", flag: "🇵🇹", placeholder: "000 000 000" },
  { ddi: "+1", code: "US", country: "EUA / Canadá", flag: "🇺🇸", placeholder: "(000) 000-0000" },
  { ddi: "+34", code: "ES", country: "Espanha", flag: "🇪🇸", placeholder: "000 00 00 00" },
  { ddi: "+54", code: "AR", country: "Argentina", flag: "🇦🇷", placeholder: "000 000-0000" },
  { ddi: "+598", code: "UY", country: "Uruguai", flag: "🇺🇾", placeholder: "0000 0000" },
  { ddi: "+56", code: "CL", country: "Chile", flag: "🇨🇱", placeholder: "9 0000 0000" },
  { ddi: "+57", code: "CO", country: "Colômbia", flag: "🇨🇴", placeholder: "000 000 0000" },
  { ddi: "+52", code: "MX", country: "México", flag: "🇲🇽", placeholder: "000 000 0000" },
  { ddi: "+44", code: "GB", country: "Reino Unido", flag: "🇬🇧", placeholder: "0000 000000" },
  { ddi: "+33", code: "FR", country: "França", flag: "🇫🇷", placeholder: "0 00 00 00 00" },
  { ddi: "+49", code: "DE", country: "Alemanha", flag: "🇩🇪", placeholder: "0000 000000" },
  { ddi: "+39", code: "IT", country: "Itália", flag: "🇮🇹", placeholder: "000 000 0000" },
  { ddi: "+244", code: "AO", country: "Angola", flag: "🇦🇴", placeholder: "900 000 000" },
  { ddi: "+258", code: "MZ", country: "Moçambique", flag: "🇲🇿", placeholder: "80 000 0000" },
  { ddi: "+81", code: "JP", country: "Japão", flag: "🇯🇵", placeholder: "00-0000-0000" },
];

/**
 * Formata números de telefone brasileiros com DDD e 8 ou 9 dígitos:
 * - 2 dígitos: (11
 * - 3 a 6 dígitos: (11) 9876
 * - 7 a 10 dígitos: (11) 9876-5432 (fixo)
 * - 11 dígitos: (11) 98765-4321 (celular)
 */
export function formatBrazilianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Formatação genérica para outros países baseada em blocos numéricos
 */
export function formatInternationalPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`;
}

/**
 * Formata o telefone de acordo com o DDI selecionado
 */
export function formatPhoneNumberByDdi(raw: string, ddi: string = "+55"): string {
  if (ddi === "+55") {
    return formatBrazilianPhone(raw);
  }
  return formatInternationalPhone(raw);
}

/**
 * Extrai o DDI e o número local a partir de uma string de telefone armazenada
 */
export function parseStoredPhone(stored: string): { ddi: string; localNumber: string; formatted: string } {
  if (!stored) {
    return { ddi: "+55", localNumber: "", formatted: "" };
  }

  const trimmed = stored.trim();

  // Verifica se começa com algum DDI conhecido
  for (const option of DDI_OPTIONS) {
    if (trimmed.startsWith(option.ddi)) {
      const rest = trimmed.substring(option.ddi.length).trim();
      const formatted = formatPhoneNumberByDdi(rest, option.ddi);
      return { ddi: option.ddi, localNumber: rest, formatted };
    }
  }

  // Se não começa com +, assume padrão Brasil (+55)
  const formatted = formatBrazilianPhone(trimmed);
  return { ddi: "+55", localNumber: trimmed, formatted };
}

/**
 * Monta a string final com DDI e telefone formatado
 */
export function composeFullPhone(ddi: string, localFormatted: string): string {
  if (!localFormatted.trim()) return "";
  return `${ddi} ${localFormatted.trim()}`;
}
