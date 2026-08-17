import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveDynamicSalesUrl,
  extractDynamicVariables,
  validateSalesUrl,
  generatePlatformPresetUrl,
  getCourseSalesConfig,
  saveCourseSalesConfig,
  DYNAMIC_VARIABLES,
  type CourseSalesConfig,
} from './salesUrlHelper';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

describe('salesUrlHelper', () => {
  describe('DYNAMIC_VARIABLES catalog', () => {
    it('should have core contact variables', () => {
      const tags = DYNAMIC_VARIABLES.map(v => v.tag);
      expect(tags).toContain('{{contact.name}}');
      expect(tags).toContain('{{contact.email}}');
      expect(tags).toContain('{{contact.phone}}');
      expect(tags).toContain('{{contact.first_name}}');
      expect(tags).toContain('{{contact.document}}');
    });
  });

  describe('resolveDynamicSalesUrl', () => {
    it('should replace contact dynamic variables with URL encoding', () => {
      const template = 'https://sun.eduzz.com/1234?name={{contact.name}}&email={{contact.email}}&phone={{contact.phone}}';
      const context = {
        contact: {
          name: 'João Pedro & Maria',
          email: 'joao.pedro@empresa.com',
          phone: '11987654321',
        },
      };

      const resolved = resolveDynamicSalesUrl(template, context);
      expect(resolved).toBe('https://sun.eduzz.com/1234?name=Jo%C3%A3o%20Pedro%20%26%20Maria&email=joao.pedro%40empresa.com&phone=11987654321');
    });

    it('should infer first_name and last_name when only contact.name is provided', () => {
      const template = 'https://checkout.com?fn={{contact.first_name}}&ln={{contact.last_name}}';
      const context = {
        contact: {
          name: 'Ana Clara Albuquerque',
        },
      };

      const resolved = resolveDynamicSalesUrl(template, context, { encodeQueryValues: false });
      expect(resolved).toBe('https://checkout.com?fn=Ana&ln=Clara Albuquerque');
    });

    it('should replace course and UTM parameters', () => {
      const template = 'https://hotmart.com/pay?src={{utm_source}}&course={{course.id}}&title={{course.title}}';
      const context = {
        course: {
          id: 'course-101',
          title: 'LMS Masterclass',
        },
        tracking: {
          utm_source: 'whatsapp_vip',
        },
      };

      const resolved = resolveDynamicSalesUrl(template, context, { encodeQueryValues: false });
      expect(resolved).toBe('https://hotmart.com/pay?src=whatsapp_vip&course=course-101&title=LMS Masterclass');
    });

    it('should handle case insensitivity and whitespace in tags', () => {
      const template = 'https://sun.eduzz.com/123?email={{  CONTACT.EMAIL  }}&phone={{contact.phone}}';
      const context = {
        contact: {
          email: 'test@domain.com',
          phone: '21999998888',
        },
      };

      const resolved = resolveDynamicSalesUrl(template, context, { encodeQueryValues: false });
      expect(resolved).toBe('https://sun.eduzz.com/123?email=test@domain.com&phone=21999998888');
    });

    it('should fallback to empty string for missing variables by default', () => {
      const template = 'https://kiwify.com?email={{contact.email}}&unknown={{contact.unknown_field}}';
      const context = {
        contact: {
          email: 'user@teste.com',
        },
      };

      const resolved = resolveDynamicSalesUrl(template, context, { encodeQueryValues: false });
      expect(resolved).toBe('https://kiwify.com?email=user@teste.com&unknown=');
    });
  });

  describe('extractDynamicVariables', () => {
    it('should extract all unique variable names from template', () => {
      const template = 'https://sun.eduzz.com/123?name={{contact.name}}&email={{contact.email}}&dup={{contact.name}}&course={{course.id}}';
      const vars = extractDynamicVariables(template);
      expect(vars).toEqual(['contact.name', 'contact.email', 'course.id']);
    });
  });

  describe('validateSalesUrl', () => {
    it('should validate valid URLs with tags', () => {
      const res = validateSalesUrl('https://sun.eduzz.com/123?email={{contact.email}}');
      expect(res.isValid).toBe(true);
      expect(res.hasDynamicTags).toBe(true);
    });

    it('should flag single brace errors like {contact.name}', () => {
      const res = validateSalesUrl('https://sun.eduzz.com/123?email={contact.email}');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('chaves duplas');
    });

    it('should flag missing http/https protocol', () => {
      const res = validateSalesUrl('sun.eduzz.com/123?email={{contact.email}}');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('http:// ou https://');
    });
  });

  describe('generatePlatformPresetUrl', () => {
    it('should generate Eduzz checkout URL with dynamic variables', () => {
      const url = generatePlatformPresetUrl('eduzz', { produtoId: '998877' });
      expect(url).toContain('https://sun.eduzz.com/998877');
      expect(url).toContain('email={{contact.email}}');
      expect(url).toContain('cel={{contact.phone}}');
    });

    it('should generate Hotmart checkout URL with dynamic variables', () => {
      const url = generatePlatformPresetUrl('hotmart', { produtoId: 'ABC', codigoOferta: 'PROMO10' });
      expect(url).toContain('https://pay.hotmart.com/ABC');
      expect(url).toContain('phone_checkout={{contact.phone}}');
      expect(url).toContain('&off=PROMO10');
    });

    it('should generate Kiwify checkout URL with dynamic variables', () => {
      const url = generatePlatformPresetUrl('kiwify', { produtoId: 'kiwi123' });
      expect(url).toContain('https://checkout.kiwify.com.br/kiwi123');
      expect(url).toContain('phone={{contact.phone}}');
    });
  });

  describe('localStorage persistence', () => {
    let localStorage: MemoryStorage;

    beforeEach(() => {
      localStorage = new MemoryStorage();
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage } });
    });

    afterEach(() => {
      Reflect.deleteProperty(globalThis, 'window');
    });

    it('should save and load course sales configuration', () => {
      const config: CourseSalesConfig = {
        courseId: 'curso-42',
        salesUrl: 'https://pay.hotmart.com/ABC?email={{contact.email}}',
        salesPageUrl: 'https://escola.com/cursos/42',
        primaryPlatform: 'hotmart',
        integracoes: [
          {
            id: 'int_1',
            plataforma: 'hotmart',
            produtoId: 'ABC',
            codigoOferta: 'OFERTA_1',
            tempoAcesso: '730',
          },
        ],
      };

      saveCourseSalesConfig('curso-42', config);
      const loaded = getCourseSalesConfig('curso-42');

      expect(loaded.courseId).toBe('curso-42');
      expect(loaded.salesUrl).toBe(config.salesUrl);
      expect(loaded.primaryPlatform).toBe('hotmart');
      expect(loaded.integracoes).toHaveLength(1);
      expect(loaded.integracoes[0].tempoAcesso).toBe('730');
    });
  });
});
