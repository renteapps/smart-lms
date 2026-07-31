export type PilulaStatus = 'Ativa' | 'Programada' | 'Rascunho' | 'Arquivada';

export type PilulaCategory =
  | 'Liderança'
  | 'Produtividade'
  | 'Comunicação'
  | 'Bem-estar'
  | 'Vendas'
  | 'Inovação'
  | 'Geral';

export type PilulaFormat = 'texto' | 'video' | 'audio' | 'desafio';

export interface Pilula {
  id: string;
  title: string;
  category: PilulaCategory | string;
  format: PilulaFormat;
  summary: string;
  challenge: string;
  estimatedMinutes: number;
  mediaUrl?: string;
  courseTitle?: string;
  publishDate?: string;
  status: PilulaStatus;
  completionsCount: number;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
}
