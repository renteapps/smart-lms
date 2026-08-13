import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Ícones desenhados à mão para os momentos de destaque da área do aluno.
 *
 * Cada traço carrega `pathLength="1"` e `data-draw`, o que permite à classe
 * utilitária `.icon-draw` animar o desenho no hover de forma consistente —
 * independente do comprimento real do path. Ícones de uso corrente continuam
 * vindo do lucide-react; estes são para navegação, estados vazios e cabeçalhos
 * de seção, onde a microinteração tem função e não vira ruído.
 *
 * Uso:
 *   <span className="icon-draw"><TrailIcon /></span>
 */

type AnimatedIconProps = SVGProps<SVGSVGElement> & {
  /** Tamanho em px. Padrão 24. */
  size?: number;
};

function IconBase({ size = 24, className, children, ...props }: AnimatedIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      fill="none"
      height={size}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Trilha de aprendizagem — caminho com marcos. */
export function TrailIcon(props: AnimatedIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5 19c0-3 3-3 6-3s6 0 6-3-3-3-6-3-6 0-6-3"
        data-draw
        pathLength="1"
        stroke="currentColor"
      />
      <circle cx="5" cy="19" data-draw pathLength="1" r="2" stroke="currentColor" />
      <circle cx="19" cy="5" data-draw pathLength="1" r="2" stroke="currentColor" />
    </IconBase>
  );
}

/** Curso / conteúdo. */
export function CourseIcon(props: AnimatedIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5z"
        data-draw
        pathLength="1"
        stroke="currentColor"
      />
      <path d="M9 8.5h6" data-draw pathLength="1" stroke="currentColor" />
      <path d="M9 12h4" data-draw pathLength="1" stroke="currentColor" />
    </IconBase>
  );
}

/** Aula concluída. */
export function CompleteIcon(props: AnimatedIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" data-draw pathLength="1" r="8.5" stroke="currentColor" />
      <path d="m8.5 12 2.5 2.5 4.5-5" data-draw pathLength="1" stroke="currentColor" />
    </IconBase>
  );
}

/** Continuar assistindo. */
export function PlayIcon(props: AnimatedIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" data-draw pathLength="1" r="8.5" stroke="currentColor" />
      <path d="M10.5 9.2v5.6L15 12z" data-draw pathLength="1" stroke="currentColor" />
    </IconBase>
  );
}

/** Insight / pílula do dia. */
export function SparkIcon(props: AnimatedIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 3.5 13.7 9l5.3 1.7-5.3 1.7L12 18l-1.7-5.6L5 10.7 10.3 9z"
        data-draw
        pathLength="1"
        stroke="currentColor"
      />
      <path d="M18.5 16.5v3.5" data-draw pathLength="1" stroke="currentColor" />
      <path d="M16.75 18.25h3.5" data-draw pathLength="1" stroke="currentColor" />
    </IconBase>
  );
}

/** Anotações. */
export function NoteIcon(props: AnimatedIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5 4.5h9.5L19 9v10.5H5z"
        data-draw
        pathLength="1"
        stroke="currentColor"
      />
      <path d="M14.5 4.5V9H19" data-draw pathLength="1" stroke="currentColor" />
      <path d="M8.5 13h7" data-draw pathLength="1" stroke="currentColor" />
      <path d="M8.5 16h4.5" data-draw pathLength="1" stroke="currentColor" />
    </IconBase>
  );
}

/** Progresso / evolução. */
export function ProgressIcon(props: AnimatedIconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 19h16" data-draw pathLength="1" stroke="currentColor" />
      <path d="M7 19v-5" data-draw pathLength="1" stroke="currentColor" />
      <path d="M12 19V9" data-draw pathLength="1" stroke="currentColor" />
      <path d="M17 19V5" data-draw pathLength="1" stroke="currentColor" />
    </IconBase>
  );
}

/** Seguir adiante. */
export function ArrowIcon(props: AnimatedIconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 12h15" data-draw pathLength="1" stroke="currentColor" />
      <path d="m13.5 6 6 6-6 6" data-draw pathLength="1" stroke="currentColor" />
    </IconBase>
  );
}
