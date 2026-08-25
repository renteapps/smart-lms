import { CustomEmailTemplate, EmailTemplateType, EmailTemplateVariable } from "@/types/resend";

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
  [key: string]: unknown;
}

export const EMAIL_TEMPLATES_STORAGE_KEY = "@smartlms:email_templates_v2";

export const GLOBAL_EMAIL_VARIABLES: EmailTemplateVariable[] = [
  {
    tag: "{{nome}}",
    label: "Nome do Aluno",
    example: "Carlos Silva",
    description: "Primeiro nome ou nome completo do destinatário.",
  },
  {
    tag: "{{email}}",
    label: "E-mail do Aluno",
    example: "carlos@empresa.com",
    description: "Endereço de e-mail cadastrado.",
  },
  {
    tag: "{{nome_plataforma}}",
    label: "Nome da Plataforma",
    example: "Smart LMS",
    description: "Nome do sistema configurado no remetente.",
  },
  {
    tag: "{{data_atual}}",
    label: "Data Atual",
    example: new Date().toLocaleDateString("pt-BR"),
    description: "Data em que o e-mail foi disparado.",
  },
  {
    tag: "{{ano_atual}}",
    label: "Ano Atual",
    example: `${new Date().getFullYear()}`,
    description: "Ano corrente para rodapés e copyright.",
  },
];

const emailButton = (
  url: string,
  label: string,
  bgColor: string = "#0f172a",
  textColor: string = "#ffffff"
) => `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:290px;" arcsize="18%" strokecolor="${bgColor}" fillcolor="${bgColor}">
        <w:anchorlock/>
        <center style="color:${textColor};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">${label}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${url}" class="button" style="display: inline-block; background-color: ${bgColor}; color: ${textColor}; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); box-sizing: border-box;">
        ${label}
      </a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;

const baseHtmlShell = (content: string, previewText: string = "{{nome_plataforma}}") => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>{{nome_plataforma}}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a, span, p, h1, h2 {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
    }

    * {
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }

    table, td {
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
      border-collapse: collapse;
    }

    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    a {
      text-decoration: none;
    }

    @media only screen and (max-width: 620px) {
      .email-shell { padding: 22px 8px !important; }
      .container { width: 100% !important; max-width: 100% !important; }
      .content-box { padding: 28px 20px !important; border-radius: 18px !important; }
      .button { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
      .heading { font-size: 21px !important; line-height: 27px !important; }
      .alt-box { padding: 16px !important; }
      .footer-cell { padding-top: 20px !important; }
    }

    @media (prefers-color-scheme: dark) {
      body, .email-shell {
        background-color: #0b0d12 !important;
      }
      .content-box {
        background-color: #12151c !important;
        border-color: #252a35 !important;
      }
      .heading, .section-title {
        color: #f5f7fa !important;
      }
      .body-text, .alt-box-text {
        color: #a6adba !important;
      }
      .alt-box {
        background-color: #171b23 !important;
        border-color: #262b36 !important;
      }
      .divider {
        border-color: #262b36 !important;
      }
      .footer-text {
        color: #747d8d !important;
      }
    }

    [data-ogsc] body, [data-ogsc] .email-shell {
      background-color: #0b0d12 !important;
    }
    [data-ogsc] .content-box {
      background-color: #12151c !important;
      border-color: #252a35 !important;
    }
    [data-ogsc] .heading, [data-ogsc] .section-title {
      color: #f5f7fa !important;
    }
    [data-ogsc] .body-text, [data-ogsc] .alt-box-text {
      color: #a6adba !important;
    }
    [data-ogsc] .alt-box {
      background-color: #171b23 !important;
      border-color: #262b36 !important;
    }
    [data-ogsc] .footer-text {
      color: #747d8d !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <!-- Preview text hack -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all;">
    ${previewText}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-shell" style="width: 100%; background-color: #f8fafc; padding: 36px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="container" style="width: 100%; max-width: 580px; margin: 0 auto;">

          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background: #0f172a; padding: 10px 18px; border-radius: 12px;">
                    <span style="color: #ffffff; font-weight: 800; font-size: 16px; letter-spacing: -0.5px;">✦ {{nome_plataforma}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td class="content-box" style="background-color: #ffffff; border-radius: 16px; padding: 36px 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" class="footer-cell" style="padding-top: 24px; text-align: center;">
              <p class="footer-text" style="margin: 0 0 6px; color: #94a3b8; font-size: 12px; line-height: 1.5;">Este e-mail foi enviado automaticamente por <strong>{{nome_plataforma}}</strong> para {{email}}.</p>
              <p class="footer-text" style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">© {{ano_atual}} {{nome_plataforma}}. Todos os direitos reservados.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export function getDefaultTemplateDefinitions(): CustomEmailTemplate[] {
  return [
    {
      type: "welcome",
      name: "Boas-vindas à Plataforma",
      description: "Disparado imediatamente após o aluno criar a conta na plataforma.",
      category: "platform",
      subject: "Boas-vindas ao {{nome_plataforma}}! 🚀",
      previewText: "Bem-vindo(a) à plataforma {{nome_plataforma}}! Comece seus estudos agora.",
      isCustomized: false,
      variables: [
        ...GLOBAL_EMAIL_VARIABLES,
        {
          tag: "{{link_login}}",
          label: "Link de Login",
          example: "https://smartlms.com/login",
          description: "URL para o aluno acessar o painel.",
        },
      ],
      html: baseHtmlShell(`
<div style="text-align: center; margin-bottom: 24px;">
  <div style="display: inline-block; background-color: #e0f2fe; color: #0284c7; padding: 8px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 12px;">
    🎉 Cadastro Confirmado
  </div>
  <h1 class="heading" style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">
    Olá, {{nome}}!
  </h1>
  <p class="body-text" style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
    Sua conta na plataforma <strong>{{nome_plataforma}}</strong> está pronta para ser usada. Prepare-se para uma experiência de aprendizado moderna, interativa e personalizada com inteligência artificial.
  </p>
</div>

<div class="alt-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
  <h3 class="heading" style="color: #0f172a; font-size: 14px; font-weight: 700; margin: 0 0 8px;">O que você pode fazer agora:</h3>
  <ul class="alt-box-text" style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.6;">
    <li>Explorar o catálogo de cursos e trilhas guiadas</li>
    <li>Praticar com os Agentes de IA tutores</li>
    <li>Conquistar certificados verificados</li>
  </ul>
</div>

<div style="margin-top: 32px;">
  ${emailButton("{{link_login}}", "Acessar Minha Conta →", "#0f172a")}
</div>
`),
    },
    {
      type: "password_reset",
      name: "Redefinição de Senha",
      description: "Enviado quando o usuário solicita a recuperação ou troca de senha.",
      category: "platform",
      subject: "Redefinir sua senha - {{nome_plataforma}} 🔒",
      previewText: "Instruções seguras para criar uma nova senha no {{nome_plataforma}}.",
      isCustomized: false,
      variables: [
        ...GLOBAL_EMAIL_VARIABLES,
        {
          tag: "{{link_recuperacao}}",
          label: "Link de Recuperação",
          example: "https://smartlms.com/recuperar-senha?token=xyz",
          description: "URL segura temporária para resetar a senha.",
        },
      ],
      html: baseHtmlShell(`
<div style="text-align: center; margin-bottom: 24px;">
  <div style="display: inline-block; background-color: #fef3c7; color: #d97706; padding: 8px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 12px;">
    🔒 Segurança da Conta
  </div>
  <h1 class="heading" style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">
    Olá, {{nome}}
  </h1>
  <p class="body-text" style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
    Recebemos uma solicitação de redefinição de senha para a sua conta no <strong>{{nome_plataforma}}</strong>.
  </p>
</div>

<div style="margin: 32px 0;">
  ${emailButton("{{link_recuperacao}}", "Criar Nova Senha", "#2563eb")}
</div>

<div class="alt-box" style="background-color: #f8fafc; border-left: 4px solid #94a3b8; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-top: 24px;">
  <p class="alt-box-text" style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">
    Este link é válido por <strong>60 minutos</strong>. Se você não solicitou a alteração, ignore este e-mail.
  </p>
</div>
`),
    },
    {
      type: "course_enrollment",
      name: "Matrícula Confirmada",
      description: "Enviado quando o aluno adquire ou é matriculado em um curso.",
      category: "platform",
      subject: "Matrícula Confirmada: {{nome_curso}} 🎓",
      previewText: "Você foi matriculado(a) com sucesso no curso {{nome_curso}}.",
      isCustomized: false,
      variables: [
        ...GLOBAL_EMAIL_VARIABLES,
        {
          tag: "{{nome_curso}}",
          label: "Nome do Curso",
          example: "Formação Especialista em Next.js",
          description: "Título oficial do curso liberado.",
        },
        {
          tag: "{{link_curso}}",
          label: "Link do Curso",
          example: "https://smartlms.com/cursos/nextjs",
          description: "URL direta da sala de aula.",
        },
      ],
      html: baseHtmlShell(`
<div style="text-align: center; margin-bottom: 24px;">
  <div style="display: inline-block; background-color: #dcfce7; color: #16a34a; padding: 8px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 12px;">
    🎓 Acesso Liberado
  </div>
  <h1 class="heading" style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">
    Parabéns, {{nome}}!
  </h1>
  <p class="body-text" style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
    Sua matrícula foi aprovada e as aulas já estão liberadas na plataforma <strong>{{nome_plataforma}}</strong>:
  </p>
</div>

<div class="alt-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
  <p class="alt-box-text" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">Curso Liberado</p>
  <h2 class="heading" style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0;">{{nome_curso}}</h2>
</div>

<div style="margin-top: 32px;">
  ${emailButton("{{link_curso}}", "Começar a Assistir Agora →", "#0f172a")}
</div>
`),
    },
    {
      type: "certificate",
      name: "Certificado de Conclusão",
      description: "Enviado quando o aluno finaliza todos os requisitos de um curso.",
      category: "platform",
      subject: "Seu Certificado de Conclusão está pronto! 🏆",
      previewText: "Parabéns! Seu certificado do curso {{nome_curso}} foi emitido.",
      isCustomized: false,
      variables: [
        ...GLOBAL_EMAIL_VARIABLES,
        {
          tag: "{{nome_curso}}",
          label: "Nome do Curso",
          example: "Liderança de Alta Performance",
          description: "Curso concluído pelo aluno.",
        },
        {
          tag: "{{codigo_certificado}}",
          label: "Código do Certificado",
          example: "CERT-849201",
          description: "Código de autenticidade único para validação pública.",
        },
        {
          tag: "{{link_certificado}}",
          label: "Link do Certificado",
          example: "https://smartlms.com/certificados/849201",
          description: "URL para baixar e compartilhar o certificado.",
        },
      ],
      html: baseHtmlShell(`
<div style="text-align: center; margin-bottom: 24px;">
  <div style="display: inline-block; background-color: #fef9c3; color: #a16207; padding: 8px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 12px;">
    🏆 Conquista Desbloqueada
  </div>
  <h1 class="heading" style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">
    Sensacional, {{nome}}!
  </h1>
  <p class="body-text" style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
    Você concluiu com sucesso todas as aulas e atividades do curso <strong>{{nome_curso}}</strong>.
  </p>
</div>

<div class="alt-box" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
  <p class="alt-box-text" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px;">Código de Autenticidade</p>
  <span class="heading" style="font-family: monospace; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: 2px;">{{codigo_certificado}}</span>
</div>

<div style="margin-top: 32px;">
  ${emailButton("{{link_certificado}}", "Visualizar e Baixar Certificado 📄", "#16a34a")}
</div>
`),
    },
    {
      type: "subscription",
      name: "Assinatura Confirmada",
      description: "Enviado quando uma assinatura mensal/anual é ativada com sucesso.",
      category: "platform",
      subject: "Assinatura Ativada: Bem-vindo(a) ao {{nome_plano}}! ⭐",
      previewText: "Sua assinatura do {{nome_plano}} está confirmada no {{nome_plataforma}}.",
      isCustomized: false,
      variables: [
        ...GLOBAL_EMAIL_VARIABLES,
        {
          tag: "{{nome_plano}}",
          label: "Nome do Plano",
          example: "Plano Pro Mensal",
          description: "Nome do plano contratado.",
        },
        {
          tag: "{{valor_plano}}",
          label: "Valor do Plano",
          example: "R$ 59,90/mês",
          description: "Valor formatado da assinatura.",
        },
        {
          tag: "{{link_login}}",
          label: "Link de Acesso",
          example: "https://smartlms.com/login",
          description: "URL da plataforma.",
        },
      ],
      html: baseHtmlShell(`
<div style="text-align: center; margin-bottom: 24px;">
  <div style="display: inline-block; background-color: #f3e8ff; color: #7e22ce; padding: 8px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 12px;">
    ⭐ Membro VIP
  </div>
  <h1 class="heading" style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">
    Tudo pronto, {{nome}}!
  </h1>
  <p class="body-text" style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
    Sua assinatura do <strong>{{nome_plano}}</strong> foi confirmada e todos os recursos exclusivos já estão liberados para você.
  </p>
</div>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="alt-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 24px 0;">
  <tr>
    <td style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="left" class="alt-box-text" style="color: #64748b; font-size: 13px;">Plano contratado:</td>
          <td align="right" class="heading" style="color: #0f172a; font-size: 13px; font-weight: 700;">{{nome_plano}}</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 20px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="left" class="alt-box-text" style="color: #64748b; font-size: 13px;">Valor da recorrência:</td>
          <td align="right" style="color: #16a34a; font-size: 13px; font-weight: 700;">{{valor_plano}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<div style="margin-top: 32px;">
  ${emailButton("{{link_login}}", "Acessar a Plataforma Agora →", "#0f172a")}
</div>
`),
    },
    {
      type: "inactivity",
      name: "Reengajamento por Inatividade",
      description: "Enviado automaticamente quando o aluno passa dias sem estudar.",
      category: "notification",
      subject: "Sentimos sua falta! Volte a estudar no {{nome_plataforma}} 💡",
      previewText: "Você está a apenas 15 minutos de avançar na sua trilha de aprendizagem.",
      isCustomized: false,
      variables: [
        ...GLOBAL_EMAIL_VARIABLES,
        {
          tag: "{{dias_inativo}}",
          label: "Dias sem Estudar",
          example: "7",
          description: "Contagem de dias desde o último login.",
        },
        {
          tag: "{{link_acao}}",
          label: "Link da Trilha",
          example: "https://smartlms.com/minha-trilha",
          description: "URL para o aluno retomar os estudos.",
        },
      ],
      html: baseHtmlShell(`
<div style="text-align: center; margin-bottom: 24px;">
  <div style="display: inline-block; background-color: #ede9fe; color: #6d28d9; padding: 8px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 12px;">
    ⏱️ Pausa nos Estudos
  </div>
  <h1 class="heading" style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">
    Olá, {{nome}}!
  </h1>
  <p class="body-text" style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
    Notamos que faz cerca de <strong>{{dias_inativo}} dias</strong> que você não acessa seus cursos no <strong>{{nome_plataforma}}</strong>.
  </p>
</div>

<div class="alt-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: left;">
  <p class="alt-box-text" style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0;">
    Manter uma rotina de apenas <strong>15 minutos diários</strong> faz toda a diferença para fixar o aprendizado e alcançar seus objetivos de carreira. Seus módulos te aguardam!
  </p>
</div>

<div style="margin-top: 32px;">
  ${emailButton("{{link_acao}}", "Retomar Meus Estudos →", "#0f172a")}
</div>
`),
    },
    {
      type: "notification",
      name: "Comunicado & Notificação Geral",
      description: "Modelo base para avisos manuais, mensagens de instrutores e novidades.",
      category: "notification",
      subject: "🔔 {{titulo_notificacao}}",
      previewText: "{{titulo_notificacao}}",
      isCustomized: false,
      variables: [
        ...GLOBAL_EMAIL_VARIABLES,
        {
          tag: "{{titulo_notificacao}}",
          label: "Título do Aviso",
          example: "Novo módulo liberado no seu curso",
          description: "Título principal da mensagem.",
        },
        {
          tag: "{{mensagem_notificacao}}",
          label: "Corpo da Mensagem",
          example: "Adicionamos uma nova aula prática sobre Inteligência Artificial...",
          description: "Texto ou parágrafos da notificação.",
        },
        {
          tag: "{{link_acao}}",
          label: "Link do Botão (CTA)",
          example: "https://smartlms.com",
          description: "URL para onde o botão direciona.",
        },
        {
          tag: "{{texto_acao}}",
          label: "Texto do Botão",
          example: "Ver Comunicado",
          description: "Label do botão principal.",
        },
      ],
      html: baseHtmlShell(`
<div style="margin-bottom: 24px;">
  <div style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">
    📢 Notificação da Plataforma
  </div>
  <h1 class="heading" style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 16px; letter-spacing: -0.5px;">
    {{titulo_notificacao}}
  </h1>
  <div class="body-text" style="color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-line;">
    {{mensagem_notificacao}}
  </div>
</div>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
  <tr>
    <td class="divider" style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
      ${emailButton("{{link_acao}}", "{{texto_acao}} →", "#0f172a")}
    </td>
  </tr>
</table>
`),
    },
  ];
}

// In-memory cache for server-side
let serverCustomTemplates: Record<string, CustomEmailTemplate> = {};

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

/**
 * Universal tag / variable interpolator.
 * Replaces {{tag}} or {{ tag }} with data values.
 */
export function interpolateVariables(template: string, data: EmailTemplateData = {}): string {
  if (!template) return "";

  const name = data.name || data.nome || "Estudante";
  const email = data.email || "aluno@exemplo.com";
  const appName = data.appName || data.nome_plataforma || "Smart LMS";
  const currentDate = new Date().toLocaleDateString("pt-BR");
  const currentYear = `${new Date().getFullYear()}`;

  const courseTitle = data.courseTitle || data.nome_curso || "Curso Especialista";
  const courseUrl = data.courseUrl || data.link_curso || "https://smartlms.com/cursos";
  const loginUrl = data.loginUrl || data.link_login || "https://smartlms.com/login";
  const resetUrl = data.resetUrl || data.link_recuperacao || "https://smartlms.com/recuperar-senha";
  const certificateCode = data.certificateCode || data.codigo_certificado || "CERT-982410";
  const certificateUrl = data.certificateUrl || data.link_certificado || "https://smartlms.com/certificados";
  const planName = data.planName || data.nome_plano || "Plano Pro Mensal";
  const planPrice = data.planPrice || data.valor_plano || "R$ 59,90/mês";
  const daysInactive = `${data.daysInactive || data.dias_inativo || 7}`;
  const notificationTitle = data.notificationTitle || data.titulo_notificacao || "Aviso importante";
  const notificationMessage = data.notificationMessage || data.mensagem_notificacao || "Conteúdo da notificação.";
  const actionUrl = data.actionUrl || data.link_acao || "https://smartlms.com";
  const actionText = data.actionText || data.texto_acao || "Acessar Plataforma";

  const map: Record<string, string> = {
    nome: name,
    name: name,
    email: email,
    user_email: email,
    nome_plataforma: appName,
    app_name: appName,
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

  return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, key) => {
    return map[key] !== undefined ? map[key] : match;
  });
}

export function generateEmailHtml(
  type: EmailTemplateType,
  data: EmailTemplateData = {}
): { subject: string; html: string; previewText: string } {
  const templates = getCustomTemplates();
  const template = templates[type] || getDefaultTemplateDefinitions()[0];

  const subject = interpolateVariables(template.subject, data);
  const previewText = interpolateVariables(template.previewText, data);
  const html = interpolateVariables(template.html, data);

  return { subject, html, previewText };
}
