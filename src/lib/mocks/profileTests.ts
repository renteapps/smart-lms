import { ProfileTest } from '@/types/profileTest';

export const MOCK_PROFILE_TESTS: ProfileTest[] = [
  {
    id: 'test-1',
    title: 'Descubra seu Perfil de Liderança',
    description: 'Avalie suas competências comportamentais e identifique qual é o seu estilo dominante de liderança e influência em equipes.',
    coverUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop',
    status: 'published',
    createdAt: '2026-07-10T10:00:00Z',
    updatedAt: '2026-07-20T14:30:00Z',
    completionsCount: 342,
    categories: [
      {
        id: 'cat-visionario',
        name: 'Líder Visionário',
        emoji: '🚀',
        color: '#3B82F6', // Blue
        description: 'Você inspira através de uma visão clara do futuro, engaja pessoas com grande propósito e encoraja a inovação e o pensamento estratégico.'
      },
      {
        id: 'cat-comunicador',
        name: 'Comunicador Empático',
        emoji: '💬',
        color: '#10B981', // Emerald
        description: 'Sua força está nas relações humanas, escuta ativa, inteligência emocional e capacidade de resolver conflitos com harmonia.'
      },
      {
        id: 'cat-executor',
        name: 'Executor Estratégico',
        emoji: '⚡',
        color: '#F59E0B', // Amber
        description: 'Você foca na entrega, eficiência, definição de metas claras e superação de obstáculos com agilidade e pragmatismo.'
      },
      {
        id: 'cat-mentor',
        name: 'Mentor Desenvolvedor',
        emoji: '🌱',
        color: '#8B5CF6', // Purple
        description: 'Seu objetivo principal é o crescimento da sua equipe. Você investe tempo em feedback, delegação e desenvolvimento contínuo dos liderados.'
      }
    ],
    questions: [
      {
        id: 'q1',
        text: 'Diante de uma mudança repentina nos objetivos do projeto, qual é sua primeira reação?',
        options: [
          {
            id: 'o1_1',
            text: 'Reúno a equipe para entender como todos estão se sentindo e garantir alinhamento emocional.',
            categoryScores: { 'cat-comunicador': 3, 'cat-mentor': 1 }
          },
          {
            id: 'o1_2',
            text: 'Apresento a nova visão de longo prazo e as oportunidades que essa mudança nos trará.',
            categoryScores: { 'cat-visionario': 3, 'cat-executor': 1 }
          },
          {
            id: 'o1_3',
            text: 'Reorganizo o cronograma de tarefas imediatamente e defino prioridades claras de execução.',
            categoryScores: { 'cat-executor': 3, 'cat-visionario': 1 }
          },
          {
            id: 'o1_4',
            text: 'Aproveito para delegar novos desafios aos membros da equipe, incentivando seu aprendizado.',
            categoryScores: { 'cat-mentor': 3, 'cat-comunicador': 1 }
          }
        ]
      },
      {
        id: 'q2',
        text: 'Como você prefere dar feedback a um membro da equipe com baixa performance?',
        options: [
          {
            id: 'o2_1',
            text: 'Com empatia e escuta ativa, buscando entender as causas pessoais ou profissionais do desafio.',
            categoryScores: { 'cat-comunicador': 3, 'cat-mentor': 1 }
          },
          {
            id: 'o2_2',
            text: 'Criando um plano de desenvolvimento individual (PDI) com metas de aprendizado contínuo.',
            categoryScores: { 'cat-mentor': 3, 'cat-executor': 1 }
          },
          {
            id: 'o2_3',
            text: 'Sendo direto e objetivo em relação às métricas não atingidas e cobrando planos de ação.',
            categoryScores: { 'cat-executor': 3 }
          },
          {
            id: 'o2_4',
            text: 'Remostrando o propósito maior do trabalho e como o papel dele se conecta com o futuro do negócio.',
            categoryScores: { 'cat-visionario': 3 }
          }
        ]
      },
      {
        id: 'q3',
        text: 'Qual destas frases descreve melhor o seu maior valor como profissional?',
        options: [
          {
            id: 'o3_1',
            text: '"Eu transformo ideias ousadas em direções inspiradoras para o time."',
            categoryScores: { 'cat-visionario': 3 }
          },
          {
            id: 'o3_2',
            text: '"Eu crio um ambiente seguro, colaborativo e com comunicação transparente."',
            categoryScores: { 'cat-comunicador': 3 }
          },
          {
            id: 'o3_3',
            text: '"Eu garanto resultados excepcionais e alto desempenho operacional."',
            categoryScores: { 'cat-executor': 3 }
          },
          {
            id: 'o3_4',
            text: '"Eu desenvolvo pessoas para que se tornem futuros líderes."',
            categoryScores: { 'cat-mentor': 3 }
          }
        ]
      }
    ]
  },
  {
    id: 'test-2',
    title: 'Diagnóstico de Inteligência Emocional e Soft Skills',
    description: 'Descubra suas fortalezas na gestão de emoções, autoconhecimento e resiliência no ambiente corporativo.',
    coverUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop',
    status: 'draft',
    createdAt: '2026-07-15T09:00:00Z',
    updatedAt: '2026-07-22T11:00:00Z',
    completionsCount: 0,
    categories: [
      {
        id: 'cat-autodesenvolvimento',
        name: 'Autoconhecimento Elevado',
        emoji: '🧘',
        color: '#EC4899', // Pink
        description: 'Você possui profunda clareza sobre suas emoções, gatilhos e pontos fortes.'
      },
      {
        id: 'cat-resiliencia',
        name: 'Mestre em Resiliência',
        emoji: '🛡️',
        color: '#6366F1', // Indigo
        description: 'Você lida com pressão e adversidades com facilidade e capacidade de adaptação rápida.'
      }
    ],
    questions: []
  }
];
