import { toast as heroToast } from "@heroui/react";

type HeroOptions = Parameters<typeof heroToast>[1];
export type ToastOptions = (HeroOptions extends object ? HeroOptions : Record<string, unknown>) & {
  id?: string | number;
};

function sanitizeOptions(options?: ToastOptions): HeroOptions {
  if (!options) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = options;
  return rest as HeroOptions;
}

/**
 * Utilitário central de notificações do Smart LMS.
 * 
 * Conecta todas as notificações efêmeras da plataforma ao sistema oficial
 * do HeroUI v3 (`Toast.Provider`), com suporte a aliases semânticos
 * e compatibilidade com chamadas legadas de `.error()` e `{ id }`.
 */
export const toast = Object.assign(
  (message: string, options?: ToastOptions) => heroToast(message, sanitizeOptions(options)),
  {
    success: (message: string, options?: ToastOptions) => heroToast.success(message, sanitizeOptions(options)),
    danger: (message: string, options?: ToastOptions) => heroToast.danger(message, sanitizeOptions(options)),
    error: (message: string, options?: ToastOptions) => heroToast.danger(message, sanitizeOptions(options)),
    warning: (message: string, options?: ToastOptions) => heroToast.warning(message, sanitizeOptions(options)),
    info: (message: string, options?: ToastOptions) => heroToast.info(message, sanitizeOptions(options)),
    loading: (message: string, options?: ToastOptions) => heroToast.info(message, sanitizeOptions(options)),
    promise: heroToast.promise,
    close: heroToast.close,
    clear: heroToast.clear,
  }
);
