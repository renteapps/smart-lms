import type { Theme } from "@blocknote/mantine";

/**
 * Tema do BlockNote mapeado para os tokens semânticos do HeroUI (design.md).
 *
 * Usamos `var(--token)` como valor em vez de resolver a cor: o BlockNote só
 * escreve essas strings como `style.setProperty`, então a cascata do CSS
 * cuida do claro/escuro sozinha — não precisamos de um Theme separado por
 * modo nem de sincronizar com `usePrefersColorScheme`.
 */
export const lessonEditorTheme: Theme = {
  colors: {
    editor: {
      text: "var(--foreground)",
      background: "var(--surface)",
    },
    menu: {
      text: "var(--foreground)",
      background: "var(--surface)",
    },
    tooltip: {
      text: "var(--foreground)",
      background: "var(--surface-secondary)",
    },
    hovered: {
      text: "var(--foreground)",
      background: "var(--accent-soft)",
    },
    selected: {
      text: "var(--accent-foreground)",
      background: "var(--accent)",
    },
    disabled: {
      text: "var(--muted)",
      background: "var(--surface-secondary)",
    },
    shadow: "var(--hairline-strong)",
    border: "var(--border)",
    sideMenu: "var(--muted)",
  },
  borderRadius: 8,
  fontFamily: "var(--font-sans)",
};
