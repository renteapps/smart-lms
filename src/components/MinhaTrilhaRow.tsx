'use client';

import { useEffect, useState } from 'react';
import CarouselRow from './CarouselRow';
import LessonCard from './LessonCard';
import { LearningTrail } from '@/types/trilha';
import Link from 'next/link';
import { readLearningTrail } from '@/lib/trailStorage';

export default function MinhaTrilhaRow() {
  const [trail, setTrail] = useState<LearningTrail | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTrail(readLearningTrail().data));
    return () => cancelAnimationFrame(frame);
  }, []);

  const pendingLessons = trail?.items.filter((item) => item.type === 'lesson' && item.status === 'pending').slice(0, 8) || [];
  if (pendingLessons.length === 0) return null;

  return (
    <div className="relative z-30 mb-8 mt-[-10vh] px-4 md:mt-[-15vh]">
      <div className="mb-4 flex items-center justify-between px-2 md:px-8">
        <div><h2 className="text-xl font-bold text-text md:text-2xl">Minha Trilha</h2><p className="mt-1 text-xs font-medium text-text-mute">Próximos conteúdos da sua agenda personalizada</p></div>
        <Link href="/minha-trilha" className="text-sm font-bold text-primary-active hover:text-primary">Ver agenda</Link>
      </div>
      <CarouselRow>
        {pendingLessons.map((item) => (
          <LessonCard
            key={item.id}
            title={item.title}
            moduleName={item.moduleName}
            duration={`${item.durationMin} min`}
            cover={item.cover || 'https://images.unsplash.com/photo-1573497491765-0a15320e8b2b?q=80&w=600&auto=format&fit=crop'}
            reason={item.reason}
            href={`/courses/${item.courseId || 'c1'}/lessons/${item.id}`}
          />
        ))}
      </CarouselRow>
    </div>
  );
}
