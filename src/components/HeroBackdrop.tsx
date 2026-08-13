import Image from "next/image";

type HeroBackdropProps = {
  /** Capa da aula em andamento. Entra como atmosfera, nunca como informação. */
  src: string;
};

/**
 * Fundo do herói da home.
 *
 * A capa da aula que o aluno está assistindo agora aparece atrás do título,
 * borrada até virar só cor e luz. A intenção não é mostrar a foto — é fazer a
 * primeira tela mudar junto com a jornada de quem entrou. Por isso a arte
 * sobrevive apenas como mancha: o contraste do texto continua sendo o do fundo
 * do tema, não o da imagem.
 *
 * Começa em `top-0`, atrás da barra fixa: é essa mancha que dá ao vidro do
 * header algo para refratar.
 */
export default function HeroBackdrop({ src }: HeroBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(44rem,92vh)] overflow-hidden"
    >
      {/*
       * A imagem estoura o quadro em 160px de cada lado — mais que o dobro do
       * raio do blur. O `blur()` do CSS desbota a borda do próprio elemento,
       * então o que chega ao recorte precisa vir do meio da mancha, nunca da
       * quina dela.
       */}
      <div className="absolute -inset-40">
        <Image
          src={src}
          alt=""
          fill
          /* Acima da dobra: carrega junto com a página, mas sem disputar prioridade com a capa da aula. */
          loading="eager"
          /* Vira borrão: pedir mais que isso é pagar banda por pixel que o blur apaga. */
          sizes="640px"
          /*
           * No escuro a mesma foto clara viraria um facho atrás do menu. O
           * brilho cai antes do véu para a mancha continuar sendo cor, e não luz.
           */
          className="object-cover blur-[72px] saturate-[1.7] dark:brightness-[0.5]"
        />
      </div>

      {/*
       * Véu vertical do tema. Segura o contraste de leitura no topo e dissolve
       * a mancha no fundo da página — ela termina sem linha de corte.
       */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/18 via-background/55 to-background" />

      {/* O lado do texto fica mais calmo que o resto do quadro. */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/45 via-background/5 to-transparent" />
    </div>
  );
}
