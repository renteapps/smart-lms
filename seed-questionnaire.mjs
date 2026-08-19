import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const mockQuestionnaire = {
  version: 1,
  status: 'published',
  questions: [
    {
      id: 'q_formato', type: 'single', role: 'perfil', visualType: 'cards',
      text: 'Qual o seu formato preferido de consumo?',
      options: [
        { label: 'Prática Rápida (Mão na massa)', tags: ['pratica'], contentMappings: [
          { id: 'm2', type: 'module', title: 'Módulo 2: Componentes e Hooks', learningRole: 'deepening' },
          { id: 'a2', type: 'article', title: 'Prática deliberada: como aprender fazendo', learningRole: 'extra', estimatedDurationMin: 10 },
        ] },
        { label: 'Teoria Profunda (Conceitos base)', tags: ['fundamentos'], contentMappings: [
          { id: 'm1', type: 'module', title: 'Módulo 1: Introdução ao React', learningRole: 'essential' },
        ] },
      ],
    },
    {
      id: 'q_objetivo', type: 'single', role: 'perfil', visualType: 'list',
      text: 'O que você mais quer alcançar agora?',
      options: [
        { label: 'Sair do zero com segurança', tags: ['iniciacao', 'iniciante'], weight: 2, contentMappings: [
          { id: 'm1', type: 'module', title: 'Módulo 1: Introdução ao React', learningRole: 'essential' },
          { id: 'ext1', type: 'external_link', title: 'Checklist para sua primeira semana', url: 'https://example.com/checklist', learningRole: 'extra', estimatedDurationMin: 5 },
        ] },
        { label: 'Aprofundar o que já pratico', tags: ['aprofundamento', 'avancado'], weight: 2, contentMappings: [
          { id: 'm2', type: 'module', title: 'Módulo 2: Componentes e Hooks', learningRole: 'essential' },
        ] },
      ],
    },
    {
      id: 'q_problema', type: 'multiple', role: 'problema', visualType: 'physics',
      text: 'O que mais te trava hoje?',
      options: [
        { label: 'Procrastinação', tags: ['procrastinacao'], contentMappings: [{ id: 'a1', type: 'article', title: 'Como criar uma rotina de aprendizagem sustentável', learningRole: 'essential', estimatedDurationMin: 8 }] },
        { label: 'Insegurança', tags: ['inseguranca'], contentMappings: [{ id: 'l1', type: 'lesson', title: 'Bem-vindo ao Curso!', learningRole: 'essential' }] },
        { label: 'Falta de Tempo', tags: ['tempo'], contentMappings: [{ id: 'ext1', type: 'external_link', title: 'Checklist para sua primeira semana', url: 'https://example.com/checklist', learningRole: 'extra', estimatedDurationMin: 5 }] },
        { label: 'Estagnação', tags: ['estagnacao'], contentMappings: [{ id: 'l4', type: 'lesson', title: 'Entendendo useState', learningRole: 'deepening' }] },
      ],
    },
    {
      id: 'q_habilidades', type: 'multiple', role: 'interesse', visualType: 'physics',
      text: 'Que habilidades você quer desenvolver?',
      options: [
        { label: 'Fundamentos', tags: ['fundamentos'], contentMappings: [{ id: 'l2', type: 'lesson', title: 'O que é React?', learningRole: 'essential' }] },
        { label: 'Prática', tags: ['pratica'], contentMappings: [{ id: 'l3', type: 'lesson', title: 'Criando seu primeiro componente', learningRole: 'deepening' }] },
        { label: 'Autogestão', tags: ['autogestao'], contentMappings: [{ id: 'a1', type: 'article', title: 'Como criar uma rotina de aprendizagem sustentável', learningRole: 'extra', estimatedDurationMin: 8 }] },
      ],
    },
    {
      id: 'q_disponibilidade', type: 'availability', role: 'disponibilidade', visualType: 'list', options: [],
      text: 'Quando você quer reservar tempo para estudar?',
      availabilityConfig: { minutePresets: [15, 30, 45, 60, 90], minMinutes: 10, maxMinutes: 240 },
    },
  ],
};

async function run() {
  const { data, error } = await supabase.from('trail_questionnaires').insert({
    version: 1,
    status: 'published',
    questions: mockQuestionnaire.questions
  });
  if (error) {
    console.error("Error inserting:", error);
  } else {
    console.log("Successfully seeded trail_questionnaires");
  }
}

run();
