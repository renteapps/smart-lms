import HeroCarousel from "@/components/HeroCarousel";
import CarouselRow from "@/components/CarouselRow";
import CourseCard from "@/components/CourseCard";
import LessonCard from "@/components/LessonCard";
import DailyPill from "@/components/DailyPill";
import CtaBand from "@/components/CtaBand";
import MinhaTrilhaRow from "@/components/MinhaTrilhaRow";
import { HomeBlogSection } from "@/components/blog/HomeBlogSection";
import { getAllArticles } from "@/lib/blog";

const mockCourses = [
  {
    id: "c1",
    title: "React de Zero a Mestre",
    category: "Programação",
    cover: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=600&auto=format&fit=crop",
    progress: 45
  },
  {
    id: "c2",
    title: "Gestão de Tempo e Foco",
    category: "Produtividade",
    cover: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "c3",
    title: "Liderança por Influência",
    category: "Liderança",
    cover: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "c4",
    title: "Feedback que Transforma",
    category: "Comunicação",
    cover: "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "c5",
    title: "Negociação Ganha-Ganha",
    category: "Habilidades",
    cover: "https://images.unsplash.com/photo-1556761175-5973dc0f32b7?q=80&w=600&auto=format&fit=crop",
  }
];

const mockLessons = [
  {
    id: "l1",
    title: "Bem-vindo ao Curso!",
    moduleName: "Módulo 1",
    duration: "5m",
    cover: "https://images.unsplash.com/photo-1573497491765-0a15320e8b2b?q=80&w=600&auto=format&fit=crop",
    progress: 100
  },
  {
    id: "l2",
    title: "O que é React?",
    moduleName: "Módulo 1",
    duration: "12m",
    cover: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=600&auto=format&fit=crop",
    progress: 40
  },
  {
    id: "l3",
    title: "Criando seu primeiro componente",
    moduleName: "Módulo 2",
    duration: "15m",
    cover: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "l4",
    title: "Entendendo useState",
    moduleName: "Módulo 2",
    duration: "20m",
    cover: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=600&auto=format&fit=crop",
  }
];

export default function Home() {
  const articles = getAllArticles();

  return (
    <div className="pb-8">
      <HeroCarousel />
      

      <div className="mt-[-10vh] md:mt-[-15vh] relative z-20">
        <DailyPill />
        <CarouselRow title="Continuar Assistindo (Aulas)">
          {mockLessons.filter(l => l.progress).map((lesson) => (
            <LessonCard key={lesson.id} {...lesson} />
          ))}
        </CarouselRow>
      </div>

      <MinhaTrilhaRow />

      <CarouselRow title="Cursos em Destaque">
        {mockCourses.slice().reverse().map((course) => (
          <CourseCard key={course.id} {...course} />
        ))}
      </CarouselRow>
      
      <CarouselRow title="Aulas Recentes (Comunicação)">
        {mockLessons.map((lesson) => (
          <LessonCard key={lesson.id} {...lesson} />
        ))}
      </CarouselRow>

      <CarouselRow title="Trilha Liderança">
        {mockCourses.map((course) => (
          <CourseCard key={course.id} {...course} />
        ))}
      </CarouselRow>

      <CtaBand />

      <HomeBlogSection articles={articles} />

      <CarouselRow title="Novidades">
        {mockCourses.slice(0, 3).map((course) => (
          <CourseCard key={course.id} {...course} />
        ))}
      </CarouselRow>
    </div>
  );
}
