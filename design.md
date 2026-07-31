---
version: "1.0"
name: "Smart LMS — Editorial Humano"
description: "Sistema visual para uma experiência de aprendizagem acolhedora, clara e orientada à prática."
fonts:
  display: "Manrope, sans-serif"
  interface: "DM Sans, sans-serif"
colors:
  background: "#F7F7F4"
  surface: "#FFFFFF"
  surfaceSoft: "#F0F1EE"
  ink: "#172033"
  inkSoft: "#667085"
  primary: "#3157B7"
  primaryStrong: "#244596"
  primarySoft: "#E9EEFB"
  terracotta: "#C97957"
  sage: "#73947F"
  border: "#E1E4E8"
  positive: "#327A55"
  warning: "#9A6700"
  negative: "#B5473C"
radii:
  control: "8px"
  card: "10px"
  feature: "14px"
  pill: "999px"
spacing:
  scale: [4, 8, 12, 16, 24, 32, 48, 64, 96]
motion:
  fast: "160ms"
  standard: "240ms"
  slow: "360ms"
  easing: "cubic-bezier(0.22, 1, 0.36, 1)"
---

# Smart LMS — sistema de design

## 1. Princípio central

O Smart LMS ajuda pessoas a transformar conhecimento em prática. A interface deve parecer humana, editorial e confiante: acolhedora o bastante para reduzir a ansiedade de aprender e clara o bastante para indicar sempre o próximo passo.

O produto tem duas cadências complementares:

- **Estudante:** narrativa, inspiração, progresso e foco. Usa fotografia humana, respiro e chamadas de ação muito claras.
- **Admin:** precisão, contexto e eficiência. Compartilha a marca, mas usa maior densidade, navegação persistente e padrões operacionais previsíveis.

## 2. Personalidade

- **Humana:** linguagem direta, fotografias de colaboração real e mensagens que reconhecem esforço.
- **Editorial:** hierarquia forte, títulos expressivos, composições assimétricas controladas e leitura confortável.
- **Premium:** acabamento cuidadoso, paleta contida, superfícies táteis e movimentos discretos.
- **Prática:** cada tela responde “onde estou?”, “o que mudou?” e “qual é a próxima ação?”.

Evitar estética de streaming, excesso de carrosséis, gradientes elétricos, glassmorphism gratuito, sombras pesadas e grandes áreas vazias sem função.

## 3. Cores

### Base

- `background #F7F7F4`: canvas quente do tema claro.
- `surface #FFFFFF`: cards, menus, modais e áreas elevadas.
- `surface-soft #F0F1EE`: filtros, agrupamentos e estados neutros.
- `ink #172033`: texto principal e títulos.
- `ink-soft #667085`: descrições e metadados.
- `border #E1E4E8`: separadores discretos.

### Marca e acentos

- `primary #3157B7`: ações principais, links, progresso e navegação ativa.
- `primary-strong #244596`: hover/pressed e texto azul sobre fundo claro.
- `primary-soft #E9EEFB`: fundos de seleção e destaque.
- `terracotta #C97957`: calor humano, destaques editoriais e ilustrações; nunca substituir o CTA primário.
- `sage #73947F`: equilíbrio, conclusão e bem-estar.

Estados positivos, de atenção e negativos sempre combinam cor, ícone e texto. Nunca comunicar estado apenas por cor.

## 4. Tipografia

- **Manrope:** marca, títulos de página, números de destaque e chamadas editoriais.
- **DM Sans:** navegação, texto, formulários, tabelas e controles.
- Títulos usam entre `600–800`; corpo usa `400–600`.
- Corpo padrão: `16px / 1.6`. Texto auxiliar nunca menor que `12px / 1.45`.
- Linhas editoriais devem permanecer entre 55 e 75 caracteres.
- Evitar caixa-alta em frases; reservar tracking ampliado para eyebrow e metadados curtos.

## 5. Layout, densidade e responsividade

- Grid do estudante: máximo de `1280px`, margens de `16/24/40px` e seções de `64–96px`.
- Grid do admin: máximo de `1440px`, margens de `20/32px` e seções de `24–40px`.
- Sidebar admin: `272px` expandida e `80px` recolhida.
- Breakpoints de validação: `390`, `768`, `1280` e `1440px`.
- Controles clicáveis têm pelo menos `44×44px` em telas de toque.
- Tabelas administrativas viram cards abaixo de `768px`; não depender de rolagem horizontal para tarefas centrais.

## 6. Superfícies e formas

- Controles: raio de `8px`; cards: `10px`; áreas de destaque: no máximo `14px`. Pills (`999px`) aparecem somente em filtros, status e ações compactas.
- Superfícies grandes devem parecer arquitetônicas e precisas: quanto maior o painel, menor deve ser a sensação de “cápsula”. Evitar cantos acima de `14px` em cards, modais, imagens e blocos editoriais.
- Cards padrão usam borda de 1px e sombra curta. Sombra grande é reservada a modais e elementos flutuantes.
- Não elevar todos os elementos: profundidade existe para indicar hierarquia, não decoração.
- Fotografias usam proporções consistentes, `object-fit: cover`, overlay azul-marinho discreto e foco em pessoas praticando colaboração, comunicação e liderança.

## 7. Componentes

### Ações

- Um CTA primário por região visual.
- Botão primário azul; secundário branco com borda; ghost para ações de baixa prioridade; destructive sempre rotulado.
- Estados `hover`, `focus-visible`, `active`, `disabled` e `loading` são obrigatórios.

### Navegação

- Estudante: header fixo, item ativo evidente e menu móvel completo. Busca, notificações e conta permanecem acessíveis.
- Sala de aula: shell próprio, sidebar recolhível e drawer móvel. Sem footer ou assistente flutuante.
- Admin: sidebar agrupada, item ativo, breadcrumbs, busca e conta. Navegação não deve competir com o conteúdo.

### Conteúdo

- `PageHeader` contém eyebrow opcional, título, descrição e ações.
- Cards de curso priorizam imagem, título, objetivo, duração e progresso.
- Cards de aula priorizam continuidade: status, tempo e ação.
- Tabelas têm cabeçalho persistente quando necessário, linhas com hover discreto, ações visíveis e versão em cards no mobile.
- Formulários agrupam campos por intenção e usam barra de salvamento fixa em editores longos.

### Onboarding

- A troca de pergunta usa deslocamento curto, opacidade e leve desfoque direcional; as opções entram em sequência, sem saltos ou escalas excessivas.
- Cards de resposta usam numeração, estado selecionado inequívoco e feedback de elevação de até `3px`.
- O visual “Bolhas dinâmicas” é uma representação direta das opções do admin: uma opção gera exatamente uma bolha.
- Bolhas não criam sub-bolhas, não se sobrepõem e não escondem ações. Ao selecionar, a bolha cresce cerca de `24px` em tamanho real e redistribui as vizinhas com uma mola compartilhada; o movimento ambiente é lento e interrompido por `prefers-reduced-motion`.
- Cada bolha é um botão real com `aria-pressed`, foco visível e rótulo legível; seleção nunca depende apenas de cor.

## 8. Motion

- `160ms`: hover, foco e feedback imediato.
- `240ms`: menus, tabs, acordeões e drawers.
- `360ms`: entrada de seções ou mudança de contexto.
- Animar apenas `opacity`, `transform`, cores e sombras necessárias. Nunca usar `transition: all`.
- A interface deve funcionar integralmente com `prefers-reduced-motion: reduce`; nesse modo, remover deslocamentos, escalas e animações contínuas.

## 9. Acessibilidade

- Contraste mínimo WCAG AA para texto e controles.
- Foco visível com anel azul e offset suficiente.
- Hierarquia semântica de títulos sem saltos.
- Ícones decorativos usam `aria-hidden`; botões de ícone têm nome acessível.
- Imagens relevantes têm texto alternativo; imagens decorativas usam `alt=""`.
- Menus, tabs, modais, players e formulários devem ser operáveis por teclado.

## 10. Tema escuro

O tema claro é a experiência principal desta versão. Tokens escuros continuam definidos e coerentes para compatibilidade, mas não há alternância exposta ao usuário nesta rodada. Nenhuma tela deve conter fundos escuros hardcoded fora de mídia, player de vídeo ou preview deliberado.

## 11. Checklist de aceite visual

- A próxima ação é identificável em até três segundos.
- Navegação ativa e contexto atual estão visíveis.
- Nenhum elemento fixo cobre ação ou conteúdo importante.
- Desktop e mobile preservam a mesma ordem de prioridade.
- Estados vazio, carregando, erro, sucesso e desabilitado pertencem ao mesmo sistema.
- `design.md`, tokens CSS e componentes usam os mesmos nomes e valores.
