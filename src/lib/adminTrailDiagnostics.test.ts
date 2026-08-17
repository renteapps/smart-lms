import { describe, expect, it } from 'vitest';
import { analyzeQuestionnaire } from './adminTrailDiagnostics';
import { Questionnaire } from '@/types/trilha';
import { mockQuestionnaire } from './seed/questionnaire';

describe('admin trail diagnostics', () => {
  it('detects answers without content and content shared by exclusive answers', () => {
    const questionnaire: Questionnaire = {
      ...mockQuestionnaire,
      questions: [{
        id: 'single', type: 'single', role: 'perfil', text: 'Escolha única', options: [
          { label: 'A', contentMappings: [{ id: 'l1', type: 'lesson', title: 'Bem-vindo ao Curso!', learningRole: 'essential' }] },
          { label: 'B', contentMappings: [{ id: 'l1', type: 'lesson', title: 'Bem-vindo ao Curso!', learningRole: 'essential' }] },
          { label: 'C', contentMappings: [] },
        ],
      }, mockQuestionnaire.questions.at(-1)!],
    };
    const diagnostics = analyzeQuestionnaire(questionnaire);
    expect(diagnostics.some((item) => item.title === 'Resposta sem conteúdo associado')).toBe(true);
    expect(diagnostics.some((item) => item.title === 'Conteúdo em respostas exclusivas')).toBe(true);
  });
});
