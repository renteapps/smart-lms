import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CtaBand() {
  return (
    <section className="py-16 px-4 md:px-12 my-12">
      <div className="max-w-6xl mx-auto bg-primary/5 rounded-[var(--radius-xl)] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 border border-primary/10 shadow-sm transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] hover:shadow-md">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-display font-extrabold mb-4 text-primary">
            Pronto para evoluir suas habilidades?
          </h2>
          <p className="text-muted-foreground text-lg">
            Junte-se à comunidade e tenha acesso imediato a todos os cursos, materiais de apoio e comunidade exclusiva.
          </p>
        </div>
        <Button render={<Link href="#" />} nativeButton={false} size="lg" className="rounded-full font-bold text-lg px-10 py-6 hover:scale-105 transition-transform duration-[var(--duration-md)] shadow-sm">
          Comece Agora
        </Button>
      </div>
    </section>
  );
}
