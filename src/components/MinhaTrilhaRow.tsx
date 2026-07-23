'use client';

import { useEffect, useState } from 'react';
import CarouselRow from './CarouselRow';
import LessonCard from './LessonCard';
import { LearningTrail } from '@/types/trilha';
import { mockEligibleLessons } from '@/lib/mocks/trilhaMocks';
import Link from 'next/link';

export default function MinhaTrilhaRow() {
  const [trail, setTrail] = useState<LearningTrail | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('minha_trilha');
    if (saved) {
      try {
        setTrail(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  if (!trail || trail.items.length === 0) {
    return null;
  }

  return (
    <div className="relative z-30 mb-8 mt-[-10vh] px-4 md:mt-[-15vh]">
      <div className="mb-4 flex items-center justify-between px-2 md:px-8">
        <h2 className="text-xl font-bold text-text md:text-2xl">Minha Trilha</h2>
        <Link href="/onboarding" className="text-sm font-medium text-text-mute hover:text-text-soft transition-colors duration-[var(--duration-md)] ease-[var(--ease-zen)]">
          Refazer Trilha
        </Link>
      </div>
      <CarouselRow>
        {trail.items.map((item) => {
          const lesson = mockEligibleLessons.find(l => l.lessonId === item.lessonId);
          if (!lesson) return null;
          return (
            <LessonCard
              key={item.lessonId}
              title={lesson.title}
              moduleName={lesson.courseSlug}
              duration={`${Math.round(lesson.duration / 60)}m`}
              cover="https://images.unsplash.com/photo-1573497491765-0a15320e8b2b?q=80&w=600&auto=format&fit=crop"
              locked={item.locked}
              reason={item.reason}
              href="/courses/c1/lessons/l1"
            />
          );
        })}
      </CarouselRow>
    </div>
  );
}
