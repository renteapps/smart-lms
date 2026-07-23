import { NextResponse } from 'next/server';
import { mockQuestionnaire } from '@/lib/mocks/trilhaMocks';

export async function POST(request: Request) {
  try {
    // Na implementação real, aqui leríamos as aulas enviadas no body
    // const { pool } = await request.json();
    
    // Simulação de latência de IA (2s)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Retornamos um rascunho baseado no mock
    return NextResponse.json({
      ...mockQuestionnaire,
      status: 'draft',
      version: Math.floor(Math.random() * 100) + 2,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao gerar questionário' }, { status: 500 });
  }
}
