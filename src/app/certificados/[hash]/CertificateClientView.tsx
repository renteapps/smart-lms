'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Link as LinkIcon, Check, ShieldCheck, Award } from 'lucide-react';
import { buttonVariants } from '@heroui/react';
import { cn } from '@/lib/utils';

type Props = {
  certificate: {
    id: string;
    studentName: string;
    courseTitle: string;
    courseDurationHours: number;
    issueDate: string;
    validationHash: string;
    instructorNames?: string[];
    coordinatorName?: string;
  };
  platformName: string;
  logoUrl: string;
  isOwner?: boolean;
};

export default function CertificateClientView({
  certificate,
  platformName,
  logoUrl,
  isOwner = false,
}: Props) {
  const [validationUrl, setValidationUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValidationUrl(window.location.href);
  }, []);

  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(validationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkedInShare = () => {
    const issueDateObj = new Date(certificate.issueDate);
    const year = issueDateObj.getFullYear();
    const month = issueDateObj.getMonth() + 1; // 1 to 12
    const baseUrl = 'https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME';
    const name = encodeURIComponent(certificate.courseTitle);
    const org = encodeURIComponent(platformName);
    const certUrl = encodeURIComponent(validationUrl);
    const certId = encodeURIComponent(certificate.validationHash);

    const linkedInUrl = `${baseUrl}&name=${name}&organizationName=${org}&issueYear=${year}&issueMonth=${month}&certUrl=${certUrl}&certId=${certId}`;
    window.open(linkedInUrl, '_blank');
  };

  return (
    <div className="flex flex-col items-center w-full px-3 sm:px-6 lg:px-8 print:p-0 print:m-0">
      {/* Ações (Ocultas na impressão) */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row w-full max-w-4xl items-center justify-between gap-3 print:hidden">
        {isOwner ? (
          <>
            <div className="flex items-center gap-2 self-start sm:self-center text-xs sm:text-sm font-medium text-muted">
              <Award className="size-4 text-accent" />
              <span>Seu Certificado Oficial</span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={handleLinkedInShare}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'bg-[#0077b5] text-white hover:bg-[#006097] border-transparent transition-colors text-xs sm:text-sm',
                )}
              >
                <svg className="mr-1.5 size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                Adicionar ao Perfil
              </button>

              <button
                onClick={handleCopy}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs sm:text-sm')}
              >
                {copied ? <Check className="mr-1.5 size-4 text-success" /> : <LinkIcon className="mr-1.5 size-4" />}
                {copied ? 'Link Copiado!' : 'Copiar Link'}
              </button>

              <button
                onClick={() => window.print()}
                className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'text-xs sm:text-sm')}
              >
                <Printer className="mr-1.5 size-4" aria-hidden="true" />
                Imprimir / Salvar PDF
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 self-start sm:self-center text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <ShieldCheck className="size-4 shrink-0" />
              <span>Autenticidade Verificada</span>
            </div>

            <div className="flex items-center justify-end w-full sm:w-auto">
              <button
                onClick={handleCopy}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs sm:text-sm w-full sm:w-auto')}
              >
                {copied ? <Check className="mr-1.5 size-4 text-success" /> : <LinkIcon className="mr-1.5 size-4" />}
                {copied ? 'Link Copiado!' : 'Copiar Link de Verificação'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Certificado (Visualização e Impressão) */}
      <div className="certificate-container relative w-full max-w-5xl overflow-hidden bg-white text-slate-900 shadow-2xl transition-all print:shadow-none print:w-full print:max-w-none print:h-screen print:rounded-none print:border-none flex items-center justify-center p-4 sm:p-8 md:p-12">
        {/* Bordas decorativas clássicas */}
        <div className="pointer-events-none absolute inset-0 border-[16px] sm:border-[24px] border-[#0f172a] print:border-[20px]" />
        <div className="pointer-events-none absolute inset-[20px] sm:inset-[32px] border-2 border-amber-600 print:inset-[26px]" />
        <div className="pointer-events-none absolute inset-[24px] sm:inset-[36px] border border-amber-600/50 print:inset-[30px]" />

        {/* Textura de fundo suave / Watermark (Opcional) */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-transparent to-transparent" />

        <div className="relative z-10 w-full h-full flex flex-col items-center text-center justify-center bg-white/90 px-6 sm:px-12 py-10 sm:py-16">
          {/* Logo da Plataforma */}
          {logoUrl && (
            <div className="mb-8 relative h-16 sm:h-20 w-40 sm:w-56 grayscale contrast-125 sepia-[.3]">
              <Image
                src={logoUrl}
                alt={platformName}
                fill
                className="object-contain"
                crossOrigin="anonymous"
                priority
              />
            </div>
          )}

          <h1 className="font-serif text-3xl xs:text-4xl sm:text-5xl md:text-6xl text-[#0f172a] mb-2 tracking-[0.2em] uppercase">
            Certificado
          </h1>
          <p className="font-serif text-sm sm:text-base md:text-lg text-amber-700 mb-8 sm:mb-12 tracking-[0.3em] uppercase">
            De Conclusão
          </p>

          <p className="font-serif italic text-base sm:text-lg md:text-xl text-slate-600 mb-4">
            Certificamos, para os devidos fins, que
          </p>

          <div className="w-full mb-8">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#0f172a] pb-2 inline-block max-w-full break-words italic">
              {certificate.studentName}
            </h2>
            <div className="h-[2px] w-3/4 max-w-2xl bg-gradient-to-r from-transparent via-amber-600/50 to-transparent mx-auto mt-2" />
          </div>

          <p className="font-serif text-sm sm:text-base md:text-lg text-slate-700 my-4 max-w-3xl leading-loose text-center">
            concluiu com êxito o curso <strong className="text-[#0f172a] font-bold uppercase">{certificate.courseTitle}</strong>
            {certificate.instructorNames && certificate.instructorNames.length > 0 && (
              <span>
                , ministrado por <strong className="text-[#0f172a] font-bold">{certificate.instructorNames.join(', ')}</strong>
              </span>
            )}
            , com carga horária total de <strong className="text-[#0f172a] font-bold">{certificate.courseDurationHours} hora(s)</strong>.
          </p>

          {/* Assinatura e Data */}
          <div className="mt-12 sm:mt-16 w-full flex flex-col-reverse sm:flex-row justify-between items-center gap-10 sm:gap-4 px-4 sm:px-12 md:px-20">
            <div className="flex flex-col items-center">
              <div className="w-48 sm:w-56 border-b border-[#0f172a] mb-2" />
              <p className="text-sm sm:text-base font-serif font-bold text-[#0f172a]">
                {certificate.coordinatorName || platformName}
              </p>
              <p className="text-[10px] sm:text-xs text-amber-700 uppercase tracking-widest mt-1">Direção / Coordenação</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-48 sm:w-56 border-b border-[#0f172a] mb-2" />
              <p className="text-sm sm:text-base font-serif font-bold text-[#0f172a]">
                {dateFormatter.format(new Date(certificate.issueDate))}
              </p>
              <p className="text-[10px] sm:text-xs text-amber-700 uppercase tracking-widest mt-1">Data de Emissão</p>
            </div>
          </div>

          {/* Rodapé e QR Code */}
          <div className="mt-16 w-full flex flex-col-reverse sm:flex-row justify-between items-end gap-6">
            <div className="text-center sm:text-left">
              <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider mb-1">Código de Autenticidade</p>
              <p className="text-[10px] sm:text-xs font-mono text-slate-500 max-w-full break-all">
                {certificate.validationHash}
              </p>
            </div>

            {validationUrl && (
              <div className="flex flex-col items-center sm:items-end">
                <div className="bg-white p-1 border border-amber-200">
                  <QRCodeSVG value={validationUrl} size={64} className="sm:size-[72px]" level="M" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          nav, header, footer, [role="navigation"] {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      ` }} />
    </div>
  );
}
