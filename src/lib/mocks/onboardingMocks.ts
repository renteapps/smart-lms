import { ContentMapping } from '@/types/trilha';

export type MockContentItem = Omit<ContentMapping, 'unlockAfterDays'> & {
  category?: string;
};

export const MOCK_CONTENT_ITEMS: MockContentItem[] = [
  { id: 'c1', type: 'course', title: 'React de Zero a Mestre', slug: 'react-zero-mestre', category: 'Desenvolvimento' },
  { id: 'c2', type: 'course', title: 'Inteligência Emocional no Trabalho', slug: 'ie-trabalho', category: 'Soft Skills' },
  { id: 'm1', type: 'module', title: 'Introdução ao React', category: 'Desenvolvimento' },
  { id: 'm2', type: 'module', title: 'Componentes e Hooks', category: 'Desenvolvimento' },
  { id: 'l1', type: 'lesson', title: 'Bem-vindo ao Curso!', category: 'Desenvolvimento' },
  { id: 'l2', type: 'lesson', title: 'O que é React?', category: 'Desenvolvimento' },
  { id: 'l3', type: 'lesson', title: 'Criando seu primeiro componente', category: 'Desenvolvimento' },
  { id: 'a1', type: 'article', title: 'Como melhorar sua inteligência emocional', slug: 'melhorar-ie', category: 'Soft Skills' },
  { id: 'a2', type: 'article', title: '10 dicas de produtividade', slug: 'dicas-produtividade', category: 'Produtividade' },
  { id: 'ext1', type: 'external_link', title: 'Documentação Oficial do React', url: 'https://react.dev', category: 'Referências' },
];

export const getMockContentByType = (type: string) => {
  if (type === 'all') return MOCK_CONTENT_ITEMS;
  return MOCK_CONTENT_ITEMS.filter(item => item.type === type);
};
