---
version: "2.0"
name: "Smart LMS — HeroUI"
description: "Sistema de design da plataforma, construído sobre o HeroUI v3 (React Aria + Tailwind CSS v4)."
library: "@heroui/react@3"
stylesheet: "@heroui/styles/css"
tokens:
  background: "var(--background)"
  surface: "var(--surface)"
  foreground: "var(--foreground)"
  muted: "var(--muted)"
  accent: "var(--accent)"
  success: "var(--success)"
  warning: "var(--warning)"
  danger: "var(--danger)"
  border: "var(--border)"
  radius: "0.625rem"
fonts:
  display: "Manrope"
  interface: "DM Sans"
---

# Smart LMS — sistema de design

## 1. Fundamento

A plataforma usa **HeroUI v3** (`@heroui/react`) como biblioteca de componentes. O HeroUI é construído sobre **React Aria Components** (acessibilidade e comportamento) e **Tailwind CSS v4** (estilo), e é a fonte da verdade visual: paleta, raios, sombras, espaçamento, foco e motion vêm do tema padrão do HeroUI.

Regra central: **não recriar o que o HeroUI já entrega.** Antes de escrever um `<div>` com classes utilitárias, verificar se existe componente equivalente. Markup próprio é reservado a composições de produto (cards de curso, trilha semanal, seletor de bolhas do onboarding), e mesmo essas devem consumir os tokens do HeroUI.

### Instalação e wiring

- Pacote: `@heroui/react` (inclui `@heroui/styles`).
- CSS: `src/app/globals.css` faz `@import "@heroui/styles/css"` — isso já traz o Tailwind v4, o `tw-animate-css`, a base, os estilos de componente e o tema padrão. Não importar `tailwindcss` de novo.
- Como o Tailwind é importado de dentro de `node_modules`, `globals.css` declara `@source "../"` para que as classes de `src/` sejam detectadas.
- Não existe `HeroUIProvider` no v3 — os componentes funcionam sem provider. A única exceção é `Toast.Provider`, montado uma vez no shell da aplicação.
- Fontes continuam carregadas por `next/font/google` em `src/app/layout.tsx` (Manrope para display, DM Sans para interface); o HeroUI não define família tipográfica própria.

## 2. Princípio de produto

O Smart LMS ajuda pessoas a transformar conhecimento em prática. A interface deve ser clara, calma e sempre indicar o próximo passo.

Duas cadências compartilham o mesmo sistema:

- **Estudante:** narrativa, progresso e foco. Mais respiro, tipografia maior, uma ação primária evidente por tela.
- **Admin:** precisão e eficiência. Maior densidade, navegação persistente, tabelas e formulários previsíveis.

A diferença entre elas é de **densidade e hierarquia**, nunca de vocabulário visual: os dois usam os mesmos componentes e os mesmos tokens.

## 3. Cores

O HeroUI trabalha com papéis semânticos, não com nomes de cor. Usar sempre o papel.

| Token | Utilitário Tailwind | Uso |
| --- | --- | --- |
| `--background` | `bg-background` | Canvas da página |
| `--background-secondary` / `-tertiary` | `bg-background-secondary` | Agrupamentos e zonas neutras |
| `--surface` | `bg-surface` | Cards, painéis, áreas elevadas |
| `--surface-secondary` / `-tertiary` | `bg-surface-secondary` | Superfícies aninhadas |
| `--overlay` | `bg-overlay` | Modais, popovers, menus, tooltips |
| `--foreground` | `text-foreground` | Texto principal |
| `--muted` | `text-muted` | Descrições, metadados, texto auxiliar |
| `--accent` | `bg-accent` / `text-accent` | Ação principal, navegação ativa, progresso |
| `--success` / `--warning` / `--danger` | idem | Estados |
| `--default` | `bg-default` | Superfície neutra de controle |
| `--border` / `--separator` | `border-border` | Bordas e divisores |
| `--focus` | — | Anel de foco (aplicado pelos componentes) |

Cada papel tem `-foreground` (texto sobre a cor), `-hover` e `-soft` (fundo suave + `-soft-foreground`). Preferir a variação `soft` para badges, destaques e fundos informativos.

Estado nunca é comunicado só por cor: sempre cor + ícone + texto.

### Aliases legados

O código anterior usava um vocabulário próprio (`text-ink`, `bg-canvas-soft`, `text-text-soft`, `bg-primary-pale`…). Esses nomes seguem funcionando porque `globals.css` os aponta para os tokens do HeroUI, mas são **camada de compatibilidade em extinção**: código novo usa os tokens desta tabela, e código tocado durante manutenção deve ser convertido.

| Legado | Substituir por |
| --- | --- |
| `text-ink`, `text-ink-deep`, `text-text`, `text-body-text` | `text-foreground` |
| `text-text-soft`, `text-text-mute` | `text-muted` |
| `bg-canvas`, `bg-bg` | `bg-background` |
| `bg-canvas-soft` | `bg-background-secondary` |
| `bg-surface`, `bg-surface-card` | `bg-surface` |
| `bg-primary`, `text-primary`, `border-primary` | `bg-accent`, `text-accent`, `border-accent` |
| `bg-primary-pale` | `bg-accent-soft` |
| `text-primary-active` | `text-accent-soft-foreground` |
| `text-on-primary` | `text-accent-foreground` |
| `text-positive`, `bg-positive` | `text-success`, `bg-success` |
| `text-negative`, `bg-negative` | `text-danger`, `bg-danger` |
| `bg-accent-orange`, `bg-accent-sage` | `bg-warning`, `bg-success` |
| `.editorial-card` | `<Card>` |

## 4. Tipografia

- **Manrope** (`font-display`): títulos de página, números de destaque, chamadas editoriais.
- **DM Sans** (`font-sans`, padrão do `body`): interface, texto corrido, formulários, tabelas.
- Para texto estruturado, preferir `<Typography type="h1|h2|h3|h4|h5|body|code">` com `color="default|muted"`. Para blocos de conteúdo longo (artigos, descrição de aula), usar `Typography.Prose`.
- Corpo padrão 16px/1.6; texto auxiliar nunca abaixo de 12px.
- Hierarquia semântica de headings sem saltos; peso e tamanho seguem o componente, não classes ad hoc.

## 5. Layout e densidade

- Estudante: largura máxima `1280px` (`.editorial-container`), seções de 64–96px.
- Admin: largura máxima `1440px` (`.admin-container`), seções de 24–40px.
- Sidebar admin: `272px` expandida, `80px` recolhida; vira `Drawer` abaixo de `1024px`.
- Breakpoints de validação: `390`, `768`, `1280`, `1440px`.
- Alvos de toque com pelo menos `44×44px`.
- Tabelas viram cards abaixo de `768px`. Não usar rolagem horizontal para tarefas centrais.

## 6. Forma e profundidade

- `--radius` do produto é `0.625rem`; todos os raios derivam dele (`rounded-sm|md|lg|xl|2xl`). Não usar raios arbitrários.
- Elevação vem de `shadow-surface` (cards) e `shadow-overlay` (modais, popovers). Profundidade indica hierarquia, não decoração.
- Imagens usam proporção consistente e `object-fit: cover`.

## 7. Componentes

Sempre importar de `@heroui/react`. O v3 usa **API composta com ponto** (`Card.Header`, `Modal.Body`, `Tabs.Tab`).

### Ações — `Button`

Variantes: `primary` (uma por região visual), `secondary`, `tertiary`, `outline`, `ghost`, `danger`, `danger-soft`. Tamanhos `sm | md | lg`. Props: `isDisabled`, `isIconOnly`, `fullWidth`. `onClick` é aceito (alias de `onPress`). Botão só de ícone exige `aria-label`.

```tsx
<Button variant="primary" onClick={salvar}>Salvar</Button>
<Button variant="tertiary" onClick={cancelar}>Cancelar</Button>
<Button variant="danger-soft" isDisabled={!podeExcluir}>Excluir</Button>
<Button isIconOnly size="sm" aria-label="Editar"><Pencil className="size-4" /></Button>
```

### Superfícies — `Card`

```tsx
<Card>
  <Card.Header>
    <Card.Title>Título</Card.Title>
    <Card.Description>Apoio</Card.Description>
  </Card.Header>
  <Card.Content>…</Card.Content>
  <Card.Footer>…</Card.Footer>
</Card>
```

Variantes: `default`, `secondary`, `tertiary`, `transparent`.

### Formulários — `TextField`, `TextArea`, `Select`, `Checkbox`, `Switch`

Todo campo tem `Label`. Ajuda vai em `Description`, erro em `FieldError`. Validação usa `isRequired` / `isInvalid` do React Aria, não estado manual de string.

```tsx
<TextField value={nome} onChange={setNome} isRequired>
  <Label>Nome do curso</Label>
  <Input placeholder="Ex.: Comunicação assertiva" />
  <Description>Aparece no catálogo.</Description>
  <FieldError>Informe um nome.</FieldError>
</TextField>

<Select selectedKey={status} onSelectionChange={(k) => setStatus(String(k))}>
  <Label>Status</Label>
  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
  <Select.Popover>
    <ListBox>
      <ListBoxItem id="rascunho">Rascunho</ListBoxItem>
      <ListBoxItem id="publicado">Publicado</ListBoxItem>
    </ListBox>
  </Select.Popover>
</Select>

<Switch isSelected={ativo} onChange={setAtivo}>
  <Switch.Content>Publicar imediatamente</Switch.Content>
  <Switch.Control><Switch.Thumb /></Switch.Control>
</Switch>
```

Busca usa `SearchField` (com `SearchField.SearchIcon` e `SearchField.ClearButton`), não um `Input` com lupa decorativa.

### Sobreposições — `Modal`, `Drawer`, `Popover`, `Tooltip`

Nenhuma tela deve construir overlay próprio com `position: fixed`. Diálogos de confirmação destrutiva usam `AlertDialog`.

```tsx
<Modal.Root isOpen={aberto} onOpenChange={setAberto}>
  <Modal.Backdrop>
    <Modal.Container size="lg">
      <Modal.Dialog>
        <Modal.Header>Nova pílula</Modal.Header>
        <Modal.Body>…</Modal.Body>
        <Modal.Footer>
          <Button variant="tertiary" onClick={() => setAberto(false)}>Cancelar</Button>
          <Button variant="primary" onClick={salvar}>Salvar</Button>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal.Container>
  </Modal.Backdrop>
</Modal.Root>
```

`Modal.Container` aceita `size` (`xs|sm|md|lg|full|cover`), `placement` e `scroll`. `Drawer.Content` aceita `placement` (`left|right|top|bottom`) — é o padrão para navegação móvel e painéis laterais.

### Navegação — `Tabs`, `Breadcrumbs`, `Dropdown`, `Pagination`

```tsx
<Tabs.Root selectedKey={aba} onSelectionChange={(k) => setAba(String(k))}>
  <Tabs.List aria-label="Seções do curso">
    <Tabs.Tab id="conteudo">Conteúdo</Tabs.Tab>
    <Tabs.Tab id="alunos">Alunos</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="conteudo">…</Tabs.Panel>
  <Tabs.Panel id="alunos">…</Tabs.Panel>
</Tabs.Root>
```

Menus de ação por linha usam `Dropdown.Root > Dropdown.Trigger > Dropdown.Popover > Dropdown.Menu > Dropdown.Item`.

### Dados — `Table`

```tsx
<Table.Root>
  <Table.ScrollContainer>
    <Table.Content aria-label="Cursos">
      <Table.Header>
        <Table.Column isRowHeader>Nome</Table.Column>
        <Table.Column>Status</Table.Column>
      </Table.Header>
      <Table.Body items={cursos}>
        {(curso) => (
          <Table.Row id={curso.id}>
            <Table.Cell>{curso.nome}</Table.Cell>
            <Table.Cell><Chip color="success" variant="soft" size="sm">{curso.status}</Chip></Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table.Content>
  </Table.ScrollContainer>
</Table.Root>
```

`Table.Content` exige `aria-label`. Toda tabela precisa de estado vazio (`EmptyState`) e de uma versão em cards no mobile.

### Estado e feedback

- `Chip` — status e etiquetas. `color`: `default|accent|success|warning|danger`; `variant`: `primary|secondary|tertiary|soft`.
- `Alert` — mensagem persistente na página, com `Alert.Indicator`, `Alert.Title` e `Alert.Description`. `status`: `default|accent|success|warning|danger`.
- `toast(mensagem, { description, variant })` — confirmação efêmera; também `toast.success`, `toast.warning`, `toast.danger`, `toast.info`, `toast.promise`. Exige `Toast.Provider` montado no shell.
- `Spinner` — carregamento pontual. `Skeleton` — carregamento de layout conhecido (preferir a spinner em listas e cards).
- `ProgressBar` — progresso determinado (trilha, curso, aula), com `ProgressBar.Track` e `ProgressBar.Fill`.
- `EmptyState` — toda lista, tabela e busca precisa do seu.

Os cinco estados — vazio, carregando, erro, sucesso e desabilitado — pertencem ao mesmo sistema e devem existir em qualquer superfície que carregue dados.

### Composições de produto

Vivem em `src/components` e não são substituíveis por componentes da biblioteca, mas devem ser construídas **sobre** ela:

- `PageHeader`, `StatCard`, `StatusBadge` (`src/components/ui/editorial.tsx`) — montados sobre `Card` e `Chip`.
- `CourseCard`, `LessonCard`, `WeeklyTrailSection`, `MinhaTrilhaRow`, `DailyPill` — cards de conteúdo sobre `Card`, `Chip` e `ProgressBar`.
- `PhysicsKeywordSelector` — seletor de bolhas do onboarding. Interação própria com framer-motion; cores, raios e foco vêm dos tokens.

## 8. Onboarding

- A troca de pergunta usa deslocamento curto e opacidade; as opções entram em sequência, sem saltos.
- Cada bolha é um botão real com `aria-pressed`, foco visível e rótulo legível; seleção nunca depende só de cor.
- Uma opção do admin gera exatamente uma bolha. Bolhas não se sobrepõem nem escondem ações.
- Ao selecionar, a bolha cresce ~24px e redistribui as vizinhas com uma mola compartilhada; o movimento ambiente para em `prefers-reduced-motion`.

## 9. Motion

- O HeroUI já anima seus próprios componentes (overlays, tabs, toasts). Não empilhar `motion.div` em volta deles.
- `framer-motion` fica reservado a transições de página (`src/app/template.tsx`), carrosséis e ao onboarding.
- Escalas de duração: `160ms` (hover/foco), `240ms` (menus, tabs, drawers), `360ms` (troca de contexto). Curvas em `--ease-out-*` / `--ease-in-out-*`.
- Animar apenas `opacity`, `transform`, cores e sombras. Nunca `transition: all`.
- A interface funciona integralmente com `prefers-reduced-motion: reduce`.

## 10. Acessibilidade

O React Aria cobre teclado, foco e ARIA dos componentes da biblioteca — o que exige que se use o componente em vez de recriá-lo.

- Contraste mínimo WCAG AA.
- `Table.Content`, `Tabs.List` e regiões de navegação precisam de `aria-label`.
- Botões de ícone precisam de nome acessível; ícones decorativos usam `aria-hidden`.
- Imagens relevantes têm `alt` descritivo; decorativas usam `alt=""`.
- Hierarquia de headings sem saltos.

## 11. Tema escuro

O tema claro é a experiência principal. O HeroUI define os tokens escuros em `.dark` / `[data-theme="dark"]` e o app os herda automaticamente; a alternância não está exposta ao usuário nesta versão. Nenhuma tela deve conter fundo escuro hardcoded fora de mídia e player de vídeo.

## 12. Linguagem visual da área do aluno

A área do estudante carrega a personalidade do produto. A referência é a precisão do Stripe, os materiais do Fluent e a contenção editorial da BMW: **poucos elementos, muito bem resolvidos**. Nada aqui é decoração — cada recurso resolve hierarquia, profundidade ou resposta ao toque.

O princípio que separa isso de "interface bonita": **contenção**. Uma tela tem no máximo um gesto expressivo. Se tudo brilha, nada se destaca.

### Tipografia editorial

O tracking negativo cresce junto com o corpo da fonte — compensação óptica: título grande com tracking normal parece frouxo.

| Classe | Uso |
| --- | --- |
| `.display-1` | Herói da página. Um por tela. |
| `.display-2` | Abertura de seção |
| `.display-3` | Título de bloco/card grande |
| `.lede` | Parágrafo de abertura, medida travada em 62ch |
| `.eyebrow` | Rótulo acima do título |

`text-wrap: balance` já está aplicado nos displays (evita a linha órfã, o detalhe que mais denuncia layout amador) e `.lede` usa `pretty`. Números que se comparam — progresso, métricas, durações — levam `data-numeric` para virarem tabulares e não "dançarem" ao atualizar.

Ritmo vertical de seção: `.section-rhythm` (`clamp(3.5rem, 7vw, 6.5rem)`).

### Elevação

Quatro níveis (`shadow-elev-1` a `-4`), cada um somando um contato próximo (nitidez) a uma difusão ampla (peso) — profundidade que se lê como luz de ambiente, não como sombra desenhada.

| Nível | Uso |
| --- | --- |
| `elev-1` | Repouso sutil, itens de lista |
| `elev-2` | Card padrão (`.surface-card`) |
| `elev-3` | Hover de card, popovers |
| `elev-4` | Modais, elementos flutuantes |

Bordas são **hairlines** (`border-hairline`, `--hairline-strong` no hover), nunca linhas cheias.

### Materiais

Acrílico em três espessuras, com grão sobreposto — o grão quebra o degradê perfeito do blur e é o que separa vidro premium de plástico translúcido.

| Classe | Espessura | Usar em |
| --- | --- | --- |
| `.material-thin` | 44% | Sobreposição em imagem/vídeo |
| `.material` | 68% | Header fixo, painéis flutuantes |
| `.material-thick` | 86% | Superfície com texto denso (contraste AA obrigatório) |

`.glass`, `.glass-faint` e `.glass-strong` são aliases da rodada anterior e continuam válidos.

**Só usar onde há conteúdo real passando por trás.** Sobre fundo chapado o material vira cinza sujo. Fora: cards comuns, tabelas, formulários, texto longo.

`.ambient-canvas` (no `RouteShell`) pinta a malha de gradiente que dá ao material algo para refratar — é pré-requisito, não enfeite.

### Interação

| Classe | Efeito |
| --- | --- |
| `.lift` | Sobe 3px com elevação ao hover |
| `.press` | Recua para 97.5% ao pressionar |
| `.reveal` | Foco de luz segue o cursor (componente `Reveal`) |
| `.reveal-edge` | O realce acompanha a própria borda — reservar para cards de destaque |
| `.sheen` | Brilho diagonal atravessa no hover |
| `.underline-grow` | Sublinhado cresce da esquerda |
| `.rise` | Entrada ao rolar (componente `Rise`) |

Máximo de duas por elemento. Um card de curso usa `.lift` + `.reveal`; somar `.sheen` em cima já é ruído.

`Reveal` escreve as coordenadas direto no nó dentro de um `requestAnimationFrame` em vez de usar estado do React — mousemove dispara dezenas de vezes por segundo, e re-renderizar a árvore a cada evento derrubaria o frame rate justo na interação que deveria parecer suave. Em toque e com reduced-motion o efeito nem é anexado.

Curvas: `--ease-precise` para transições de UI; `--spring` (curva `linear()`) para o retorno elástico dos ícones.

### Ícones

- **Uso corrente** — `lucide-react` com `.icon-spring`, `.icon-lift` ou `.icon-rotate`.
- **Destaques** — `src/components/ui/AnimatedIcon.tsx`: cada traço tem `pathLength="1"` + `data-draw`, o que faz `.icon-draw` (no ancestral que recebe o hover) animar o desenho de forma idêntica em todos, independente do comprimento real do path.

Reservar o desenho para navegação, estados vazios e cabeçalhos de seção. Em lista longa vira poluição.

### Limites

- Nunca animar `width`, `height`, `top`/`left`, nem aplicar filtro custoso em elemento repetido.
- `prefers-reduced-motion` e `prefers-reduced-transparency` já degradam tudo isto automaticamente; interações próprias em framer-motion devem checar `useReducedMotion()`.
- Se um efeito não sobrevive a essas duas preferências, ele não entra.

## 13. Checklist de aceite

- A próxima ação é identificável em até três segundos.
- Nenhum overlay, botão, tabela ou campo foi reconstruído à mão onde existe componente HeroUI.
- Navegação ativa e contexto atual estão visíveis.
- Estados vazio, carregando, erro, sucesso e desabilitado existem e pertencem ao mesmo sistema.
- Desktop e mobile preservam a mesma ordem de prioridade.
- Nenhuma cor, raio ou sombra hardcoded fora dos tokens.
- Fluxo completo operável por teclado, com foco sempre visível.
