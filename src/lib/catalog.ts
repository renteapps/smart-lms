export type CatalogCourse = {
  id: string;
  title: string;
  category: string;
  description: string;
  cover: string;
  duration: string;
  lessonCount: number;
  level: "Essencial" | "Intermediário" | "Avançado";
  progress?: number;
};

export const CATALOG_COURSES: CatalogCourse[] = [
  {
    id: "c1",
    title: "Comunicação que move pessoas",
    category: "Comunicação",
    description: "Construa conversas claras, empáticas e capazes de gerar ação.",
    cover: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=85&w=1200&auto=format&fit=crop",
    duration: "3h 20min",
    lessonCount: 12,
    level: "Essencial",
    progress: 45,
  },
  {
    id: "c2",
    title: "Gestão de tempo com intenção",
    category: "Produtividade",
    description: "Organize prioridades sem transformar sua rotina em uma corrida infinita.",
    cover: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=85&w=1200&auto=format&fit=crop",
    duration: "2h 40min",
    lessonCount: 10,
    level: "Essencial",
  },
  {
    id: "c3",
    title: "Liderança por influência",
    category: "Liderança",
    description: "Lidere com confiança, contexto e presença — mesmo sem autoridade formal.",
    cover: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=85&w=1200&auto=format&fit=crop",
    duration: "4h 10min",
    lessonCount: 16,
    level: "Intermediário",
  },
  {
    id: "c4",
    title: "Feedback que transforma",
    category: "Comunicação",
    description: "Troque julgamentos por diálogos que desenvolvem pessoas e relações.",
    cover: "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?q=85&w=1200&auto=format&fit=crop",
    duration: "2h 15min",
    lessonCount: 8,
    level: "Intermediário",
  },
  {
    id: "c5",
    title: "Negociação ganha-ganha",
    category: "Negociação",
    description: "Prepare conversas difíceis e encontre acordos sustentáveis.",
    cover: "https://images.unsplash.com/photo-1556761175-5973dc0f32b7?q=85&w=1200&auto=format&fit=crop",
    duration: "3h 05min",
    lessonCount: 11,
    level: "Avançado",
  },
  {
    id: "c6",
    title: "Inteligência emocional no trabalho",
    category: "Autoconhecimento",
    description: "Reconheça emoções e responda a situações de pressão com mais escolha.",
    cover: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=85&w=1200&auto=format&fit=crop",
    duration: "3h 45min",
    lessonCount: 14,
    level: "Essencial",
  },
];

export const CONTINUE_LESSONS = [
  {
    id: "l2",
    title: "Escuta ativa: o silêncio também comunica",
    moduleName: "Comunicação · Módulo 1",
    duration: "12 min",
    cover: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=85&w=1000&auto=format&fit=crop",
    progress: 68,
  },
  {
    id: "l3",
    title: "Como transformar prioridades em escolhas",
    moduleName: "Produtividade · Módulo 2",
    duration: "15 min",
    cover: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=85&w=1000&auto=format&fit=crop",
    progress: 32,
  },
];
