export type ContentBlock = {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'video' | 'quiz' | 'reflexao' | 'citacao' | 'table';
  content: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
};

export type Lesson = {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'profile_test';
  videoUrl?: string;
  content: string;
  blocks?: ContentBlock[];
  attachments: { name: string; url: string }[];
  durationInMinutes: number;
  isCompleted?: boolean;
  userRating?: number; // 0 to 5
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  profileTestId?: string;
  profileTestConfig?: {
    allowSkipIfCompleted?: boolean;
    requireRetake?: boolean;
  };
};

export type Module = {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  order: number;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  title: string;
  description: string;
  modules: Module[];
};

export const MOCK_COURSE: Course = {
  id: "c1",
  title: "React de Zero a Mestre",
  description: "Aprenda tudo sobre React moderno com Hooks e Next.js.",
  modules: [
    {
      id: "m1",
      title: "Módulo 1: Introdução ao React",
      description: "Fundamentos essenciais do React, configuração de ambiente e diagnósticos iniciais.",
      coverUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1600&auto=format&fit=crop",
      order: 1,
      lessons: [
        {
          id: "l1",
          title: "Bem-vindo ao Curso!",
          type: "video",
          videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
          content: "Esta é a aula inaugural do curso. Prepare-se para aprender muito!",
          blocks: [
            { id: "b1", type: "h1", content: "Bem-vindo ao Curso!" },
            { id: "b2", type: "paragraph", content: "Esta é a aula inaugural do curso. Prepare-se para aprender muito!" },
            { id: "b3", type: "reflexao", content: "O que você espera alcançar ao final deste curso?" }
          ],
          attachments: [{ name: "Guia_de_Estudos.pdf", url: "#" }],
          durationInMinutes: 5,
          isCompleted: true
        },
        {
          id: "l2",
          title: "O que é React?",
          type: "video",
          videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
          content: "Entendendo os conceitos fundamentais do React e Virtual DOM.",
          attachments: [],
          durationInMinutes: 12,
          isCompleted: false
        },
        {
          id: "l-profile-1",
          title: "Diagnóstico: Descubra seu Perfil de Liderança",
          type: "profile_test",
          content: "Avalie suas competências comportamentais antes de avançar para a próxima fase.",
          attachments: [],
          durationInMinutes: 10,
          isCompleted: false,
          profileTestId: "test-1",
          profileTestConfig: {
            allowSkipIfCompleted: true,
            requireRetake: false
          }
        }
      ]
    },
    {
      id: "m2",
      title: "Módulo 2: Componentes e Hooks",
      description: "Aprofundando no desenvolvimento de componentes reutilizáveis e gerenciamento de estado.",
      coverUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1600&auto=format&fit=crop",
      order: 2,
      lessons: [
        {
          id: "l3",
          title: "Criando seu primeiro componente",
          type: "video",
          videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
          content: "Como criar componentes funcionais.",
          attachments: [],
          durationInMinutes: 15
        },
        {
          id: "l4",
          title: "Entendendo useState",
          type: "video",
          videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
          content: "Gerenciamento de estado local em components.",
          attachments: [{ name: "Exemplo_Hooks.zip", url: "#" }],
          durationInMinutes: 20
        }
      ]
    }
  ]
};
