import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  CreditCard,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  Mail,
  CheckCircle2,
  Lock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Uso | Smart LMS",
  description:
    "Termos e condições gerais de uso da plataforma Smart LMS. Conheça as regras, direitos e deveres aplicáveis aos nossos cursos, trilhas de aprendizagem, mentorias de inteligência artificial e certificados.",
};

const SECTIONS = [
  { id: "secao-1", title: "1. Aceitação e Objeto" },
  { id: "secao-2", title: "2. Descrição da Plataforma e Serviços" },
  { id: "secao-3", title: "3. Elegibilidade, Cadastro e Segurança da Conta" },
  { id: "secao-4", title: "4. Planos, Assinaturas, Pagamento e Cancelamento" },
  { id: "secao-5", title: "5. Propriedade Intelectual e Licença de Uso" },
  { id: "secao-6", title: "6. Regras de Conduta e Uso Aceitável" },
  { id: "secao-7", title: "7. Recursos de Inteligência Artificial e Agentes" },
  { id: "secao-8", title: "8. Avaliações e Certificados de Conclusão" },
  { id: "secao-9", title: "9. Disponibilidade, Manutenção e Limitação de Responsabilidade" },
  { id: "secao-10", title: "10. Suspensão e Encerramento de Contas" },
  { id: "secao-11", title: "11. Alterações Destes Termos" },
  { id: "secao-12", title: "12. Legislação Aplicável, Foro e Contato" },
];

export default function TermosDeUsoPage() {
  return (
    <div className="pb-24 pt-[76px]">
      <div className="editorial-container-narrow py-10 sm:py-16">
        {/* Navegação de retorno */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar para o início
          </Link>
        </div>

        {/* Cabeçalho */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-accent">
            <FileText className="size-3.5" />
            Documento Oficial
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Termos de Uso e Serviços
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Estes Termos e Condições Gerais de Uso regulam o acesso e a utilização da plataforma Smart LMS,
            seus cursos, trilhas personalizadas, materiais didáticos, ferramentas de inteligência artificial e
            serviços correlatos.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span>Última atualização: 19 de setembro de 2026</span>
            <span>•</span>
            <span>Versão: 2.1</span>
            <span>•</span>
            <span>Tempo de leitura estimado: ~8 min</span>
          </div>
        </header>

        {/* Resumo Executivo / Destaques */}
        <section className="mb-14 rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <ShieldCheck className="size-5 text-accent" />
            Visão Geral em Poucos Pontos
          </h2>
          <p className="mt-2 text-sm text-muted">
            Recomendamos a leitura integral deste documento. A seguir, destacamos quatro princípios essenciais:
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                <Lock className="size-4 text-accent" />
                Uso Pessoal e Intransferível
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Sua conta de aluno é estritamente pessoal. O compartilhamento ou rateio de credenciais é expressamente
                vedado e passível de cancelamento imediato.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                <CreditCard className="size-4 text-accent" />
                Garantia Legal de 7 Dias
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Em conformidade com o art. 49 do Código de Defesa do Consumidor, você tem até 7 dias corridos após a
                compra para solicitar reembolso integral sem burocracia.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                <FileText className="size-4 text-accent" />
                Proteção Autoral e de Conteúdo
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Vídeos, áudios, textos e códigos disponibilizados são obras protegidas. É proibida qualquer cópia,
                redistribuição ou gravação não autorizada.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                <Sparkles className="size-4 text-accent" />
                Inteligência Artificial Pedagógica
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Nossos agentes de IA atuam como facilitadores de aprendizado e tutores. Suas respostas devem ser
                utilizadas como apoio ao estudo contínuo.
              </p>
            </div>
          </div>
        </section>

        {/* Índice Rápido */}
        <nav aria-label="Índice dos Termos de Uso" className="mb-14 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Índice do Documento</h2>
          <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {SECTIONS.map((sec) => (
              <li key={sec.id}>
                <a
                  href={`#${sec.id}`}
                  className="inline-flex items-center text-muted transition-colors hover:text-accent"
                >
                  <span className="underline-offset-4 hover:underline">{sec.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Corpo do Documento */}
        <article className="space-y-12 text-foreground/90 leading-relaxed">
          {/* Seção 1 */}
          <section id="secao-1" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">1. Aceitação e Objeto</h2>
            <p>
              Estes Termos de Uso constituem contrato juridicamente vinculante firmado entre você (denominado{" "}
              <strong>“Usuário”</strong>, <strong>“Aluno”</strong> ou <strong>“Você”</strong>) e a{" "}
              <strong>Smart LMS</strong> (doravante denominada <strong>“Plataforma”</strong> ou <strong>“Nós”</strong>).
            </p>
            <p>
              Ao realizar o cadastro, acessar ou utilizar qualquer parte de nossa plataforma, você confirma ter lido,
              compreendido e concordado integralmente com todos os termos aqui estipulados, bem como com a nossa{" "}
              <Link href="/privacidade" className="font-medium text-accent underline underline-offset-4 hover:opacity-90">
                Política de Privacidade
              </Link>
              . Caso não concorde com qualquer disposição, você não deve utilizar a plataforma.
            </p>
          </section>

          {/* Seção 2 */}
          <section id="secao-2" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              2. Descrição da Plataforma e Serviços Oferecidos
            </h2>
            <p>
              O Smart LMS é um ecossistema digital de educação e capacitação profissional focado em habilidades práticas,
              comunicação, liderança, tecnologia e desenvolvimento contínuo. Nossos serviços englobam:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted sm:text-base">
              <li>Acesso a cursos e aulas sob demanda em vídeo, áudio e material textual estruturado;</li>
              <li>Trilhas de desenvolvimento e diagnósticos de competências individualizados;</li>
              <li>Interação com agentes inteligentes e mentores virtuais alimentados por IA para suporte ao aprendizado;</li>
              <li>Sistemas de anotações integradas, exercícios práticos, quizzes e desafios de fixação;</li>
              <li>Emissão de certificados digitais de conclusão mediante atingimento dos critérios pedagógicos estabelecidos.</li>
            </ul>
            <p className="text-sm text-muted">
              A Plataforma reserva-se o direito de atualizar, aprimorar, modificar ou descontinuar módulos pedagógicos,
              recursos e conteúdos a qualquer momento para garantir a evolução e qualidade técnica do serviço.
            </p>
          </section>

          {/* Seção 3 */}
          <section id="secao-3" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              3. Elegibilidade, Cadastro e Segurança da Conta
            </h2>
            <p>
              Para usufruir dos serviços, o Usuário deve ter capacidade civil plena (idade igual ou superior a 18 anos)
              ou estar devidamente assistido por seus responsáveis legais nos moldes do Código Civil brasileiro.
            </p>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">3.1. Veracidade dos Dados</h3>
              <p className="text-sm text-muted sm:text-base">
                O Usuário compromete-se a fornecer informações exatas, atualizadas e completas no momento do cadastro,
                responsabilizando-se civil e criminalmente pela autenticidade dos dados declarados.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">3.2. Sigilo das Credenciais</h3>
              <p className="text-sm text-muted sm:text-base">
                O acesso à conta é individual, intransferível e protegido por senha ou token de autenticação mágica. O
                Usuário é o único responsável pela guarda e confidencialidade de suas credenciais, devendo notificar
                imediatamente a Plataforma caso identifique qualquer indício de acesso não autorizado.
              </p>
            </div>
          </section>

          {/* Seção 4 */}
          <section id="secao-4" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              4. Planos, Assinaturas, Pagamento e Cancelamento
            </h2>
            <p>
              O acesso aos cursos e trilhas pode ser disponibilizado por meio de compra avulsa ou assinatura periódica
              (mensal, trimestral ou anual), conforme detalhado na página de planos da Plataforma.
            </p>

            <div className="rounded-xl border border-accent/20 bg-accent-soft/30 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-accent" />
                Direito de Arrependimento (Art. 49 do CDC)
              </h3>
              <p className="mt-2 text-sm text-muted">
                Em respeito ao Código de Defesa do Consumidor, o Usuário tem o direito de desistir da contratação no
                prazo de <strong>7 (sete) dias corridos</strong> a contar da data de confirmação do pagamento, com
                devolução integral do valor pago pelo mesmo meio utilizado na transação original.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">4.1. Renovação Automática</h3>
              <p className="text-sm text-muted sm:text-base">
                Planos na modalidade de assinatura recorrente são renovados automaticamente ao final do ciclo contratado,
                a menos que o Usuário efetue o cancelamento com antecedência mínima através do seu painel de perfil ou canal de suporte.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">4.2. Inadimplência e Bloqueio</h3>
              <p className="text-sm text-muted sm:text-base">
                A ausência de quitação da anuidade ou mensalidade após as tentativas de cobrança automáticas ensejará a
                suspensão temporária do acesso aos cursos até a regularização do pagamento.
              </p>
            </div>
          </section>

          {/* Seção 5 */}
          <section id="secao-5" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              5. Propriedade Intelectual e Licença de Uso
            </h2>
            <p>
              Todo o conteúdo disponibilizado no Smart LMS — incluindo videoaulas, trilhas de áudio, textos, apostilas em
              PDF, códigos-fonte, logomarcas, ilustrações e algoritmos — é de titularidade exclusiva da Smart LMS ou de
              seus instrutores parceiros, devidamente protegido pela Lei de Direitos Autorais (Lei nº 9.610/1998) e pela
              Lei de Propriedade Industrial (Lei nº 9.279/1996).
            </p>
            <div className="rounded-xl border border-warning/30 bg-warning-soft/20 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-warning-foreground">
                <AlertTriangle className="size-4 text-warning" />
                Condutas Estritamente Vedadas
              </h3>
              <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-muted">
                <li>Baixar, gravar, ripilar ou extrair vídeos e áudios que não possuam botão explícito de download;</li>
                <li>Comercializar, alugar, sublicenciar ou compartilhar contas coletivamente (rateio de cursos);</li>
                <li>Utilizar ferramentas automatizadas (scrapers, robôs, crawlers) para coleta em massa de conteúdo;</li>
                <li>Praticar engenharia reversa, descompilação ou cópia de código-fonte da aplicação.</li>
              </ul>
            </div>
          </section>

          {/* Seção 6 */}
          <section id="secao-6" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              6. Regras de Conduta e Diretrizes da Comunidade
            </h2>
            <p>
              O ambiente de aprendizado da Plataforma fundamenta-se na cordialidade, colaboração e respeito mútuo. Em
              comentários de aulas, fóruns e interações entre alunos, é terminantemente proibido:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted sm:text-base">
              <li>Publicar conteúdo difamatório, calunioso, discriminatório, racista, homofóbico, pornográfico ou que viole direitos humanos;</li>
              <li>Praticar assédio, ameaças ou perseguição contra outros alunos, professores ou membros da equipe da Plataforma;</li>
              <li>Veicular propaganda comercial não autorizada, spam, links maliciosos ou materiais protegidos por segredo industrial de terceiros;</li>
              <li>Tentar fraudar registros de presença, avaliações, tempo de visualização de aulas ou emissão de certificados.</li>
            </ul>
          </section>

          {/* Seção 7 */}
          <section id="secao-7" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              7. Recursos de Inteligência Artificial e Agentes Educacionais
            </h2>
            <p>
              A Plataforma disponibiliza agentes tutores e assistentes de estudo operados por modelos de inteligência
              artificial generativa para enriquecer o processo pedagógico. Ao utilizar esses recursos, o Usuário reconhece e concorda que:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted sm:text-base">
              <li>
                <strong>Caráter Complementar:</strong> As respostas fornecidas pelos assistentes têm finalidade estritamente
                educacional e informativa, não substituindo o discernimento humano nem aconselhamento profissional
                regulamentado (médico, jurídico, financeiro, contábil, etc.);
              </li>
              <li>
                <strong>Verificação Crítica:</strong> Como qualquer modelo preditivo, respostas podem eventualmente
                apresentar imprecisões contextuais. Incentiva-se o aluno a checar referências nas aulas e materiais oficiais;
              </li>
              <li>
                <strong>Uso Responsável:</strong> É vedado tentar induzir os modelos a gerar conteúdos ilícitos,
                ofensivos ou violadores de segurança (jailbreak e prompt injection malicioso).
              </li>
            </ul>
          </section>

          {/* Seção 8 */}
          <section id="secao-8" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              8. Avaliações, Exercícios e Certificados de Conclusão
            </h2>
            <p>
              A concessão de certificados digitais de conclusão está vinculada ao cumprimento dos requisitos pedagógicos
              de cada formação (tais como índice mínimo de aulas assistidas e aprovação em quizzes ou exercícios práticos).
            </p>
            <p className="text-sm text-muted sm:text-base">
              Os certificados emitidos pelo Smart LMS atestam a realização de cursos livres de capacitação e
              desenvolvimento profissional, regidos pela Lei de Diretrizes e Bases da Educação Nacional (Lei nº 9.394/1996),
              não constituindo títulos de graduação, pós-graduação acadêmica ou habilitações técnicas regulamentadas por conselhos de classe.
            </p>
          </section>

          {/* Seção 9 */}
          <section id="secao-9" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              9. Disponibilidade, Manutenção e Limitação de Responsabilidade
            </h2>
            <p>
              Empregamos esforços comercialmente razoáveis para assegurar alta disponibilidade e estabilidade na entrega
              dos serviços. Contudo, interrupções temporárias decorrentes de manutenção preventiva, atualizações
              emergenciais ou falhas de provedores de telecomunicações e internet de terceiros podem ocorrer.
            </p>
            <p className="text-sm text-muted sm:text-base">
              A Plataforma não se responsabiliza por danos indiretos, lucros cessantes, perdas de dados decorrentes de
              má utilização do dispositivo do aluno, ou instabilidades externas alheias ao controle técnico direto da Smart LMS.
            </p>
          </section>

          {/* Seção 10 */}
          <section id="secao-10" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              10. Suspensão, Bloqueio e Encerramento de Contas
            </h2>
            <p>
              A Plataforma poderá suspender temporariamente ou rescindir em definitivo a conta de qualquer Usuário que:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted sm:text-base">
              <li>Descumprir reiteradamente as regras de propriedade intelectual ou conduta estabelecidas nestes Termos;</li>
              <li>Praticar atos fraudulentos comprovados contra a Plataforma, outros usuários ou meios de pagamento;</li>
              <li>Fornecer dados falsos no cadastro ou na emissão de certificados.</li>
            </ul>
            <p className="text-sm text-muted sm:text-base">
              O encerramento por justa causa decorrente de infração comprovada não confere ao infrator o direito à
              restituição proporcional de valores já quitados.
            </p>
          </section>

          {/* Seção 11 */}
          <section id="secao-11" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">11. Alterações Destes Termos</h2>
            <p>
              A Smart LMS poderá revisar e atualizar estes Termos de Uso periodicamente para refletir alterações
              legislativas, novos recursos tecnológicos ou adequações de produto.
            </p>
            <p className="text-sm text-muted sm:text-base">
              Sempre que forem implementadas mudanças substantivas, informaremos os usuários cadastrados através de
              aviso na própria Plataforma ou por e-mail. A continuidade de uso do serviço após a notificação constituirá
              concordância com os termos atualizados.
            </p>
          </section>

          {/* Seção 12 */}
          <section id="secao-12" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              12. Legislação Aplicável, Foro e Contato
            </h2>
            <p>
              Estes Termos de Uso são regidos e interpretados de acordo com a legislação da República Federativa do
              Brasil, com destaque para a Constituição Federal, o Código Civil, o Marco Civil da Internet (Lei nº
              12.965/2014) e o Código de Defesa do Consumidor (Lei nº 8.078/1990).
            </p>
            <p>
              Fica eleito o foro da comarca do domicílio do Usuário consumidor para dirimir quaisquer litígios decorrentes
              deste contrato, salvo disposição legal em contrário.
            </p>
          </section>
        </article>

        {/* Bloco de Suporte e Contato Jurídico */}
        <div className="mt-16 rounded-2xl border border-border bg-surface p-8 text-center sm:text-left">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="space-y-1.5">
              <h3 className="font-display text-lg font-bold text-foreground">
                Dúvidas sobre os Termos de Uso?
              </h3>
              <p className="text-sm text-muted">
                Nossa equipe jurídica e de atendimento ao aluno está à disposição para esclarecimentos.
              </p>
            </div>
            <a
              href="mailto:suporte@smartlms.com.br"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-xs transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mail className="size-4" />
              Falar com o Suporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
