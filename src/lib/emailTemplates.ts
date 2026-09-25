import { CustomEmailTemplate, EmailTemplateType, EmailTemplateVariable } from "@/types/resend";
import { escapeHtml, interpolateUserTemplate, warnMissingUserVariables, type UserVariableMap } from "@/lib/userVariables";
import { getSiteUrl } from "@/lib/siteUrl";
import { DEFAULT_APPEARANCE } from "@/types/appearance";

/** Cor usada quando a Aparência não define uma (mesma da marca atual). */
export const DEFAULT_BRAND_COLOR = "#2d52e6";

export interface EmailTemplateData {
  name?: string;
  nome?: string;
  email?: string;
  loginUrl?: string;
  link_login?: string;
  resetUrl?: string;
  link_recuperacao?: string;
  courseTitle?: string;
  nome_curso?: string;
  courseUrl?: string;
  link_curso?: string;
  certificateUrl?: string;
  link_certificado?: string;
  certificateCode?: string;
  codigo_certificado?: string;
  notificationTitle?: string;
  titulo_notificacao?: string;
  notificationMessage?: string;
  mensagem_notificacao?: string;
  actionUrl?: string;
  link_acao?: string;
  actionText?: string;
  texto_acao?: string;
  planName?: string;
  nome_plano?: string;
  planPrice?: string;
  valor_plano?: string;
  daysInactive?: number;
  dias_inativo?: number;
  appName?: string;
  nome_plataforma?: string;
  userVariables?: UserVariableMap;
  [key: string]: unknown;
}

export const EMAIL_TEMPLATES_STORAGE_KEY = "@smartlms:email_templates_v2";

export const GLOBAL_EMAIL_VARIABLES: EmailTemplateVariable[] = [
  {
    tag: "{{nome}}",
    label: "Primeiro nome",
    example: "Carlos",
    description: "Primeiro nome do destinatário (vem do cadastro ou da compra).",
  },
  {
    tag: "{{email}}",
    label: "E-mail do destinatário",
    example: "carlos@empresa.com",
    description: "Endereço para onde o e-mail foi enviado.",
  },
  {
    tag: "{{nome_plataforma}}",
    label: "Nome da plataforma",
    example: "Método G6",
    description: "Nome configurado em Aparência (não o nome do remetente).",
  },
  {
    tag: "{{link_plataforma}}",
    label: "Endereço da plataforma",
    example: "https://www.plataformag6.com",
    description: "Página inicial da plataforma. Use em links secundários e no rodapé.",
  },
  {
    tag: "{{cor_marca}}",
    label: "Cor da marca",
    example: "#2d52e6",
    description: "Cor principal configurada em Aparência. Use em botões e destaques.",
  },
  {
    tag: "{{ano_atual}}",
    label: "Ano atual",
    example: `${new Date().getFullYear()}`,
    description: "Ano corrente, para o rodapé.",
  },
];

/*
 * Layout base de todos os e-mails.
 *
 * Regras de e-mail que valem para qualquer edição aqui:
 *  - layout em tabelas e estilos inline: Gmail e Outlook descartam boa parte do
 *    <style>; o bloco de <style> só refina (mobile e modo escuro);
 *  - botão "à prova de Outlook": o fundo fica no <td bgcolor>, não no <a>;
 *  - todo botão tem o endereço escrito logo abaixo — link de acesso quebrado
 *    ou bloqueado pelo cliente de e-mail é o motivo nº 1 de "não consigo entrar";
 *  - cores da marca vêm de {{cor_marca}} (Aparência), nunca fixas.
 */

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const emailButton = (url: string, label: string) => `<table role="presentation" border="0" cellpadding="0" cellspacing="0" class="button-table" style="margin: 28px 0 0;">
  <tr>
    <td bgcolor="{{cor_marca}}" style="border-radius: 10px; background-color: {{cor_marca}};">
      <a href="${url}" target="_blank" class="button" style="display: inline-block; padding: 14px 28px; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 600; line-height: 20px; color: #ffffff; text-decoration: none; border-radius: 10px;">${label}</a>
    </td>
  </tr>
</table>`;

/** Endereço escrito por extenso, para quando o botão não abre. */
const linkFallback = (url: string) => `<p class="muted-text" style="margin: 20px 0 0; font-size: 13px; line-height: 20px; color: #6b7280;">
  Se o botão não funcionar, copie e cole este endereço no navegador:<br>
  <a href="${url}" target="_blank" style="color: {{cor_marca}}; text-decoration: underline; word-break: break-all;">${url}</a>
</p>`;

const eyebrow = (text: string) => `<p style="margin: 0 0 12px; font-size: 12px; line-height: 16px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: {{cor_marca}};">${text}</p>`;

const heading = (text: string) => `<h1 class="heading" style="margin: 0 0 16px; font-size: 24px; line-height: 32px; font-weight: 700; letter-spacing: -0.02em; color: #111827;">${text}</h1>`;

const paragraph = (html: string) => `<p class="body-text" style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #4b5563;">${html}</p>`;

/** Caixa de destaque neutra (dados do curso, código do certificado, avisos). */
const infoBox = (html: string) => `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 0;">
  <tr>
    <td class="info-box" style="padding: 18px 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px;">
      ${html}
    </td>
  </tr>
</table>`;

const infoLabel = (text: string) => `<p class="muted-text" style="margin: 0 0 4px; font-size: 12px; line-height: 16px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #6b7280;">${text}</p>`;

const infoValue = (html: string) => `<p class="heading" style="margin: 0; font-size: 17px; line-height: 24px; font-weight: 700; color: #111827;">${html}</p>`;

/** Passos numerados (primeiro acesso, convite). */
const steps = (items: string[]) => `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 0;">
${items.map((item, index) => `  <tr>
    <td valign="top" width="32" style="padding: 0 0 12px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
        <td align="center" valign="middle" width="24" height="24" style="width: 24px; height: 24px; border-radius: 12px; background-color: {{cor_marca}}; color: #ffffff; font-size: 12px; font-weight: 700; line-height: 24px;">${index + 1}</td>
      </tr></table>
    </td>
    <td valign="top" class="body-text" style="padding: 2px 0 12px; font-size: 15px; line-height: 22px; color: #4b5563;">${item}</td>
  </tr>`).join("\n")}
</table>`;

const baseHtmlShell = (content: string, previewText: string) => `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>{{nome_plataforma}}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, h1 { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

    @media only screen and (max-width: 620px) {
      .shell-cell { padding: 16px 8px !important; }
      .card { padding: 28px 20px !important; border-radius: 14px !important; }
      .heading { font-size: 21px !important; line-height: 28px !important; }
      .button-table, .button-table td { width: 100% !important; }
      .button { display: block !important; text-align: center !important; }
    }

    @media (prefers-color-scheme: dark) {
      body, .email-shell { background-color: #0f1115 !important; }
      .card { background-color: #171a21 !important; border-color: #2a2f3a !important; }
      .heading { color: #f3f4f6 !important; }
      .body-text { color: #c4c9d4 !important; }
      .muted-text, .footer-text { color: #8b93a3 !important; }
      .info-box { background-color: #1e222b !important; border-color: #2a2f3a !important; }
      .brand-name, .strong-text { color: #f3f4f6 !important; }
    }
    [data-ogsc] .card { background-color: #171a21 !important; border-color: #2a2f3a !important; }
    [data-ogsc] .heading, [data-ogsc] .brand-name, [data-ogsc] .strong-text { color: #f3f4f6 !important; }
    [data-ogsc] .body-text { color: #c4c9d4 !important; }
    [data-ogsc] .muted-text, [data-ogsc] .footer-text { color: #8b93a3 !important; }
    [data-ogsc] .info-box { background-color: #1e222b !important; border-color: #2a2f3a !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: ${FONT_STACK}; color: #111827; -webkit-font-smoothing: antialiased;">
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all;">
    ${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-shell" style="width: 100%; background-color: #f3f4f6;">
    <tr>
      <td align="center" class="shell-cell" style="padding: 32px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; max-width: 560px;">
          <tr>
            <td style="padding: 0 4px 20px;">
              <a href="{{link_plataforma}}" target="_blank" style="text-decoration: none;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 3px; background-color: {{cor_marca}}; margin-right: 8px; vertical-align: middle;"></span><span class="brand-name" style="font-size: 16px; line-height: 20px; font-weight: 700; letter-spacing: -0.01em; color: #111827; vertical-align: middle;">{{nome_plataforma}}</span>
              </a>
            </td>
          </tr>

          <tr>
            <td class="card" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px 36px;">
${content}
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 4px 0;">
              <p class="footer-text" style="margin: 0 0 6px; font-size: 12px; line-height: 18px; color: #9ca3af;">
                Precisa de ajuda? É só responder este e-mail.
              </p>
              <p class="footer-text" style="margin: 0; font-size: 12px; line-height: 18px; color: #9ca3af;">
                Enviado por <a href="{{link_plataforma}}" target="_blank" style="color: #9ca3af; text-decoration: underline;">{{nome_plataforma}}</a> para {{email}} · © {{ano_atual}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/** Monta um template com o mesmo preheader do campo "Texto de prévia". */
function template(
  base: Omit<CustomEmailTemplate, "html" | "isCustomized" | "variables"> & { variables?: EmailTemplateVariable[] },
  content: string,
): CustomEmailTemplate {
  return {
    ...base,
    isCustomized: false,
    variables: [...GLOBAL_EMAIL_VARIABLES, ...(base.variables ?? [])],
    html: baseHtmlShell(content, base.previewText),
  };
}

export function getDefaultTemplateDefinitions(): CustomEmailTemplate[] {
  return [
    template(
      {
        type: "welcome",
        name: "Primeiro acesso",
        description: "Enviado quando uma compra (Hotmart/Eduzz) cria a conta do aluno, e pelo \"Reenviar acesso\" do suporte. O botão leva a criar a senha — precisa usar {{link_login}}.",
        category: "platform",
        subject: "Seu acesso está liberado — {{nome_plataforma}}",
        previewText: "Crie sua senha e comece a estudar.",
        variables: [
          {
            tag: "{{link_login}}",
            label: "Link de acesso",
            example: "https://www.plataformag6.com/auth/confirm?token_hash=…",
            description: "Link pessoal para criar a senha e entrar. Expira em pouco tempo — obrigatório no botão.",
          },
          {
            tag: "{{curso}}",
            label: "Produto comprado",
            example: "Plano Anual",
            description: "Nome do plano ou curso da compra (vazio no reenvio pelo suporte).",
          },
        ],
      },
      `${eyebrow("Acesso liberado")}
${heading("Olá, {{nome}}! Sua conta está pronta.")}
${paragraph("Seu acesso à plataforma <strong class=\"strong-text\" style=\"color: #111827;\">{{nome_plataforma}}</strong> já está ativo. Para entrar pela primeira vez, crie sua senha pelo botão abaixo.")}
${steps([
  "<strong class=\"strong-text\" style=\"color: #111827;\">Crie sua senha</strong> pelo botão deste e-mail.",
  "<strong class=\"strong-text\" style=\"color: #111827;\">Complete seu cadastro</strong> — leva menos de um minuto.",
  "<strong class=\"strong-text\" style=\"color: #111827;\">Comece pela sua trilha</strong> e siga no seu ritmo.",
])}
${emailButton("{{link_login}}", "Criar minha senha")}
${linkFallback("{{link_login}}")}
${infoBox(`<p class="body-text" style="margin: 0; font-size: 13px; line-height: 20px; color: #4b5563;">Por segurança, este link vale por pouco tempo e só pode ser usado uma vez. Se ele expirar, acesse <a href="{{link_plataforma}}/resetar-senha" target="_blank" style="color: {{cor_marca}};">{{link_plataforma}}/resetar-senha</a> e informe este e-mail ({{email}}) para receber um novo.</p>`)}`,
    ),
    template(
      {
        type: "password_reset",
        name: "Redefinição de senha",
        description: "Enviado pelo \"Redefinir senha\" do suporte no admin. O \"Esqueci a senha\" do próprio aluno sai pelo Supabase.",
        category: "platform",
        subject: "Redefina sua senha — {{nome_plataforma}}",
        previewText: "Use o link para criar uma nova senha.",
        variables: [
          {
            tag: "{{link_recuperacao}}",
            label: "Link de redefinição",
            example: "https://www.plataformag6.com/auth/confirm?token_hash=…",
            description: "Link pessoal e temporário para criar uma nova senha.",
          },
        ],
      },
      `${eyebrow("Segurança da conta")}
${heading("Vamos criar uma nova senha, {{nome}}")}
${paragraph("Recebemos um pedido para redefinir a senha da sua conta na plataforma {{nome_plataforma}}. Clique no botão para escolher uma nova.")}
${emailButton("{{link_recuperacao}}", "Criar nova senha")}
${linkFallback("{{link_recuperacao}}")}
${infoBox(`<p class="body-text" style="margin: 0; font-size: 13px; line-height: 20px; color: #4b5563;">O link vale por pouco tempo e só pode ser usado uma vez. Não pediu a troca? Ignore este e-mail — sua senha atual continua valendo.</p>`)}`,
    ),
    template(
      {
        type: "course_enrollment",
        name: "Matrícula confirmada",
        description: "Para avisar que um curso foi liberado. Ainda não é disparado automaticamente — use em campanhas.",
        category: "platform",
        subject: "Curso liberado: {{nome_curso}}",
        previewText: "Suas aulas já estão disponíveis.",
        variables: [
          { tag: "{{nome_curso}}", label: "Nome do curso", example: "Liderança na Prática", description: "Título do curso liberado." },
          { tag: "{{link_curso}}", label: "Link do curso", example: "https://www.plataformag6.com/courses/lideranca", description: "Página do curso na plataforma." },
        ],
      },
      `${eyebrow("Curso liberado")}
${heading("Tudo pronto para começar, {{nome}}")}
${paragraph("Sua matrícula foi confirmada e as aulas já estão disponíveis na plataforma {{nome_plataforma}}.")}
${infoBox(`${infoLabel("Curso")}${infoValue("{{nome_curso}}")}`)}
${emailButton("{{link_curso}}", "Começar o curso")}
${linkFallback("{{link_curso}}")}`,
    ),
    template(
      {
        type: "certificate",
        name: "Certificado emitido",
        description: "Para avisar que o certificado de conclusão está disponível. Ainda não é disparado automaticamente — use em campanhas.",
        category: "platform",
        subject: "Seu certificado de {{nome_curso}} está pronto",
        previewText: "Parabéns pela conclusão! Baixe e compartilhe seu certificado.",
        variables: [
          { tag: "{{nome_curso}}", label: "Nome do curso", example: "Liderança na Prática", description: "Curso concluído." },
          { tag: "{{codigo_certificado}}", label: "Código do certificado", example: "G6-8F3A21", description: "Código de validação pública." },
          { tag: "{{link_certificado}}", label: "Link do certificado", example: "https://www.plataformag6.com/certificados/8f3a21", description: "Página pública do certificado." },
        ],
      },
      `${eyebrow("Conclusão")}
${heading("Parabéns, {{nome}}! Você concluiu o curso.")}
${paragraph("Seu certificado já está disponível. Você pode baixá-lo e compartilhar o link com quem quiser — qualquer pessoa consegue validar a autenticidade.")}
${infoBox(`${infoLabel("Curso")}${infoValue("{{nome_curso}}")}
<p class="muted-text" style="margin: 12px 0 0; font-size: 13px; line-height: 20px; color: #6b7280;">Código de validação: <strong class="strong-text" style="color: #111827;">{{codigo_certificado}}</strong></p>`)}
${emailButton("{{link_certificado}}", "Ver meu certificado")}
${linkFallback("{{link_certificado}}")}`,
    ),
    template(
      {
        type: "subscription",
        name: "Assinatura confirmada",
        description: "Para confirmar a ativação de um plano. Ainda não é disparado automaticamente — use em campanhas.",
        category: "platform",
        subject: "Assinatura confirmada: {{nome_plano}}",
        previewText: "Seu plano está ativo e todo o conteúdo liberado.",
        variables: [
          { tag: "{{nome_plano}}", label: "Nome do plano", example: "Plano Anual", description: "Plano contratado." },
          { tag: "{{link_login}}", label: "Link de acesso", example: "https://www.plataformag6.com/acessar", description: "Página para entrar na plataforma." },
        ],
      },
      `${eyebrow("Assinatura ativa")}
${heading("Seu plano está ativo, {{nome}}")}
${paragraph("Confirmamos sua assinatura. Todo o conteúdo incluído no seu plano já está liberado na plataforma {{nome_plataforma}}.")}
${infoBox(`${infoLabel("Plano")}${infoValue("{{nome_plano}}")}`)}
${emailButton("{{link_login}}", "Acessar a plataforma")}
${linkFallback("{{link_login}}")}`,
    ),
    template(
      {
        type: "org_invite",
        name: "Convite de empresa",
        description: "Enviado quando o gestor de uma empresa convida um colaborador. O botão leva à página do convite ({{link_convite}}).",
        category: "platform",
        subject: "{{nome_empresa}} convidou você para a plataforma {{nome_plataforma}}",
        previewText: "Aceite o convite para estudar com a sua equipe.",
        variables: [
          { tag: "{{nome_empresa}}", label: "Nome da empresa", example: "Acme Ltda", description: "Empresa que enviou o convite." },
          { tag: "{{link_convite}}", label: "Link do convite", example: "https://www.plataformag6.com/convite/…", description: "Link pessoal para aceitar o convite. Expira em 14 dias." },
        ],
      },
      `${eyebrow("Convite da sua empresa")}
${heading("Você foi convidado(a) para a plataforma {{nome_plataforma}}")}
${paragraph("A <strong class=\"strong-text\" style=\"color: #111827;\">{{nome_empresa}}</strong> liberou para você o acesso à plataforma de estudos da equipe.")}
${steps([
  "Abra o convite pelo botão abaixo.",
  "Crie sua conta com <strong class=\"strong-text\" style=\"color: #111827;\">{{email}}</strong> — ou entre, se já tiver uma.",
  "Aceite o convite e veja os cursos liberados pela empresa.",
])}
${emailButton("{{link_convite}}", "Aceitar convite")}
${linkFallback("{{link_convite}}")}
${infoBox(`<p class="body-text" style="margin: 0; font-size: 13px; line-height: 20px; color: #4b5563;">O convite vale por 14 dias e só funciona com o e-mail {{email}}. Se expirar, peça ao gestor da sua empresa para reenviar.</p>`)}`,
    ),
    template(
      {
        type: "inactivity",
        name: "Reengajamento",
        description: "Para chamar de volta quem parou de estudar. Ainda não é disparado automaticamente — use em campanhas.",
        category: "notification",
        subject: "{{nome}}, seu próximo passo está esperando",
        previewText: "Retome de onde parou — 15 minutos já fazem diferença.",
        variables: [
          { tag: "{{dias_inativo}}", label: "Dias sem estudar", example: "7", description: "Dias desde o último acesso (preencha na campanha)." },
          { tag: "{{link_acao}}", label: "Link do botão", example: "https://www.plataformag6.com/minha-trilha", description: "Para onde o botão leva. Sem valor, vai para a plataforma." },
        ],
      },
      `${eyebrow("Sua trilha")}
${heading("Que tal retomar hoje, {{nome}}?")}
${paragraph("Sua trilha na plataforma {{nome_plataforma}} continua de onde você parou. Uma sessão curta hoje já ajuda a manter o ritmo — 15 minutos fazem diferença.")}
${emailButton("{{link_acao}}", "Continuar de onde parei")}
${linkFallback("{{link_acao}}")}`,
    ),
    template(
      {
        type: "notification",
        name: "Comunicado",
        description: "Base das campanhas manuais em Notificações: título, mensagem e botão vêm do formulário da campanha.",
        category: "notification",
        subject: "{{titulo_notificacao}}",
        previewText: "{{titulo_notificacao}}",
        variables: [
          { tag: "{{titulo_notificacao}}", label: "Título", example: "Novo módulo liberado", description: "Título da campanha." },
          { tag: "{{mensagem_notificacao}}", label: "Mensagem", example: "Adicionamos 4 aulas práticas ao seu curso.", description: "Corpo da campanha (aceita quebras de linha)." },
          { tag: "{{link_acao}}", label: "Link do botão", example: "https://www.plataformag6.com/minha-trilha", description: "Para onde o botão leva. Sem valor, vai para a plataforma." },
          { tag: "{{texto_acao}}", label: "Texto do botão", example: "Acessar a plataforma", description: "Rótulo do botão." },
        ],
      },
      `${eyebrow("{{nome_plataforma}}")}
${heading("{{titulo_notificacao}}")}
<div class="body-text" style="margin: 0; font-size: 15px; line-height: 24px; color: #4b5563; white-space: pre-line;">{{mensagem_notificacao}}</div>
${emailButton("{{link_acao}}", "{{texto_acao}}")}`,
    ),
  ];
}

// In-memory cache for server-side
const serverCustomTemplates: Record<string, CustomEmailTemplate> = {};

export function getCustomTemplates(): Record<string, CustomEmailTemplate> {
  const defaults = getDefaultTemplateDefinitions();
  const map: Record<string, CustomEmailTemplate> = {};
  defaults.forEach((t) => {
    map[t.type] = t;
  });

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(EMAIL_TEMPLATES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.keys(parsed).forEach((k) => {
          if (map[k]) {
            map[k] = { ...map[k], ...parsed[k], isCustomized: true };
          }
        });
      }
    } catch (e) {
      console.error("Erro ao ler templates customizados:", e);
    }
  } else {
    Object.keys(serverCustomTemplates).forEach((k) => {
      if (map[k]) {
        map[k] = { ...map[k], ...serverCustomTemplates[k], isCustomized: true };
      }
    });
  }

  return map;
}

export function saveCustomTemplate(template: CustomEmailTemplate): CustomEmailTemplate {
  const current = getCustomTemplates();
  const updated: CustomEmailTemplate = {
    ...template,
    isCustomized: true,
    updatedAt: new Date().toISOString(),
  };

  current[template.type] = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(EMAIL_TEMPLATES_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.error("Erro ao salvar template customizado:", e);
    }
  }

  serverCustomTemplates[template.type] = updated;
  return updated;
}

export function resetCustomTemplate(type: EmailTemplateType): CustomEmailTemplate {
  const defaults = getDefaultTemplateDefinitions();
  const original = defaults.find((t) => t.type === type) || defaults[0];

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(EMAIL_TEMPLATES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        delete parsed[type];
        localStorage.setItem(EMAIL_TEMPLATES_STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (e) {
      console.error("Erro ao resetar template:", e);
    }
  }

  delete serverCustomTemplates[type];
  return { ...original, isCustomized: false };
}

/** Variáveis cujo conteúdo é escrito pelo admin e pode conter HTML intencional. */
const ADMIN_AUTHORED_HTML_KEYS = new Set(["mensagem_notificacao", "notification_message"]);

/**
 * Universal tag / variable interpolator.
 * Replaces {{tag}} or {{ tag }} with data values.
 */
export function interpolateVariables(
  template: string,
  data: EmailTemplateData = {},
  options: { html?: boolean; diagnosticContext?: string } = {},
): string {
  if (!template) return "";

  // As variáveis do perfil (`userVariables`) entram antes dos exemplos: sem isso,
  // uma campanha que só passa o userId saía com "Estudante" / "aluno@exemplo.com",
  // porque o mapa abaixo sobrescreve o que veio de `userVariables`.
  const userVariables = (data.userVariables || {}) as Record<string, string | undefined>;
  const name = data.name || data.nome || userVariables.nome || "aluno(a)";
  const email = data.email || userVariables.email || "";
  const appName = data.appName || data.nome_plataforma || DEFAULT_APPEARANCE.platformName;
  const currentDate = new Date().toLocaleDateString("pt-BR");
  const currentYear = `${new Date().getFullYear()}`;

  // Sem valor, links caem em páginas reais da plataforma e dados ficam vazios —
  // nunca em exemplos fictícios, que chegariam assim num e-mail de verdade.
  const siteUrl = String(data.link_plataforma || getSiteUrl());
  const brandColor = String(data.cor_marca || DEFAULT_BRAND_COLOR);
  const courseTitle = data.courseTitle || data.nome_curso || "";
  const courseUrl = data.courseUrl || data.link_curso || `${siteUrl}/cursos`;
  const loginUrl = data.loginUrl || data.link_login || `${siteUrl}/acessar`;
  const resetUrl = data.resetUrl || data.link_recuperacao || `${siteUrl}/resetar-senha`;
  const certificateCode = data.certificateCode || data.codigo_certificado || "";
  const certificateUrl = data.certificateUrl || data.link_certificado || `${siteUrl}/perfil`;
  const planName = data.planName || data.nome_plano || "";
  const planPrice = data.planPrice || data.valor_plano || "";
  const daysInactive = `${data.daysInactive || data.dias_inativo || ""}`;
  const notificationTitle = data.notificationTitle || data.titulo_notificacao || `Aviso da ${appName}`;
  const notificationMessage = data.notificationMessage || data.mensagem_notificacao || "";
  const actionUrl = data.actionUrl || data.link_acao || siteUrl;
  const actionText = data.actionText || data.texto_acao || "Acessar a plataforma";

  const map: Record<string, string> = {
    ...(data.userVariables || {}),
    nome: name,
    name: name,
    email: email,
    user_email: email,
    nome_plataforma: appName,
    app_name: appName,
    link_plataforma: siteUrl,
    cor_marca: brandColor,
    data_atual: currentDate,
    current_date: currentDate,
    ano_atual: currentYear,
    current_year: currentYear,
    nome_curso: courseTitle,
    course_title: courseTitle,
    link_curso: courseUrl,
    course_url: courseUrl,
    link_login: loginUrl,
    login_url: loginUrl,
    link_recuperacao: resetUrl,
    reset_url: resetUrl,
    codigo_certificado: certificateCode,
    certificate_code: certificateCode,
    link_certificado: certificateUrl,
    certificate_url: certificateUrl,
    nome_plano: planName,
    plan_name: planName,
    valor_plano: planPrice,
    plan_price: planPrice,
    dias_inativo: daysInactive,
    days_inactive: daysInactive,
    titulo_notificacao: notificationTitle,
    notification_title: notificationTitle,
    mensagem_notificacao: notificationMessage,
    notification_message: notificationMessage,
    link_acao: actionUrl,
    action_url: actionUrl,
    texto_acao: actionText,
    action_text: actionText,
  };

  // Replace any custom data keys
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === "string" || typeof data[key] === "number") {
      map[key] = String(data[key]);
    }
  });

  // Em HTML, todo valor é escapado: nome e dados do comprador vêm do webhook de
  // pagamento e do cadastro, e sem escape viravam HTML injetado no e-mail.
  // Só o corpo da campanha, escrito pelo admin, pode trazer marcação própria.
  const result = interpolateUserTemplate(template, map, (value, key) => (
    options.html && !ADMIN_AUTHORED_HTML_KEYS.has(key) ? escapeHtml(value) : value
  ));
  if (options.diagnosticContext) warnMissingUserVariables(options.diagnosticContext, result.missingKeys);
  return result.value;
}

export function generateEmailHtml(
  type: EmailTemplateType,
  data: EmailTemplateData = {}
): { subject: string; html: string; previewText: string } {
  const templates = getCustomTemplates();
  const template = templates[type] || getDefaultTemplateDefinitions()[0];

  const subject = interpolateVariables(template.subject, data);
  const previewText = interpolateVariables(template.previewText, data);
  const html = interpolateVariables(template.html, data, { html: true });

  return { subject, html, previewText };
}
