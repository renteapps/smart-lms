import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Award, BookOpen, CalendarDays, Download, ShieldCheck } from 'lucide-react';
import { buttonVariants, Card, Chip, EmptyState } from '@heroui/react';
import { Rise } from '@/components/ui/Rise';
import { getSessionUser } from '@/lib/supabase/auth';
import { getStudentCertificates } from '@/lib/data/certificates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Certificados | Smart LMS',
  description: 'Consulte os certificados emitidos para os cursos que você concluiu.',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export default async function CertificadosPage({
  searchParams,
}: {
  searchParams: Promise<{ curso?: string }>;
}) {
  const { curso } = await searchParams;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/acessar?redirect=/certificados');

  const certificates = await getStudentCertificates(supabase, user.id);

  return (
    <div className="pt-[76px]">
      <section className="border-b border-hairline">
        <div className="editorial-container py-14 sm:py-20">
          <Rise>
            <p className="eyebrow">Suas conquistas</p>
            <h1 className="display-1 mt-3 text-foreground">Certificados</h1>
            <p className="lede mt-5 max-w-2xl">
              Consulte os certificados dos cursos finalizados e baixe o PDF quando ele estiver disponível.
            </p>
          </Rise>
        </div>
      </section>

      <main className="editorial-container py-10 sm:py-14">
        {certificates.length === 0 ? (
          <EmptyState className="gap-5 py-24">
            <span className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
              <Award className="size-8" aria-hidden="true" />
            </span>
            <div className="text-center">
              <p className="display-3 text-foreground">Seu próximo certificado começa agora</p>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
                Quando você concluir um curso com certificação habilitada, ele aparecerá automaticamente aqui.
              </p>
            </div>
            <Link href="/cursos" className={buttonVariants({ variant: 'primary' })}>
              <BookOpen className="size-4" aria-hidden="true" />
              Explorar cursos
            </Link>
          </EmptyState>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {certificates.map((certificate, index) => {
              const selected = certificate.courseId === curso;
              return (
                <Rise key={certificate.id} delay={Math.min(index, 5) * 60} className="h-full">
                  <Card
                    id={`certificado-${certificate.courseId}`}
                    className={cn(
                      'h-full gap-0 overflow-hidden p-0 scroll-mt-28',
                      selected && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
                    )}
                  >
                    <div className="relative aspect-[16/7] overflow-hidden bg-foreground">
                      {certificate.courseCover && (
                        <Image
                          src={certificate.courseCover}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover opacity-35"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/85 to-foreground/50" />
                      <div className="relative flex h-full items-center justify-between gap-4 p-5 text-background">
                        <Award className="size-10" aria-hidden="true" />
                        <ShieldCheck className="size-6 text-success" aria-hidden="true" />
                      </div>
                    </div>

                    <Card.Header className="gap-2 px-5 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="eyebrow text-accent">{certificate.courseCategory}</p>
                        {selected && <Chip size="sm" color="accent" variant="soft">Selecionado</Chip>}
                      </div>
                      <Card.Title className="font-display text-lg font-extrabold leading-snug text-foreground">
                        {certificate.courseTitle}
                      </Card.Title>
                    </Card.Header>

                    <Card.Content className="gap-3 px-5 py-5 text-sm text-muted">
                      <p className="flex items-center gap-2">
                        <CalendarDays className="size-4" aria-hidden="true" />
                        Emitido em {dateFormatter.format(new Date(certificate.issueDate))}
                      </p>
                      <p className="break-all font-mono text-xs" data-numeric>
                        Código: {certificate.validationHash}
                      </p>
                    </Card.Content>

                    <Card.Footer className="mt-auto border-t border-hairline px-5 py-4">
                      {certificate.pdfUrl ? (
                        <a
                          href={certificate.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'w-full')}
                        >
                          <Download className="size-4" aria-hidden="true" />
                          Baixar certificado
                        </a>
                      ) : (
                        <p className="text-xs leading-5 text-muted">
                          Certificado emitido. O PDF ficará disponível aqui assim que o processamento terminar.
                        </p>
                      )}
                    </Card.Footer>
                  </Card>
                </Rise>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
