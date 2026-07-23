import Link from "next/link";
import { PlayCircle } from "lucide-react";

type LessonCardProps = {
  id?: string;
  title: string;
  moduleName?: string;
  cover: string;
  duration: string;
  progress?: number;
  locked?: boolean;
  reason?: string;
  href?: string;
  className?: string; // allow parent to set width (e.g. w-full for grids, w-72 for carousels)
};

export default function LessonCard({ id, title, moduleName, cover, duration, progress, locked, reason, href, className }: LessonCardProps) {
  const linkUrl = locked ? "https://hotmart.com" : (href || (id ? `/courses/c1/lessons/${id}` : "#"));
  
  return (
    <div role="button" className={`group relative block shrink-0 transition-all duration-[var(--duration-md)] ease-[var(--ease-zen)] focus:outline-none ${locked ? '' : 'hover:scale-[1.03] hover:z-10'} ${className || 'w-72 md:w-80'}`}>
      {reason && (
        <div className="absolute -top-3 left-4 z-30 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground shadow-md">
          {reason}
        </div>
      )}
      <Link href={linkUrl} className="block" target={locked ? "_blank" : undefined}>
        <div className="flex flex-col bg-card text-card-foreground rounded-[var(--radius-lg)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] overflow-hidden transition-shadow duration-[var(--duration-lg)] ease-[var(--ease-zen)] h-full border border-border/30">
          
          {/* Cover Image Area */}
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <div 
              className={`absolute inset-0 bg-cover bg-center transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-105 ${locked ? 'grayscale opacity-60' : ''}`}
              style={{ backgroundImage: `url(${cover})` }}
            ></div>
            
            {!locked && (
              <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-md)] ease-[var(--ease-zen)] bg-background/20 backdrop-blur-sm">
                <PlayCircle className="w-12 h-12 text-primary drop-shadow-md" />
              </div>
            )}

            {locked && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-md)] ease-[var(--ease-zen)] bg-background/80 backdrop-blur-sm">
                <div className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                  Liberar Curso
                </div>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex flex-col p-4 flex-grow">
            {moduleName && (
              <span className="text-primary font-bold text-[10px] uppercase tracking-wider mb-1 block">
                {moduleName}
              </span>
            )}
            <h3 className="text-foreground font-semibold text-sm leading-tight line-clamp-2 flex-grow">
              {title}
            </h3>
            
            <div className="flex items-center gap-2 mt-2 text-muted-foreground text-xs font-medium">
              <span>{duration}</span>
            </div>
            
            {progress !== undefined && (
              <div className="w-full bg-muted h-1.5 mt-3 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-[var(--duration-lg)] ease-[var(--ease-zen)]" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
