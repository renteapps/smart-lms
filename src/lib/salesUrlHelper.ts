export type DynamicVariableCategory = 'contact' | 'course' | 'tracking' | 'platform';

export interface DynamicVariable {
  tag: string;
  key: string;
  label: string;
  description: string;
  category: DynamicVariableCategory;
  example: string;
}

export interface SalesContactContext {
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  document?: string;
  id?: string;
  [key: string]: string | undefined;
}

export interface SalesCourseContext {
  id?: string;
  title?: string;
  slug?: string;
  category?: string;
}

export interface SalesTrackingContext {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  coupon_code?: string;
  affiliate_id?: string;
}

export interface SalesResolutionContext {
  contact?: SalesContactContext;
  course?: SalesCourseContext;
  tracking?: SalesTrackingContext;
  userVariables?: UserVariableMap;
  [key: string]: unknown;
}

export type PlataformaCheckout = 'eduzz' | 'hotmart' | 'kiwify' | 'stripe' | 'custom' | 'nenhuma';

export interface IntegracaoOferta {
  id: string;
  plataforma: PlataformaCheckout;
  produtoId: string;
  codigoOferta: string;
  tempoAcesso: string;
  customCheckoutUrl?: string;
  label?: string;
}

export interface CourseSalesConfig {
  courseId: string;
  salesUrl: string;
  salesPageUrl?: string;
  primaryPlatform?: PlataformaCheckout;
  integracoes: IntegracaoOferta[];
  updatedAt?: string;
  [key: string]: unknown;
}

export const DYNAMIC_VARIABLES: DynamicVariable[] = [
  {
    tag: '{{contact.name}}',
    key: 'contact.name',
    label: 'Nome Completo',
    description: 'Nome completo do contato/lead cadastrado',
    category: 'contact',
    example: 'Carlos Eduardo da Silva',
  },
  {
    tag: '{{contact.first_name}}',
    key: 'contact.first_name',
    label: 'Primeiro Nome',
    description: 'Primeiro nome do contato (ex: Carlos)',
    category: 'contact',
    example: 'Carlos',
  },
  {
    tag: '{{contact.last_name}}',
    key: 'contact.last_name',
    label: 'Sobrenome',
    description: 'Sobrenome do contato (ex: Silva)',
    category: 'contact',
    example: 'Silva',
  },
  {
    tag: '{{contact.email}}',
    key: 'contact.email',
    label: 'E-mail',
    description: 'E-mail do contato para preenchimento de checkout',
    category: 'contact',
    example: 'carlos.eduardo@exemplo.com',
  },
  {
    tag: '{{contact.phone}}',
    key: 'contact.phone',
    label: 'Telefone / WhatsApp',
    description: 'Telefone com DDD do contato',
    category: 'contact',
    example: '11998877665',
  },
  {
    tag: '{{contact.document}}',
    key: 'contact.document',
    label: 'CPF / CNPJ',
    description: 'Documento do contato (se disponível no cadastro)',
    category: 'contact',
    example: '12345678900',
  },
  {
    tag: '{{contact.id}}',
    key: 'contact.id',
    label: 'ID do Contato',
    description: 'Identificador único do aluno ou lead no sistema',
    category: 'contact',
    example: 'lead_98a72f',
  },
  {
    tag: '{{course.id}}',
    key: 'course.id',
    label: 'ID do Curso',
    description: 'Identificador do curso no Smart LMS',
    category: 'course',
    example: '1',
  },
  {
    tag: '{{course.title}}',
    key: 'course.title',
    label: 'Título do Curso',
    description: 'Nome completo do curso',
    category: 'course',
    example: 'Inteligência Emocional no Trabalho',
  },
  {
    tag: '{{course.slug}}',
    key: 'course.slug',
    label: 'Slug do Curso',
    description: 'Identificador amigável na URL',
    category: 'course',
    example: 'inteligencia-emocional',
  },
  {
    tag: '{{utm_source}}',
    key: 'utm_source',
    label: 'UTM Source',
    description: 'Origem do tráfego (ex: whatsapp, email, instagram)',
    category: 'tracking',
    example: 'whatsapp',
  },
  {
    tag: '{{utm_campaign}}',
    key: 'utm_campaign',
    label: 'UTM Campaign',
    description: 'Nome da campanha de marketing',
    category: 'tracking',
    example: 'lancamento_agosto',
  },
  {
    tag: '{{coupon.code}}',
    key: 'coupon.code',
    label: 'Código de Cupom',
    description: 'Cupom de desconto a ser aplicado no checkout',
    category: 'tracking',
    example: 'DESCONTO10',
  },
];

export const DEFAULT_SAMPLE_CONTACT: SalesContactContext = {
  name: 'Carlos Eduardo da Silva',
  first_name: 'Carlos',
  last_name: 'Silva',
  email: 'carlos.eduardo@exemplo.com',
  phone: '11998877665',
  document: '12345678900',
  id: 'lead_98a72f',
};

/**
 * Resolve todas as variáveis dinâmicas em uma URL de vendas ou checkout.
 */
export function resolveDynamicSalesUrl(
  urlTemplate: string,
  context: SalesResolutionContext = {},
  options: { encodeQueryValues?: boolean; fallbackToEmpty?: boolean } = {}
): string {
  if (!urlTemplate) return '';

  const { encodeQueryValues = true, fallbackToEmpty = true } = options;

  const contact = context.contact || {};
  const course = context.course || {};
  const tracking = context.tracking || {};

  // Infer first and last name if only full name was provided
  const fullName = contact.name || '';
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const inferredFirstName = contact.first_name || nameParts[0] || '';
  const inferredLastName = contact.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

  const map: Record<string, string> = {
    ...(context.userVariables || {}),
    'contact.name': fullName,
    'contact.first_name': inferredFirstName,
    'contact.last_name': inferredLastName,
    'contact.email': contact.email || '',
    'contact.phone': contact.phone || '',
    'contact.document': contact.document || '',
    'contact.id': contact.id || '',
    'course.id': course.id ? String(course.id) : '',
    'course.title': course.title || '',
    'course.slug': course.slug || '',
    'utm_source': tracking.utm_source || '',
    'utm_medium': tracking.utm_medium || '',
    'utm_campaign': tracking.utm_campaign || '',
    'utm_content': tracking.utm_content || '',
    'utm_term': tracking.utm_term || '',
    'coupon.code': tracking.coupon_code || '',
    'affiliate.id': tracking.affiliate_id || '',
    first_name: inferredFirstName,
    last_name: inferredLastName,
    full_name: fullName,
    email: contact.email || '',
  };

  // Replace all {{key}} occurrences
  return urlTemplate.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]*)\s*(?:\|\s*([^{}]*?))?\s*\}\}/g, (match, rawKey, rawFallback) => {
    const key = rawKey.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      const val = map[key];
      const resolved = val || String(rawFallback || '').trim();
      return encodeQueryValues ? encodeURIComponent(resolved) : resolved;
    }
    // Check root context
    if (context[key] !== undefined && typeof context[key] === 'string') {
      return encodeQueryValues ? encodeURIComponent(context[key]) : context[key];
    }
    const fallback = String(rawFallback || '').trim();
    if (fallback) return encodeQueryValues ? encodeURIComponent(fallback) : fallback;
    return fallbackToEmpty ? '' : match;
  });
}

/**
 * Extrai todas as variáveis dinâmicas presentes em um template de URL.
 */
export function extractDynamicVariables(urlTemplate: string): string[] {
  if (!urlTemplate) return [];
  const matches = [...urlTemplate.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]*)\s*(?:\|\s*[^{}]*?)?\s*\}\}/g)];
  return Array.from(new Set(matches.map((match) => match[1].toLowerCase())));
}

/**
 * Validação básica de URL e sintaxe de tags.
 */
export function validateSalesUrl(url: string): { isValid: boolean; error?: string; hasDynamicTags: boolean } {
  if (!url || !url.trim()) {
    return { isValid: false, error: 'URL não informada.', hasDynamicTags: false };
  }

  const trimmed = url.trim();
  const hasDynamicTags = /\{\{\s*[a-zA-Z0-9_.]+\s*\}\}/.test(trimmed);

  // Check for broken tag brackets like {contact.name} without double braces
  const brokenTagRegex = /(?<!\{)\{([a-zA-Z0-9_.]+)\}(?!\})/;
  if (brokenTagRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Formato de tag inválido. Use chaves duplas, por exemplo {{contact.name}}.',
      hasDynamicTags,
    };
  }

  // Check valid protocol or relative format
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
    return {
      isValid: false,
      error: 'A URL deve começar com http:// ou https://',
      hasDynamicTags,
    };
  }

  return { isValid: true, hasDynamicTags };
}

/**
 * Gera URL de template recomendada para plataformas conhecidas.
 */
export function generatePlatformPresetUrl(
  platform: PlataformaCheckout,
  params: { produtoId?: string; codigoOferta?: string; courseId?: string } = {}
): string {
  const prod = (params.produtoId || '').trim();
  const oferta = (params.codigoOferta || '').trim();

  switch (platform) {
    case 'eduzz':
      return `https://sun.eduzz.com/${prod || '123456'}?email={{contact.email}}&name={{contact.name}}&cel={{contact.phone}}&doc={{contact.document}}${oferta ? `&cupom=${oferta}` : ''}`;
    case 'hotmart':
      return `https://pay.hotmart.com/${prod || 'PROD_XYZ'}?email={{contact.email}}&name={{contact.name}}&phone_checkout={{contact.phone}}&doc={{contact.document}}${oferta ? `&off=${oferta}` : ''}`;
    case 'kiwify':
      return `https://checkout.kiwify.com.br/${prod || 'kiwi_abc'}?email={{contact.email}}&name={{contact.name}}&phone={{contact.phone}}&document={{contact.document}}`;
    case 'stripe':
      return `https://buy.stripe.com/${prod || 'checkout_session'}?prefilled_email={{contact.email}}`;
    default:
      return `https://meusite.com.br/checkout?email={{contact.email}}&name={{contact.name}}&phone={{contact.phone}}&curso_id={{course.id}}`;
  }
}

// Chave para persistência em localStorage
export const COURSE_SALES_STORAGE_KEY_PREFIX = '@smartlms:course-sales:';

export function getCourseSalesStorageKey(courseId: string): string {
  return `${COURSE_SALES_STORAGE_KEY_PREFIX}${courseId}`;
}

export function getCourseSalesConfig(courseId: string, defaultCourseTitle?: string): CourseSalesConfig {
  if (typeof window === 'undefined') {
    return getDefaultCourseSalesConfig(courseId, defaultCourseTitle);
  }

  try {
    const raw = window.localStorage.getItem(getCourseSalesStorageKey(courseId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          courseId,
          salesUrl: parsed.salesUrl || '',
          salesPageUrl: parsed.salesPageUrl || '',
          primaryPlatform: parsed.primaryPlatform || 'eduzz',
          integracoes: Array.isArray(parsed.integracoes) ? parsed.integracoes : [],
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.error('Erro ao ler configurações de vendas do localStorage:', err);
  }

  return getDefaultCourseSalesConfig(courseId, defaultCourseTitle);
}

export function saveCourseSalesConfig(courseId: string, config: CourseSalesConfig): void {
  if (typeof window === 'undefined') return;

  try {
    const dataToSave: CourseSalesConfig = {
      ...config,
      courseId,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(getCourseSalesStorageKey(courseId), JSON.stringify(dataToSave));
  } catch (err) {
    console.error('Erro ao salvar configurações de vendas no localStorage:', err);
  }
}

export function getDefaultCourseSalesConfig(courseId: string, _defaultCourseTitle?: string): CourseSalesConfig {
  return {
    courseId,
    salesUrl: `https://sun.eduzz.com/123456?email={{contact.email}}&name={{contact.name}}&cel={{contact.phone}}&doc={{contact.document}}`,
    salesPageUrl: `https://minhaescola.com/cursos/${courseId}`,
    primaryPlatform: 'eduzz',
    integracoes: [
      {
        id: 'int_default_1',
        plataforma: 'eduzz',
        produtoId: '123456',
        codigoOferta: 'OFERTA_PRINCIPAL',
        tempoAcesso: '365',
        customCheckoutUrl: `https://sun.eduzz.com/123456?email={{contact.email}}&name={{contact.name}}&cel={{contact.phone}}`,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}
import type { UserVariableMap } from '@/lib/userVariables';
