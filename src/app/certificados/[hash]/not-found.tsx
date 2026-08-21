import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { buttonVariants } from '@heroui/react';
import { cn } from '@/lib/utils';

export default function CertificateNotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-background px-4 text-center">
      <span className="grid size-20 place-items-center rounded-3xl bg-danger/10 text-danger mb-6">
        <ShieldAlert className="size-10" />
      </span>
      <h1 className="font-display text-3xl font-bold text-foreground">Certificado Inválido ou Não Encontrado</h1>
      <p className="mt-4 max-w-md text-muted text-lg">
        Não conseguimos validar a autenticidade deste certificado. O código pode estar incorreto, expirado ou o certificado foi revogado.
      </p>
      <div className="mt-8">
        <Link href="/" className={cn(buttonVariants({ variant: 'primary' }))}>
          <ArrowLeft className="mr-2 size-4" />
          Voltar para o Início
        </Link>
      </div>
    </div>
  );
}
