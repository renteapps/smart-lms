import Link from "next/link";
import { PlayCircle } from "lucide-react";

type CourseCardProps = {
  id?: string;
  title: string;
  category: string;
  cover: string;
  progress?: number;
  href?: string;
};

export default function CourseCard({ id, title, category, cover, progress, href }: CourseCardProps) {
  const linkUrl = href || (id ? `/courses/${id}` : "#");

  return (
    <div role="button" className="group relative block w-48 md:w-64 shrink-0 transition-all duration-[var(--duration-md)] ease-[var(--ease-zen)] hover:scale-[1.03] hover:z-10 focus:outline-none">
      <Link href={linkUrl} className="block">
        <div className="flex flex-col bg-card text-card-foreground rounded-[var(--radius-lg)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] overflow-hidden transition-shadow duration-[var(--duration-lg)] ease-[var(--ease-zen)] h-full border border-border/30">
          
          {/* Cover Image Area */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-105"
              style={{ backgroundImage: `url(${cover})` }}
            ></div>
            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-md)] ease-[var(--ease-zen)] bg-background/20 backdrop-blur-sm">
              <PlayCircle className="w-12 h-12 text-primary drop-shadow-md" />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex flex-col p-5 flex-grow">
            <span className="text-primary font-bold text-[10px] md:text-xs uppercase tracking-wider mb-2 block">
              {category}
            </span>
            <h3 className="text-foreground font-bold text-sm md:text-base leading-tight mb-4 flex-grow">
              {title}
            </h3>
            
            {progress !== undefined && (
              <div className="w-full bg-muted h-1.5 mt-auto rounded-full overflow-hidden">
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
