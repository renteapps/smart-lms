import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  CalendarClock,
  GitBranch,
  Gauge,
  Library,
  Link2,
  ListChecks,
  RefreshCw,
  Route,
  Ruler,
  ShieldCheck,
  Sparkles,
  Target,
  History,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/editorial";
import {
  BUDGET_TOLERANCE,
  DEFAULT_AVAILABILITY,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  weeklyMinutes,
} from "@/lib/matching";

export const metadata: Metadata = {
  title: "Admin | Regras das trilhas",
  description: "Todas as regras que o motor usa para transformar respostas do onboarding em uma trilha de estudo.",
};

/*
 * Documentação viva do motor de trilhas.
 *
 * Os números que a página cita vêm das próprias constantes de `lib/matching` —
 * assim uma mudança na tolerância ou nos limites de minutos aparece aqui sem
 * ninguém precisar lembrar de reescrever o texto. O resto é curadoria editorial
 * das regras que estão espalhadas por `matching.ts`, `contentCatalog.ts`,
 * `data/content.ts`, `adminTrailDiagnostics.ts` e as actions de publicação.
 */

const TOLERANCE_PERCENT = Math.round(BUDGET_TOLERANCE * 100);
const FLOOR_PERCENT = 100 - TOLERANCE_PERCENT;
const CEILING_PERCENT = 100 + TOLERANCE_PERCENT;

const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const DEFAULT_DAYS = DEFAULT_AVAILABILITY.weekdays.map((day) => WEEKDAY_NAMES[day]).join(", ");
const DEFAULT_WEEKLY = weeklyMinutes(DEFAULT_AVAILABILITY);

type SectionMeta = { id: string; title: string; icon: LucideIcon };

const SECTIONS: SectionMeta[] = [
  { id: "visao-geral", title: "Como uma trilha nasce", icon: Route },
  { id: "questionario", title: "O questionário", icon: ListChecks },
  { id: "opcoes", title: "Opções, tags e conteúdos", icon: Link2 },
  { id: "catalogo", title: "O catálogo mapeável", icon: Library },
  { id: "pontuacao", title: "Pontuação e seleção", icon: Target },
  { id: "afinidade", title: "Sugestão automática", icon: Sparkles },
  { id: "prerequisitos", title: "Pré-requisitos e sequência", icon: GitBranch },
  { id: "ordenacao", title: "A ordem final da fila", icon: ArrowDownWideNarrow },
  { id: "agenda", title: "Como o calendário é montado", icon: CalendarClock },
  { id: "adaptacao", title: "Adaptação ao aluno", icon: Gauge },
  { id: "manutencao", title: "Mudanças no catálogo", icon: RefreshCw },
  { id: "publicacao", title: "Rascunho, publicação e versões", icon: History },
  { id: "validacoes", title: "Validações e diagnósticos", icon: ShieldCheck },
  { id: "constantes", title: "Referência rápida", icon: Ruler },
];

function Section({
  meta,
  step,
  lead,
  children,
}: {
  meta: SectionMeta;
  step: number;
  lead: string;
  children: React.ReactNode;
}) {
  const Icon = meta.icon;
  return (
    <section id={meta.id} className="scroll-mt-28">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">{String(step).padStart(2, "0")}</p>
          <h2 className="mt-0.5 font-display text-2xl font-bold tracking-tight text-foreground">{meta.title}</h2>
        </div>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{lead}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

type Rule = { term: string; desc: React.ReactNode };

function RuleList({ items }: { items: Rule[] }) {
  return (
    <dl className="editorial-card divide-y divide-border/40 overflow-hidden">
      {items.map((rule) => (
        <div key={rule.term} className="grid gap-1.5 p-4 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] sm:gap-5 sm:p-5">
          <dt className="text-sm font-bold leading-6 text-foreground">{rule.term}</dt>
          <dd className="text-sm leading-6 text-muted">{rule.desc}</dd>
        </div>
      ))}
    </dl>
  );
}

const noteTones = {
  accent: "border-accent/25 bg-accent/5 text-foreground",
  warning: "border-warning/30 bg-warning/8 text-foreground",
  danger: "border-danger/30 bg-danger/5 text-foreground",
  success: "border-success/30 bg-success/5 text-foreground",
} as const;

function Note({ tone = "accent", title, children }: { tone?: keyof typeof noteTones; title: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 text-sm leading-6 ${noteTones[tone]}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-muted">{children}</p>
    </div>
  );
}

/** Passo do fluxo na abertura da página — a versão curta do que as seções detalham. */
function FlowStep({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <li className="editorial-card p-4">
      <span className="grid size-7 place-items-center rounded-lg bg-accent/10 text-xs font-bold text-accent">{step}</span>
      <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
    </li>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return <strong className="font-bold text-foreground">{children}</strong>;
}

const BLOCKING_VALIDATIONS = [
  "Existe exatamente uma pergunta de disponibilidade.",
  "A disponibilidade é a última pergunta do questionário.",
  "Toda pergunta comum tem ao menos uma opção de resposta.",
  "Todo conteúdo vinculado ainda é encontrado no catálogo (ou, no link externo, tem endereço e duração próprios).",
  "Todo artigo e link externo tem duração estimada preenchida.",
];

const DIAGNOSTICS: Array<{ severity: "error" | "warning" | "info"; title: string; detail: string }> = [
  {
    severity: "error",
    title: "Conteúdo não encontrado no catálogo",
    detail: "O curso, módulo, aula ou artigo vinculado foi despublicado, arquivado ou excluído. Trava a publicação.",
  },
  {
    severity: "error",
    title: "Pré-requisito ausente",
    detail: "Um conteúdo recomendado depende de uma aula que não está mais disponível. O aluno recebe um aviso no item.",
  },
  {
    severity: "warning",
    title: "Resposta sem conteúdo associado",
    detail: "A opção não vincula nada e só influencia a trilha pelas tags. Costuma ser esquecimento de curadoria.",
  },
  {
    severity: "warning",
    title: "Trilha potencialmente longa",
    detail: `A curadoria acumula mais de 8 semanas de conteúdo no ritmo padrão (${DEFAULT_WEEKLY} min por semana). Considere mover parte para “Extra”.`,
  },
  {
    severity: "warning",
    title: "Sessão acima da meta",
    detail: `Ao menos um conteúdo é mais longo que a sessão padrão de ${DEFAULT_AVAILABILITY.minutesPerSession} minutos e ficará sozinho no dia.`,
  },
  {
    severity: "info",
    title: "Conteúdo em respostas exclusivas",
    detail: "O mesmo conteúdo aparece em duas opções de uma pergunta de escolha única. Confirme se a recomendação deve mesmo ser comum às duas.",
  },
  {
    severity: "info",
    title: "Carga semanal desbalanceada",
    detail: "A simulação encontrou diferença maior que 20 minutos entre as sessões. Revise durações ou a ordem pedagógica.",
  },
];

const severityStyles = {
  error: { label: "Erro", className: "bg-danger/10 text-danger" },
  warning: { label: "Aviso", className: "bg-warning/10 text-warning" },
  info: { label: "Info", className: "bg-accent/10 text-accent" },
} as const;

const CONSTANTS: Array<{ label: string; value: string; note: string }> = [
  { label: "Meta diária mínima", value: `${MIN_SESSION_MINUTES} min`, note: "Piso do que o aluno pode escolher e do que o motor pode adaptar." },
  { label: "Meta diária máxima", value: `${MAX_SESSION_MINUTES} min`, note: "Teto do que o aluno pode escolher e do que o motor pode adaptar." },
  { label: "Tolerância do dia", value: `± ${TOLERANCE_PERCENT}%`, note: `O dia é considerado bem montado entre ${FLOOR_PERCENT}% e ${CEILING_PERCENT}% da meta.` },
  { label: "Rotina padrão", value: `${DEFAULT_AVAILABILITY.minutesPerSession} min`, note: `Usada na simulação do admin: ${DEFAULT_DAYS} — ${DEFAULT_WEEKLY} min por semana.` },
  { label: "Peso de uma resposta", value: "1 ponto", note: "Cada opção marcada soma 1 ponto ao conteúdo que ela vincula." },
  { label: "Acerto de tópico ou problema", value: "2 pontos", note: "Peso do sinal de afinidade quando a tag bate com o conteúdo da aula." },
  { label: "Acerto de nível", value: "1 ponto", note: "Peso do sinal de afinidade quando a tag bate só com o nível da aula." },
  { label: "Influência da afinidade", value: "× 0,1", note: "A afinidade desempata; ela nunca decide na frente do papel pedagógico." },
  { label: "Entrada automática", value: "2 pontos", note: "Mínimo para uma aula não mapeada entrar sozinha na trilha, como Extra." },
  { label: "Ajuste por feedback", value: "± 10 min", note: "“Foi leve” aumenta a meta; “foi pesada” diminui; “foi adequada” não mexe." },
  { label: "Alívio por dias em branco", value: `− ${TOLERANCE_PERCENT}%`, note: "Aplicado a cada 2 dias planejados que passam sem nenhuma conclusão." },
  { label: "Duração padrão de uma aula", value: "10 min", note: "Usada quando a aula não declara duração." },
  { label: "Duração padrão de um artigo", value: "8 min", note: "Usada quando o artigo não tem tempo de leitura." },
  { label: "Horizonte do calendário", value: "1000 dias", note: "Limite de segurança do agendador. O que sobrar é empilhado, nunca descartado." },
];

export default function AdminOnboardingRulesPage() {
  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        eyebrow="Learning Paths Engine"
        title="Regras de criação das trilhas"
        description="Tudo o que acontece entre a resposta do aluno no onboarding e o calendário de estudo que ele recebe. Esta página descreve o comportamento real do motor — use-a para prever o efeito de cada decisão de curadoria."
        actions={
          <Link
            href="/admin/onboarding"
            className="flex min-h-10 items-center gap-2 rounded-full border border-border/60 bg-surface px-4 text-sm font-bold text-foreground transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft size={16} />
            Voltar ao editor
          </Link>
        }
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_16rem] xl:gap-12">
        <div className="min-w-0 space-y-12">
          <Section
            meta={SECTIONS[0]}
            step={1}
            lead="A trilha não é escrita à mão: ela é o resultado de uma sequência de decisões automáticas. Entender esta ordem explica quase todo comportamento inesperado — o motor sempre resolve o que vem antes primeiro."
          >
            <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <FlowStep step={1} title="O aluno responde" description="Ele percorre as perguntas publicadas e declara a rotina de estudo na última etapa." />
              <FlowStep step={2} title="O motor junta os candidatos" description="Cada opção marcada entrega os conteúdos que você vinculou a ela, somando pontos e motivos." />
              <FlowStep step={3} title="A afinidade complementa" description="As tags das respostas puxam aulas parecidas que ninguém mapeou à mão, sempre como Extra." />
              <FlowStep step={4} title="Pré-requisitos entram" description="O que falta para a sequência fazer sentido é adicionado mesmo sem mapeamento." />
              <FlowStep step={5} title="A fila é ordenada" description="Papel pedagógico, pontuação, ordem da curadoria e, por fim, a ordem topológica dos pré-requisitos." />
              <FlowStep step={6} title="O calendário é montado" description="A fila é distribuída pelos dias da rotina, respeitando a meta de minutos e a sequência dos cursos." />
            </ol>
            <Note tone="accent" title="A curadoria decide o quê; o motor decide o quando.">
              Nenhuma regra de agendamento reordena a sequência de um curso. O que você define no editor determina o conteúdo e a prioridade; o motor só distribui isso ao longo do tempo que o aluno tem.
            </Note>
          </Section>

          <Section
            meta={SECTIONS[1]}
            step={2}
            lead="O questionário é a única entrada do aluno. Ele tem uma estrutura fixa, e a tela impede boa parte das combinações inválidas antes de você chegar ao botão de publicar."
          >
            <RuleList
              items={[
                {
                  term: "Três tipos de pergunta",
                  desc: (
                    <>
                      <Term>Escolha única</Term> guarda uma resposta e substitui a anterior a cada clique. <Term>Múltipla escolha</Term> acumula respostas — e acumula pontos.{" "}
                      <Term>Disponibilidade</Term> não tem opções: é onde o aluno declara dias e minutos.
                    </>
                  ),
                },
                {
                  term: "Uma disponibilidade, sempre a última",
                  desc: "O questionário precisa ter exatamente uma pergunta de disponibilidade, e ela precisa fechar o fluxo. Por isso ela fica num slot fixo no fim do editor, fora da lista arrastável.",
                },
                {
                  term: "A disponibilidade não vincula conteúdo",
                  desc: "Ela só configura a rotina: os atalhos de minutos oferecidos, o mínimo, o máximo e se o aluno pode definir um tempo diferente para cada dia.",
                },
                {
                  term: "Papel da pergunta",
                  desc: "Perfil, problema, interesse, nível ou restrição. O papel organiza a leitura da curadoria e a análise por trás da tela; ele não altera a pontuação.",
                },
                {
                  term: "Formato visual",
                  desc: "Lista, cards em grade ou bolhas dinâmicas. Bolhas aceitam uma opção por bolha, sem níveis secundários — o resto do comportamento é idêntico.",
                },
                {
                  term: "A ordem das perguntas é a ordem da tela",
                  desc: "Arraste para reordenar. O aluno vê exatamente essa sequência, com a disponibilidade sempre no fim.",
                },
                {
                  term: "O aluno não avança em branco",
                  desc: `Cada pergunta comum exige ao menos uma opção marcada. Na disponibilidade, ele precisa escolher ao menos um dia e uma meta a partir de ${MIN_SESSION_MINUTES} minutos.`,
                },
              ]}
            />
          </Section>

          <Section
            meta={SECTIONS[2]}
            step={3}
            lead="Cada opção de resposta é um pacote com três coisas: o rótulo que o aluno lê, as tags que alimentam a sugestão automática e os conteúdos que ela libera na trilha."
          >
            <RuleList
              items={[
                {
                  term: "Conteúdos vinculados",
                  desc: "Uma opção pode vincular aulas, módulos, cursos, artigos e links externos. Arraste para definir a ordem — ela é a ordem da curadoria e serve de desempate na fila final.",
                },
                {
                  term: "Papel pedagógico de cada conteúdo",
                  desc: (
                    <>
                      <Term>Essencial</Term>, <Term>Aprofundamento</Term> ou <Term>Extra</Term>. Essa é a prioridade mais forte que existe: o essencial vem antes do aprofundamento, que vem antes do extra, independentemente de pontuação. Todo conteúdo entra como Essencial e você ajusta depois.
                    </>
                  ),
                },
                {
                  term: "O mesmo conteúdo em várias respostas",
                  desc: "Nunca duplica na trilha. Ele soma os pontos das duas respostas, acumula os motivos e fica com o papel mais forte entre os que você atribuiu.",
                },
                {
                  term: "Tags",
                  desc: "São normalizadas ao salvar: minúsculas, sem acento e sem espaços nas pontas. Elas só têm efeito na sugestão automática — para vincular conteúdo diretamente, use os conteúdos vinculados.",
                },
                {
                  term: "Duração de artigo e link externo",
                  desc: "É obrigatória e trava a publicação quando falta. Aula, módulo e curso já trazem a duração do catálogo.",
                },
                {
                  term: "Link externo",
                  desc: "Pode ser criado direto no questionário, sem existir no catálogo — basta endereço e duração. A capa vem do Open Graph do site de destino, e você pode substituí-la por uma imagem própria.",
                },
                {
                  term: "Opção sem conteúdo",
                  desc: "É permitida, mas só influencia a trilha através das tags. O diagnóstico avisa, porque quase sempre é esquecimento.",
                },
                {
                  term: "Peso da opção",
                  desc: "Toda opção criada pela tela pesa 1 ponto. O campo aceita pesos maiores no dado, e algumas opções da carga inicial pesam 2 — o editor não expõe esse ajuste hoje.",
                },
              ]}
            />
            <Note tone="warning" title="Vincular um curso inteiro não é o mesmo que vincular uma aula.">
              Curso e módulo não vão para o calendário: eles se expandem em todas as aulas publicadas que contêm, na ordem editorial. Vincular um curso de 40 aulas a uma resposta coloca 40 itens na trilha de quem marcar essa opção.
            </Note>
          </Section>

          <Section
            meta={SECTIONS[3]}
            step={4}
            lead="O editor só oferece o que o motor consegue agendar, e o catálogo é remontado do banco a cada geração de trilha. Um curso publicado hoje já entra na trilha de quem responder o questionário amanhã, sem remapear nada."
          >
            <RuleList
              items={[
                {
                  term: "Cursos disponíveis",
                  desc: "Só cursos publicados e não arquivados. Dentro deles, só aulas publicadas, na ordem dos módulos e das aulas definida no curso.",
                },
                {
                  term: "Artigos disponíveis",
                  desc: "Só artigos publicados cuja data de publicação já passou. Artigo agendado para o futuro não aparece no catálogo.",
                },
                {
                  term: "O que vai para o calendário",
                  desc: "Apenas aula, artigo e link externo. Curso e módulo existem para você mapear em bloco e sempre se expandem nas aulas.",
                },
                {
                  term: "Duração usada",
                  desc: "A duração digitada no mapeamento vence a do catálogo. Sem nenhuma das duas, uma aula vale 10 minutos e um artigo usa o tempo de leitura (ou 8 minutos).",
                },
                {
                  term: "Capa do item na trilha",
                  desc: "A capa escolhida na curadoria vence a do catálogo. Sem ela, a aula usa a própria thumb e, na falta dela, herda a capa do módulo e depois a do curso.",
                },
                {
                  term: "Curso galeria",
                  desc: "É uma coleção de aulas avulsas: não mostra módulo, não tem ordem obrigatória e não encadeia pré-requisitos. Quem define a ordem dele é a sua curadoria.",
                },
                {
                  term: "“Elegível para sugestão automática”",
                  desc: "Interruptor de cada aula. Desligado, a aula continua podendo ser vinculada à mão em qualquer resposta — ela só deixa de ser puxada sozinha pela afinidade.",
                },
                {
                  term: "Conteúdo que sai do ar",
                  desc: "Despublicar um curso ou uma aula não limpa o questionário. O mapeamento vira órfão, aparece marcado em vermelho no editor e trava a próxima publicação até ser removido ou substituído.",
                },
              ]}
            />
          </Section>

          <Section
            meta={SECTIONS[4]}
            step={5}
            lead="A pontuação decide a ordem dentro de um mesmo papel pedagógico. Ela é simples de propósito: quanto mais respostas do aluno apontam para o mesmo conteúdo, mais cedo ele aparece."
          >
            <RuleList
              items={[
                {
                  term: "Só contam as opções marcadas",
                  desc: "Respostas não marcadas não subtraem nada. Uma opção que o aluno não escolheu simplesmente não existe para o motor.",
                },
                {
                  term: "Cada acerto soma 1 ponto",
                  desc: "Um conteúdo vinculado em três respostas que o aluno marcou termina com 3 pontos. Em uma pergunta de múltipla escolha, cada marcação contribui.",
                },
                {
                  term: "O papel pedagógico vem antes do ponto",
                  desc: "Um Essencial com 1 ponto sempre precede um Extra com 5. A pontuação só desempata dentro do mesmo papel.",
                },
                {
                  term: "O papel mais forte vence",
                  desc: "Se o mesmo conteúdo é Extra em uma resposta e Essencial em outra, ele fica Essencial na trilha de quem marcou as duas.",
                },
                {
                  term: "O motivo mostrado ao aluno",
                  desc: "Com uma origem, o card diz “Recomendado por: <rótulo da opção>”. Com duas ou mais, ele diz “Conecta <rótulo> e <rótulo>” — por isso rótulos de resposta bem escritos aparecem literalmente na trilha.",
                },
                {
                  term: "Conteúdo já concluído não volta",
                  desc: "Aula que o aluno já assistiu na sala de aula, ou já concluiu numa trilha anterior, nunca é recomendada de novo — mesmo que a resposta continue apontando para ela.",
                },
              ]}
            />
          </Section>

          <Section
            meta={SECTIONS[5]}
            step={6}
            lead="Além do que você mapeia à mão, o motor aproveita os metadados das aulas — tópicos, problemas que resolve e nível — para completar a trilha. É o que permite manter um catálogo grande sem mapear tudo, uma resposta de cada vez."
          >
            <RuleList
              items={[
                {
                  term: "O sinal vem das tags",
                  desc: "As tags das opções que o aluno marcou são comparadas com os metadados de cada aula elegível do catálogo.",
                },
                {
                  term: "Como pontua",
                  desc: "Tag que bate com um tópico ou com um problema que a aula resolve vale 2 pontos. Tag que bate só com o nível da aula vale 1 ponto.",
                },
                {
                  term: "A afinidade desempata, não decide",
                  desc: "O resultado entra no score multiplicado por 0,1. Ela reforça a posição de quem já é candidato e jamais coloca um Extra na frente de um Essencial que você mapeou.",
                },
                {
                  term: "Entrada por conta própria",
                  desc: "Uma aula que ninguém mapeou entra sozinha apenas com 2 pontos ou mais — ou seja, ao menos um acerto de tópico ou de problema. Nível sozinho não basta.",
                },
                {
                  term: "Sempre como Extra",
                  desc: "Conteúdo que entra por afinidade recebe o papel Extra e o motivo “seu interesse em <rótulo da opção>”. Ele fica atrás de tudo que você curou.",
                },
                {
                  term: "Nunca arrasta dependências",
                  desc: "A aula só entra sozinha se todos os pré-requisitos dela já estiverem na trilha. Puxar uma cadeia inteira por causa de um Extra inflaria o plano sem ninguém ter pedido.",
                },
              ]}
            />
            <Note tone="accent" title="Onde configurar os metadados">
              Tópicos, problemas que a aula resolve, nível e o interruptor de sugestão automática ficam no formulário de cada aula, dentro do curso. Sem eles preenchidos, a aula só entra na trilha por mapeamento explícito.
            </Note>
          </Section>

          <Section
            meta={SECTIONS[6]}
            step={7}
            lead="Pré-requisito é o que garante que a trilha faça sentido pedagógico mesmo quando o aluno é levado até o meio de um curso. É a única regra que consegue trazer conteúdo que você não mapeou."
          >
            <RuleList
              items={[
                {
                  term: "Declaração explícita vence",
                  desc: "Os pré-requisitos declarados no formulário da aula substituem a corrente automática. Só valem ids de aulas do mesmo curso — um id de outro curso ou de uma aula apagada é ignorado.",
                },
                {
                  term: "Sem declaração, vale a aula anterior",
                  desc: "O padrão é encadear cada aula na anterior da ordem editorial do curso, atravessando módulos. É o que mantém a linearidade funcionando sem ninguém configurar nada.",
                },
                {
                  term: "Curso galeria fica fora da corrente",
                  desc: "Aulas avulsas não herdam linearidade. Mapear a sexta masterclass não arrasta as cinco anteriores.",
                },
                {
                  term: "Pré-requisito entra sem mapeamento",
                  desc: "Se um conteúdo recomendado depende de uma aula que não está na trilha, ela é adicionada como Essencial, com o motivo “Pré-requisito da sua sequência” e a mesma pontuação de quem a puxou.",
                },
                {
                  term: "Pré-requisito ausente do catálogo",
                  desc: "Vira um aviso no item do aluno e um diagnóstico de erro no painel do admin. A trilha continua funcionando.",
                },
                {
                  term: "Ciclo de pré-requisitos",
                  desc: "Duas aulas que dependem uma da outra são detectadas, registram um aviso e o ciclo é ignorado — um defeito de configuração nunca trava o plano de estudo de ninguém.",
                },
                {
                  term: "Sequência dentro do curso é intocável",
                  desc: "Nenhuma regra de encaixe inverte a ordem das aulas de um mesmo curso ou módulo. A aula 5 nunca é agendada antes da aula 3.",
                },
              ]}
            />
          </Section>

          <Section
            meta={SECTIONS[7]}
            step={8}
            lead="Antes de virar calendário, tudo que foi coletado é ordenado em uma fila única. Estes quatro critérios, nesta ordem, definem quem vem primeiro."
          >
            <ol className="editorial-card divide-y divide-border/40 overflow-hidden">
              {[
                { title: "Papel pedagógico", detail: "Essencial, depois Aprofundamento, depois Extra. Nenhum critério abaixo inverte isso." },
                { title: "Pontuação", detail: "Maior primeiro, contando os acertos das respostas mais o reforço da afinidade." },
                { title: "Ordem da curadoria", detail: "Empate resolvido por quem foi encontrado primeiro — ou seja, a ordem das suas perguntas, opções e conteúdos vinculados." },
                { title: "Título", detail: "Último desempate, em ordem alfabética, para que a fila seja sempre previsível." },
              ].map((criteria, position) => (
                <li key={criteria.title} className="flex items-start gap-4 p-4 sm:p-5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent/10 text-xs font-bold text-accent">{position + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{criteria.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{criteria.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Note tone="accent" title="E então os pré-requisitos passam por cima da fila.">
              Depois de ordenada, a fila é reorganizada para que todo pré-requisito venha antes de quem depende dele. É por isso que uma aula introdutória com pontuação baixa pode aparecer na frente de um Essencial muito pontuado.
            </Note>
          </Section>

          <Section
            meta={SECTIONS[8]}
            step={9}
            lead="Com a fila pronta, o motor distribui o conteúdo pelos dias que o aluno reservou. Cada dia tem uma meta própria de minutos e uma folga controlada para cima e para baixo."
          >
            <RuleList
              items={[
                {
                  term: "A rotina do aluno",
                  desc: `Ele escolhe os dias da semana e uma meta de minutos entre ${MIN_SESSION_MINUTES} e ${MAX_SESSION_MINUTES}. Quando você permite, ele define um tempo diferente para cada dia; os atalhos de minutos oferecidos são os que você configurar na pergunta de disponibilidade.`,
                },
                {
                  term: `Folga de ${TOLERANCE_PERCENT}%`,
                  desc: `Um dia é considerado bem montado entre ${FLOOR_PERCENT}% e ${CEILING_PERCENT}% da meta. Abaixo disso o motor continua puxando conteúdo; acima, ele para. Sem essa folga, uma aula de 35 minutos numa meta de 30 empurraria a semana inteira.`,
                },
                {
                  term: "O primeiro da fila abre o dia",
                  desc: "O primeiro conteúdo liberado entra caiba ele na meta ou não. É a regra que protege a sua ordem: sem ela, aulas curtas de outros cursos ultrapassariam para sempre uma masterclass longa.",
                },
                {
                  term: "Dia mais longo é sinalizado",
                  desc: "Quando esse primeiro item estoura a meta, o dia fica maior e o item é marcado como acima da meta — o card avisa o aluno antes de ele começar.",
                },
                {
                  term: "Só o primeiro pode furar a meta",
                  desc: `O preenchimento do resto do dia nunca ultrapassa ${CEILING_PERCENT}% da meta. O motor busca adiante quem couber no tempo restante e para quando o dia chega ao piso de ${FLOOR_PERCENT}%.`,
                },
                {
                  term: "Adiantar é permitido; atrasar não",
                  desc: "Um artigo ou uma aula de outro curso pode ser antecipado para fechar um dia — o item aparece marcado como antecipado. O que nunca acontece é inverter a sequência de um mesmo curso.",
                },
                {
                  term: "O que o aluno já fez conta no dia",
                  desc: "Conteúdo concluído no mesmo dia ocupa o tempo daquele dia. Quem já estudou 40 dos 45 minutos não recebe mais uma aula por cima.",
                },
                {
                  term: "Nada se perde",
                  desc: "O agendador trabalha com um horizonte de 1000 dias. Se uma curadoria excede isso, o excedente é empilhado no dia seguinte ao último em vez de sumir da trilha.",
                },
              ]}
            />
          </Section>

          <Section
            meta={SECTIONS[9]}
            step={10}
            lead="Depois de gerada, a trilha continua reagindo ao que o aluno faz. Estas regras rodam sozinhas e mudam apenas o que ainda está pela frente."
          >
            <RuleList
              items={[
                {
                  term: "Feedback da sessão",
                  desc: "“Foi leve” aumenta a meta diária em 10 minutos, “foi pesada” diminui 10, “foi adequada” não mexe. O resultado é sempre limitado ao mínimo e ao máximo da rotina.",
                },
                {
                  term: "A meta adaptada é proporcional",
                  desc: "No modo por dia, o ajuste escala todos os dias mantendo a proporção escolhida — uma rotina de 30 na terça e 90 no sábado encolhe junto, sem achatar tudo num número só.",
                },
                {
                  term: "Dias em branco",
                  desc: `A cada 2 dias planejados que passam sem nenhuma conclusão, o motor alivia a meta em ${TOLERANCE_PERCENT}%. É um alívio a cada dois dias perdidos, não um por visita.`,
                },
                {
                  term: "Voltar ao ritmo zera o alívio",
                  desc: "Avaliar uma sessão zera o contador de dias em branco. Redeclarar a rotina zera o contador e descarta toda a adaptação automática, voltando à meta escolhida.",
                },
                {
                  term: "Adiar a sessão",
                  desc: "Move o dia inteiro para o próximo dia de estudo e remonta toda a agenda seguinte, para não duplicar a carga das próximas sessões.",
                },
                {
                  term: "Adiar um conteúdo",
                  desc: "Move só aquele item — e os colegas do mesmo curso que viriam depois dele naquele dia, para não inverter a sequência. O resto do dia continua valendo.",
                },
                {
                  term: "Conteúdo atrasado",
                  desc: "Pendência com data no passado volta para a agenda marcada como atrasada, guardando a data original em que venceu. Os itens deslocados por causa dela aparecem como ajustados.",
                },
                {
                  term: "Remover conteúdo da trilha não existe",
                  desc: "O aluno não descarta o que a curadoria recomendou. Trilhas antigas que tinham remoções recuperam esses itens no primeiro replanejamento.",
                },
              ]}
            />
          </Section>

          <Section
            meta={SECTIONS[10]}
            step={11}
            lead="Quem já tem trilha não fica preso ao catálogo do dia em que respondeu. A plataforma mantém um carimbo do catálogo e do questionário e reconcilia a trilha na próxima visita do aluno."
          >
            <RuleList
              items={[
                {
                  term: "Conteúdo novo chega sozinho",
                  desc: "Se você mapeia um conteúdo novo numa resposta que o aluno já deu, ele entra na trilha dele na visita seguinte, sem refazer o onboarding.",
                },
                {
                  term: "O que já estava na fila permanece",
                  desc: "A reconciliação preserva as pendências com as datas que já tinham. Ela adiciona e remove, mas não embaralha o plano de quem está estudando.",
                },
                {
                  term: "Mapeamento removido some da fila",
                  desc: "Desvincular um conteúdo de uma resposta o retira das trilhas de quem ainda não o concluiu. Quem já concluiu mantém o registro.",
                },
                {
                  term: "Histórico é intocável",
                  desc: "Conteúdo concluído nunca sai da trilha, mesmo que deixe de ser recomendado. Recalibrar muda o que vem pela frente, não o que já passou.",
                },
                {
                  term: "Sala de aula e trilha conversam",
                  desc: "Aula concluída fora da agenda sai automaticamente do pendente da trilha, para o aluno não ver de novo o que assistiu ontem por conta própria.",
                },
                {
                  term: "Atraso é identificado antes",
                  desc: "A cada visita, o motor marca o que venceu antes de reconciliar o catálogo — assim uma mudança sua nunca apaga a informação de que o aluno ficou para trás.",
                },
              ]}
            />
          </Section>

          <Section
            meta={SECTIONS[11]}
            step={12}
            lead="Editar o questionário não afeta ninguém até você publicar. O que existe são duas coisas separadas: um rascunho, que só você vê, e uma versão publicada, que é a única que os alunos respondem."
          >
            <RuleList
              items={[
                {
                  term: "Existe um único rascunho",
                  desc: "Salvar rascunho grava sobre o mesmo registro. O primeiro rascunho depois de uma publicação recebe o número da próxima versão.",
                },
                {
                  term: "Publicar arquiva a versão anterior",
                  desc: "A versão publicada atual passa a arquivada e a nova se torna ativa para todos os alunos, imediatamente.",
                },
                {
                  term: "A validação roda de novo no servidor",
                  desc: "Não basta a tela liberar o botão: a publicação revalida tudo contra o catálogo real e é recusada se algo tiver mudado nesse meio-tempo.",
                },
                {
                  term: "Toda publicação é registrada",
                  desc: "Autor, data, nota da versão e quantidade de perguntas ficam no log de auditoria.",
                },
                {
                  term: "Restaurar não republica",
                  desc: "Restaurar uma versão do histórico copia as perguntas dela para o rascunho. Nada muda para os alunos até você revisar e publicar.",
                },
                {
                  term: "Descartar rascunho",
                  desc: "Apaga a edição em andamento e a tela volta a refletir exatamente o que está publicado.",
                },
                {
                  term: "Recuperação no navegador",
                  desc: "Uma cópia da edição em andamento fica guardada neste navegador. Se a aba fechar antes de salvar, a tela oferece recuperar o que você tinha escrito.",
                },
                {
                  term: "Alunos com trilha pronta",
                  desc: "Uma nova versão não refaz sozinha as trilhas existentes. Ela vale para quem responder daí em diante — e o conteúdo novo mapeado chega aos demais pela reconciliação do catálogo.",
                },
              ]}
            />
          </Section>

          <Section
            meta={SECTIONS[12]}
            step={13}
            lead="A tela separa o que impede a publicação do que só merece a sua atenção. As pendências aparecem no topo da aba de perguntas; os diagnósticos, em “Saúde & Resultados”."
          >
            <div className="editorial-card p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-danger" aria-hidden="true" />
                <h3 className="text-sm font-bold text-foreground">Travam a publicação</h3>
              </div>
              <ul className="mt-4 space-y-2.5">
                {BLOCKING_VALIDATIONS.map((rule) => (
                  <li key={rule} className="flex gap-3 text-sm leading-6 text-muted">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div className="editorial-card divide-y divide-border/40 overflow-hidden">
              {DIAGNOSTICS.map((item) => {
                const severity = severityStyles[item.severity];
                return (
                  <div key={item.title} className="grid gap-2 p-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-5 sm:p-5">
                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${severity.className}`}>{severity.label}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Note tone="success" title="A prévia é uma simulação real.">
              A aba “Prévia da Trilha” roda o motor completo com a primeira opção de cada pergunta e a rotina padrão. É a forma mais rápida de conferir o efeito de uma mudança antes de publicar.
            </Note>
          </Section>

          <Section
            meta={SECTIONS[13]}
            step={14}
            lead="Os números que o motor usa, reunidos. Eles são lidos diretamente do código — se algum mudar, esta tabela muda junto."
          >
            <div className="editorial-card divide-y divide-border/40 overflow-hidden">
              {CONSTANTS.map((entry) => (
                <div key={entry.label} className="grid gap-1 p-4 sm:grid-cols-[minmax(0,14rem)_7rem_minmax(0,1fr)] sm:items-baseline sm:gap-5 sm:p-5">
                  <p className="text-sm font-bold text-foreground">{entry.label}</p>
                  <p className="font-display text-lg font-bold tracking-tight text-accent">{entry.value}</p>
                  <p className="text-sm leading-6 text-muted">{entry.note}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <aside className="hidden xl:block">
          <nav aria-label="Nesta página" className="sticky top-28">
            <p className="eyebrow">Nesta página</p>
            <ol className="mt-3 space-y-1 border-l border-border/50">
              {SECTIONS.map((section, position) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px flex gap-2 border-l border-transparent py-1.5 pl-4 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    <span className="tabular-nums text-xs font-bold text-muted/70">{position + 1}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      </div>
    </div>
  );
}
