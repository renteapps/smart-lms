import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Eye,
  Database,
  UserCheck,
  FileCheck2,
  ArrowLeft,
  Mail,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade | Smart LMS",
  description:
    "Política de Privacidade e Proteção de Dados do Smart LMS, em total conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Saiba como coletamos, tratamos e protegemos seus dados pessoais.",
};

const SECTIONS = [
  { id: "secao-1", title: "1. Introdução e Nosso Compromisso" },
  { id: "secao-2", title: "2. Conceitos Importantes da LGPD" },
  { id: "secao-3", title: "3. Dados Pessoais que Coletamos" },
  { id: "secao-4", title: "4. Finalidades e Bases Legais de Tratamento" },
  { id: "secao-5", title: "5. Compartilhamento com Terceiros e Operadores" },
  { id: "secao-6", title: "6. Cookies e Tecnologias de Armazenamento Local" },
  { id: "secao-7", title: "7. Segurança, Criptografia e Retenção de Dados" },
  { id: "secao-8", title: "8. Direitos do Titular dos Dados (Art. 18 da LGPD)" },
  { id: "secao-9", title: "9. Transferência Internacional de Dados" },
  { id: "secao-10", title: "10. Privacidade de Menores de Idade" },
  { id: "secao-11", title: "11. Canal do Encarregado (DPO) e Atendimento" },
];

export default function PoliticaDePrivacidadePage() {
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
            <ShieldCheck className="size-3.5" />
            Conformidade LGPD (Lei nº 13.709/2018)
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Política de Privacidade
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Sua privacidade e a segurança dos seus dados são fundamentais para nós. Esta política explica de forma clara
            e transparente como a Smart LMS coleta, utiliza, armazena e protege suas informações pessoais ao utilizar nossa plataforma.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span>Última atualização: 19 de setembro de 2026</span>
            <span>•</span>
            <span>Versão: 2.1</span>
            <span>•</span>
            <span>Tempo de leitura estimado: ~9 min</span>
          </div>
        </header>

        {/* Resumo Executivo / Destaques */}
        <section className="mb-14 rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Eye className="size-5 text-accent" />
            Nossos Compromissos em Poucos Pontos
          </h2>
          <p className="mt-2 text-sm text-muted">
            Privacidade tratada com seriedade desde a concepção do produto (Privacy by Design):
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                <Lock className="size-4 text-accent" />
                Segurança em Camadas
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Criptografia em repouso e em trânsito (TLS 1.3 / AES-256), com controle estrito de acessos e monitoramento preventivo contínuo.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                <Database className="size-4 text-accent" />
                Sem Venda de Dados
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Jamais comercializamos, monetizamos ou vendemos dados pessoais para intermediários ou anunciantes. Seus dados são seus.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                <UserCheck className="size-4 text-accent" />
                Você no Controle
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Você pode solicitar confirmação, acesso, correção, anonimização ou exclusão dos seus dados a qualquer momento pelo nosso canal DPO.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                <FileCheck2 className="size-4 text-accent" />
                Uso Estritamente Educacional
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Tratamos dados de progresso e diagnósticos unicamente para personalizar sua trilha de aprendizagem e emitir certificados legítimos.
              </p>
            </div>
          </div>
        </section>

        {/* Índice Rápido */}
        <nav aria-label="Índice da Política de Privacidade" className="mb-14 rounded-2xl border border-border bg-surface p-6">
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
            <h2 className="font-display text-2xl font-bold text-foreground">1. Introdução e Nosso Compromisso</h2>
            <p>
              A <strong>Smart LMS</strong> assume o compromisso de tratar os dados pessoais de seus alunos, parceiros e
              visitantes com máxima ética, integridade e segurança, atuando em estrita observância à Lei Geral de Proteção de
              Dados Pessoais do Brasil (Lei Federal nº 13.709/2018 — <strong>“LGPD”</strong>) e às diretrizes da
              Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
            <p>
              Esta Política de Privacidade aplica-se a todos os serviços, websites, aplicativos, cursos e ferramentas
              fornecidos pela Smart LMS. Ao interagir com nossa plataforma, você atesta a ciência dos termos aqui dispostos.
            </p>
          </section>

          {/* Seção 2 */}
          <section id="secao-2" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">2. Conceitos Importantes da LGPD</h2>
            <p>Para facilitar a compreensão deste documento, adotamos os seguintes termos legais:</p>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted sm:text-base">
              <li>
                <strong>Dado Pessoal:</strong> Informação relacionada a pessoa natural identificada ou identificável
                (nome, e-mail, CPF, telefone, IP, etc.);
              </li>
              <li>
                <strong>Titular:</strong> A pessoa natural a quem se referem os dados pessoais que são objeto de tratamento (você);
              </li>
              <li>
                <strong>Tratamento:</strong> Toda operação realizada com dados pessoais (coleta, classificação, utilização,
                acesso, reprodução, transmissão, armazenamento ou eliminação);
              </li>
              <li>
                <strong>Controlador:</strong> Pessoa jurídica a quem competem as decisões referentes ao tratamento de dados pessoais (Smart LMS);
              </li>
              <li>
                <strong>Encarregado (DPO):</strong> Pessoa indicada para atuar como canal de comunicação entre o
                Controlador, os titulares dos dados e a ANPD.
              </li>
            </ul>
          </section>

          {/* Seção 3 */}
          <section id="secao-3" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">3. Dados Pessoais que Coletamos</h2>
            <p>
              Coletamos apenas os dados estritamente necessários para a prestação dos serviços e para garantir a
              personalização pedagógica da sua experiência:
            </p>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-base font-semibold text-foreground">3.1. Dados Cadastrais e de Identificação</h3>
                <p className="mt-1 text-sm text-muted">
                  Nome completo, endereço de e-mail, número de telefone (quando fornecido), CPF (para fins de faturamento e
                  emissão de certificados válidos) e foto de perfil opcional.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-base font-semibold text-foreground">3.2. Dados Pedagógicos e de Engajamento</h3>
                <p className="mt-1 text-sm text-muted">
                  Progresso nas aulas, vídeos assistidos, notas e respostas em questionários e quizzes, anotações de estudo,
                  trilhas personalizadas ativas, horas de dedicação e certificados emitidos.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-base font-semibold text-foreground">3.3. Interações com Inteligência Artificial</h3>
                <p className="mt-1 text-sm text-muted">
                  Perguntas e mensagens submetidas aos agentes de IA e tutores virtuais, utilizadas para gerar respostas
                  educacionais imediatas no contexto da aula em estudo.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-base font-semibold text-foreground">3.4. Informações Técnicas e Conexão</h3>
                <p className="mt-1 text-sm text-muted">
                  Endereço IP, data e hora de acesso, tipo de navegador, sistema operacional e identificadores de sessão
                  (necessários para a segurança da conta e cumprimento do Marco Civil da Internet).
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-base font-semibold text-foreground">3.5. Dados Financeiros e de Pagamento</h3>
                <p className="mt-1 text-sm text-muted">
                  As transações são processadas diretamente por intermediadoras de pagamento seguras com certificação
                  PCI-DSS. A Smart LMS não armazena o número integral do seu cartão de crédito ou código de segurança (CVV).
                </p>
              </div>
            </div>
          </section>

          {/* Seção 4 */}
          <section id="secao-4" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              4. Finalidades e Bases Legais de Tratamento (Art. 7º da LGPD)
            </h2>
            <p>
              Todo tratamento de dados realizado pela Smart LMS encontra respaldo em uma das hipóteses autorizativas
              previstas no artigo 7º da LGPD:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-xs font-semibold uppercase text-muted">
                    <th className="p-3">Finalidade</th>
                    <th className="p-3">Dados Utilizados</th>
                    <th className="p-3">Base Legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-muted">
                  <tr>
                    <td className="p-3 font-medium text-foreground">Criação de conta e prestação dos serviços</td>
                    <td className="p-3">Nome, e-mail, senha</td>
                    <td className="p-3">Execução de Contrato (Art. 7º, V)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Personalização de trilhas e aulas</td>
                    <td className="p-3">Histórico de progresso, diagnósticos</td>
                    <td className="p-3">Execução de Contrato (Art. 7º, V)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Emissão de notas fiscais e certificados</td>
                    <td className="p-3">Nome, CPF, histórico de conclusão</td>
                    <td className="p-3">Obrigação Legal ou Regulatória (Art. 7º, II)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Prevenção a fraudes e segurança da conta</td>
                    <td className="p-3">IP, registros de login, dispositivo</td>
                    <td className="p-3">Legítimo Interesse e Proteção ao Crédito (Art. 7º, IX e X)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Comunicação e newsletters informativas</td>
                    <td className="p-3">Nome, e-mail</td>
                    <td className="p-3">Consentimento ou Legítimo Interesse (com opt-out simples)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Seção 5 */}
          <section id="secao-5" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              5. Compartilhamento com Terceiros e Operadores
            </h2>
            <p>
              A Smart LMS não vende e nunca comercializará dados pessoais. O compartilhamento ocorre de forma controlada e
              restrita a parceiros estratégicos essenciais para a operação da plataforma, exigindo contratualmente o mesmo padrão de segurança:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted sm:text-base">
              <li>
                <strong>Infraestrutura e Bancos de Dados:</strong> Servidores de hospedagem em nuvem de alta segurança e
                conformidade global (ex.: Supabase, provedores em nuvem padrão SOC-2 e ISO 27001);
              </li>
              <li>
                <strong>Gateways de Pagamento:</strong> Processadores certificados PCI-DSS para liquidação financeira e prevenção de estornos indevidos;
              </li>
              <li>
                <strong>Serviços de Inteligência Artificial:</strong> Envio apenas do prompt e contexto da aula estritamente
                necessário para a resposta pedagógica imediata, com vedação do uso dos dados para retreinamento público de modelos;
              </li>
              <li>
                <strong>Autoridades Governamentais:</strong> Quando exigido mediante ordem judicial fundamentada ou obrigação legal.
              </li>
            </ul>
          </section>

          {/* Seção 6 */}
          <section id="secao-6" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              6. Cookies e Tecnologias de Armazenamento Local
            </h2>
            <p>
              Utilizamos cookies e tecnologias similares (como `localStorage`) para manter você conectado com segurança,
              lembrar suas preferências de interface (modo claro/escuro) e salvar o ponto exato onde você parou de assistir a uma aula.
            </p>
            <p className="text-sm text-muted sm:text-base">
              Você pode desativar o uso de cookies a qualquer momento nas configurações do seu navegador de internet,
              ficando ciente de que certas funcionalidades essenciais de login e memorização de progresso poderão ser afetadas.
            </p>
          </section>

          {/* Seção 7 */}
          <section id="secao-7" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              7. Segurança, Criptografia e Retenção de Dados
            </h2>
            <p>
              Adotamos salvaguardas técnicas, administrativas e físicas para proteger seus dados contra acessos não
              autorizados, vazamentos acidentais ou destruição ilícita:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted sm:text-base">
              <li>Comunicação 100% criptografada via protocolo HTTPS e TLS 1.3;</li>
              <li>Armazenamento seguro de senhas por meio de hashing criptográfico irreversível (Argon2 / bcrypt);</li>
              <li>Políticas de controle de privilégio mínimo de acesso para colaboradores e administradores;</li>
              <li>Backups periódicos e testes contínuos de integridade de sistemas.</li>
            </ul>
            <p className="text-sm text-muted sm:text-base">
              Os dados são conservados pelo período em que você mantiver sua conta ativa. Após solicitação de exclusão,
              dados pessoais serão eliminados ou anonimizados, exceto quando a retenção for exigida por lei (como obrigações fiscais ou guarda de logs pelo Marco Civil da Internet).
            </p>
          </section>

          {/* Seção 8 */}
          <section id="secao-8" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              8. Direitos do Titular dos Dados (Art. 18 da LGPD)
            </h2>
            <p>
              A LGPD assegura a você, como titular de dados pessoais, uma série de direitos que podem ser exercidos
              mediante requisição formal direcionada ao nosso Encarregado:
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-surface p-4">
                <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                  <CheckCircle2 className="size-4 text-accent" />
                  Confirmação e Acesso
                </div>
                <p className="mt-1 text-xs text-muted">
                  Direito de saber se tratamos seus dados e solicitar cópia completa de suas informações.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-surface p-4">
                <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                  <CheckCircle2 className="size-4 text-accent" />
                  Correção de Dados
                </div>
                <p className="mt-1 text-xs text-muted">
                  Solicitar a atualização ou retificação de dados incompletos, inexatos ou desatualizados.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-surface p-4">
                <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                  <CheckCircle2 className="size-4 text-accent" />
                  Anonimização ou Exclusão
                </div>
                <p className="mt-1 text-xs text-muted">
                  Exigir a eliminação ou bloqueio de dados desnecessários, excessivos ou tratados em desconformidade.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-surface p-4">
                <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                  <CheckCircle2 className="size-4 text-accent" />
                  Portabilidade e Revogação
                </div>
                <p className="mt-1 text-xs text-muted">
                  Receber seus dados para migração ou revogar consentimentos previamente concedidos.
                </p>
              </div>
            </div>
          </section>

          {/* Seção 9 */}
          <section id="secao-9" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              9. Transferência Internacional de Dados
            </h2>
            <p>
              Tendo em vista o uso de infraestrutura em nuvem e tecnologias globais de processamento de inteligência
              artificial, alguns de seus dados podem ser tratados em servidores localizados fora do território nacional
              (como nos Estados Unidos ou União Europeia).
            </p>
            <p className="text-sm text-muted sm:text-base">
              Nessas ocasiões, garantimos que os provedores contratados cumpram normas internacionais de proteção de dados
              compatíveis com a LGPD e adotem cláusulas contratuais padrão de segurança e confidencialidade.
            </p>
          </section>

          {/* Seção 10 */}
          <section id="secao-10" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              10. Privacidade de Menores de Idade
            </h2>
            <p>
              A plataforma destina-se primordialmente a indivíduos com idade igual ou superior a 18 anos. Caso um menor
              de idade deseje utilizar a plataforma, o cadastro e o consentimento deverão ser realizados sob assistência ou
              representação de ao menos um dos pais ou responsável legal, nos termos do art. 14 da LGPD.
            </p>
          </section>

          {/* Seção 11 */}
          <section id="secao-11" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              11. Canal do Encarregado (DPO) e Atendimento
            </h2>
            <p>
              Para esclarecer dúvidas sobre esta Política de Privacidade, atualizar seus dados cadastrais ou exercer
              qualquer um dos direitos previstos na LGPD, entre em contato diretamente com o nosso Encarregado pelo
              Tratamento de Dados Pessoais (Data Protection Officer):
            </p>

            <div className="rounded-xl border border-accent/30 bg-accent-soft/20 p-5">
              <p className="font-semibold text-foreground">Encarregado de Proteção de Dados (DPO):</p>
              <p className="mt-1 text-sm text-muted">Comitê de Privacidade e Segurança da Informação</p>
              <p className="mt-2 text-sm">
                <strong>E-mail direto para solicitações:</strong>{" "}
                <a
                  href="mailto:privacidade@smartlms.com.br"
                  className="font-medium text-accent underline underline-offset-4 hover:opacity-90"
                >
                  privacidade@smartlms.com.br
                </a>
              </p>
              <p className="mt-1 text-xs text-muted">
                Prazo de resposta inicial: até 15 (quinze) dias úteis, conforme estipulado pela LGPD.
              </p>
            </div>
          </section>
        </article>

        {/* Bloco de Contato Final */}
        <div className="mt-16 rounded-2xl border border-border bg-surface p-8 text-center sm:text-left">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="space-y-1.5">
              <h3 className="font-display text-lg font-bold text-foreground">
                Precisa exercer seus direitos de titular?
              </h3>
              <p className="text-sm text-muted">
                Envie sua solicitação com o assunto &quot;Privacidade LGPD&quot; e atenderemos seu pedido.
              </p>
            </div>
            <a
              href="mailto:privacidade@smartlms.com.br"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-xs transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mail className="size-4" />
              Contatar Encarregado
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
