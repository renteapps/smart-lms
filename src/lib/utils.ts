import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calcula a luminância relativa (WCAG 2.1) de uma cor hexadecimal e retorna
 * a cor de texto que garante contraste mínimo AA (≥ 4.5:1) sobre ela.
 *
 * Retorna `"#ffffff"` para cores escuras e `"#0f1119"` (foreground escuro do
 * tema) para cores claras. Cores que não sejam hex válido (#rgb ou #rrggbb)
 * recebem branco como fallback seguro.
 */
export function getContrastForeground(hex: string): "#ffffff" | "#0f1119" {
  const clean = hex.replace("#", "").trim()

  let r: number, g: number, b: number

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16)
    g = parseInt(clean[1] + clean[1], 16)
    b = parseInt(clean[2] + clean[2], 16)
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16)
    g = parseInt(clean.slice(2, 4), 16)
    b = parseInt(clean.slice(4, 6), 16)
  } else {
    // Formato desconhecido — fallback seguro
    return "#ffffff"
  }

  // Lineariza os canais (sRGB → linear light) conforme WCAG 2.1
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }

  // Luminância relativa (Y)
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

  // Razão de contraste com branco (L=1) e com escuro (L≈0)
  const contrastWhite = (1 + 0.05) / (L + 0.05)
  const contrastDark  = (L + 0.05) / (0.0 + 0.05)

  return contrastWhite >= contrastDark ? "#ffffff" : "#0f1119"
}
