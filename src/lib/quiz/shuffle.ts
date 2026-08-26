/**
 * Embaralhamento determinístico por seed — usado pra variar a ordem das
 * perguntas/alternativas a cada tentativa de quiz, mas mantendo a MESMA ordem
 * se a página recarregar no meio de uma tentativa em andamento (o seed é
 * salvo no rascunho). Sem seed fixo, cada reload sortearia uma ordem nova e
 * "retomar da pergunta 3" apontaria pra uma pergunta diferente da que o aluno
 * via antes de recarregar.
 */

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffledWithSeed<T>(items: T[], seed: number): T[] {
  const random = mulberry32(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Hash simples e estável de string -> número, pra derivar um seed por pergunta a partir de um seed geral da tentativa. */
export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
}

/** Novo seed aleatório — gerado uma vez ao iniciar/refazer uma tentativa. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
