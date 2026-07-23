---
version: "alpha"
name: Smart LMS (Soft Skills)
description: A design philosophy focused on focus, calmness, and inspiration for soft skills learning.
colors:
  primary: "#2563EB"
  primary-container: "#EFF6FF"
  on-primary: "#FFFFFF"
  secondary: "#64748B"
  secondary-container: "#F8FAFC"
  tertiary: "#93C5FD"
  tertiary-container: "#E0F2FE"
  background: "#FDFDFD"
  surface: "#FFFFFF"
  on-surface: "#1E293B"
  outline: "#E2E8F0"
  error: "#EF4444"
typography:
  h1:
    fontFamily: Inter, sans-serif
    fontSize: 2.5rem
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontFamily: Inter, sans-serif
    fontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: Inter, sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  label-caps:
    fontFamily: Inter, sans-serif
    fontSize: 0.75rem
    fontWeight: 600
    letterSpacing: 0.05em
rounded:
  sm: 8px
  md: 16px
  lg: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
motion:
  duration-sm: 200ms
  duration-md: 400ms
  duration-lg: 800ms
  easing-zen: "cubic-bezier(0.25, 1, 0.5, 1)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: "{spacing.md}"
    typography: "{typography.body-md}"
    transition: "all {motion.duration-md} {motion.easing-zen}"
  button-primary-hover:
    backgroundColor: "#1D4ED8"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    transition: "all {motion.duration-md} {motion.easing-zen}"
---

## Overview

A filosofia de design do nosso LMS é centrada no desenvolvimento humano, criando um ambiente digital que promova o foco, a calma e a inspiração — elementos essenciais para o aprendizado de *soft skills*. A interface reduz o ruído visual, prioriza o respiro (whitespace) e evoca uma estética *premium* através de imagens bonitas, detalhes sutis e gradientes orgânicos.

## Colors

A paleta é ancorada em tons de azul que transmitem serenidade, estabilidade e inteligência, equilibrados com tons neutros calmos para evitar fadiga visual e apoiar a leitura.

- **Primary ({colors.primary}):** O azul principal. Usado em CTAs, links principais e elementos que requerem foco e atenção.
- **Secondary ({colors.secondary}):** Cinza azulado (slate). Utilizado em textos secundários, metadados e ícones de suporte para manter a calma na visão.
- **Background ({colors.background}):** Um off-white leve e sutil, mais amigável que o branco puro, formando a base da aplicação.
- **Text ({colors.on-surface}):** Chumbo escuro de altíssimo contraste, garantindo legibilidade sem o peso visual de um preto sólido.
- **Gradients (Degradês):** O design faz uso intencional de gradientes fluidos e etéreos (como a transição sutil entre azuis claros e lavanda `{colors.tertiary-container}`) em fundos e heros, trazendo dinamismo moderno sem agressividade.

## Typography

Utilizamos tipografia sem serifa (Inter), limpa e legível. Uma plataforma de aprendizado exige uma experiência editorial perfeita, com foco na leitura contínua.

- Textos de conteúdo usam uma altura de linha (`lineHeight: 1.6`) confortável e agradável para longas sessões de leitura.
- O contraste atende aos padrões de acessibilidade visual mais exigentes.

## Layout & Spacing

O espaçamento em branco (whitespace) é uma ferramenta de design, não apenas uma consequência. Usamos múltiplos generosos como `{spacing.xl}` e `{spacing.lg}` para separar conceitos, agrupar informações logicamente e evitar sobrecarga cognitiva. Menos itens comprimidos significam maior capacidade de concentração e foco no aprendizado.

## Elevation & Depth

Evitamos delimitações duras, contornos agressivos e caixas rígidas. Cards e áreas de foco são separados usando sombras extremamente suaves, largas e difusas, fazendo os elementos flutuarem sobre o fundo. Elementos de *glassmorphism* (desfoque de fundo) podem ser aplicados em cabeçalhos ou painéis sobrepostos (modais).

## Shapes

O arredondamento é usado consistentemente (`{rounded.md}` a `{rounded.lg}`) em bordas de imagens, cartões e botões (podendo chegar a `{rounded.full}`). Superfícies curvas transmitem uma sensação de amigabilidade, empatia e humanização — pilares de uma plataforma de *soft skills*.

## Motion

A animação desempenha um papel crítico na criação de uma atmosfera "zen" e focada. As transições nunca devem ser abruptas ou instantâneas.

- **Aparição Suave (Fade In):** Os elementos devem entrar na tela através de *fades* lentos e leves deslocamentos de baixo para cima (efeito de revelação suave).
- **Sequenciamento (Staggering):** Listas, cartões e blocos de texto não devem aparecer de uma única vez. Um carregamento sequenciado com pequenos atrasos (delays de 100ms a 200ms) guia o olho do usuário e transmite uma sensação de tranquilidade, ordem e controle.
- **Elegância (Easing):** As curvas de animação (`{motion.easing-zen}`) usam acelerações e desacelerações muito suaves.
- **Micro-interações:** Efeitos de *hover* em botões e cartões levam ligeiramente mais tempo (`{motion.duration-md}`) para serem completados, reforçando um ambiente relaxante e altamente polido.

## Do's and Don'ts

- **Do:** Escolha fotografias bonitas e inspiradoras que mostrem conexões, liderança e comunicação. A estética Premium é essencial.
- **Do:** Mantenha a interface minimalista. Apenas as informações estritamente necessárias devem competir pela atenção do usuário.
- **Don't:** Não use cores excessivamente vibrantes, agressivas ou de alerta (ex: neon, vermelhos), a menos que para feedback crítico do sistema.
- **Don't:** Não encha as telas com linhas separadoras fortes; use espaçamento em branco ou leves diferenças de *background* para agrupar conteúdos.

## Setup & Initialization

Para iniciar o projeto e configurar os componentes de UI base, utilize o seguinte comando:

```bash
pnpm dlx shadcn@latest init --preset b2cgo7C9ha --template next
```
