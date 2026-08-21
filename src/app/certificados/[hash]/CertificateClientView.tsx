'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, CheckCircle, Link as LinkIcon, Check } from 'lucide-react';
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
  };
  platformName: string;
  logoUrl: string;
};

export default function CertificateClientView({ certificate, platformName, logoUrl }: Props) {
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
    <div className="flex flex-col items-center px-4 sm:px-6 lg:px-8 print:p-0 print:m-0">
      {/* Ações (Ocultas na impressão) */}
      <div className="mb-8 flex flex-wrap w-full max-w-4xl justify-end gap-3 print:hidden">
        <button
          onClick={handleLinkedInShare}
          className={cn(buttonVariants({ variant: 'outline' }), 'bg-[#0077b5] text-white hover:bg-[#006097] border-transparent')}
        >
          <svg className="mr-2 size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          Adicionar ao Perfil
        </button>

        <button
          onClick={handleCopy}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          {copied ? <Check className="mr-2 size-4 text-success" /> : <LinkIcon className="mr-2 size-4" />}
          {copied ? 'Link Copiado!' : 'Copiar Link'}
        </button>

        <button
          onClick={() => window.print()}
          className={cn(buttonVariants({ variant: 'primary' }))}
        >
          <Printer className="mr-2 size-4" aria-hidden="true" />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Certificado (Visualização e Impressão) */}
      <div className="certificate-container relative w-full max-w-4xl overflow-hidden rounded-lg bg-white text-slate-900 shadow-2xl print:shadow-none print:w-[100%] print:max-w-none print:rounded-none">
        
        {/* Bordas e fundo */}
        <div className="absolute inset-0 border-[12px] border-accent/20" />
        <div className="absolute inset-4 border-[2px] border-accent/40" />
        
        <div className="relative z-10 p-12 sm:p-20 flex flex-col items-center text-center">
          
          {/* Logo da Plataforma */}
          {logoUrl && (
            <div className="mb-10 relative h-16 w-48">
              <Image 
                src={logoUrl} 
                alt={platformName} 
                fill 
                className="object-contain"
                crossOrigin="anonymous"
              />
            </div>
          )}

          <h1 className="font-display text-4xl sm:text-6xl font-black uppercase tracking-widest text-accent mb-4">
            Certificado
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mb-10 tracking-widest uppercase">
            de Conclusão
          </p>

          <p className="text-slate-500 mb-4 text-lg">Certificamos que</p>
          
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 border-b-2 border-accent/30 pb-2 px-10 inline-block">
            {certificate.studentName}
          </h2>

          <p className="text-slate-500 my-6 text-lg max-w-2xl leading-relaxed">
            concluiu com êxito o curso <strong className="text-slate-800 font-semibold">{certificate.courseTitle}</strong>
            {certificate.instructorNames && certificate.instructorNames.length > 0 && (
              <span>
                , ministrado por <strong className="text-slate-800 font-semibold">{certificate.instructorNames.join(', ')}</strong>
              </span>
            )}
            , com carga horária de <strong className="text-slate-800">{certificate.courseDurationHours} hora(s)</strong>.
          </p>

          {/* Assinatura e Data */}
          <div className="mt-16 w-full flex flex-col sm:flex-row justify-between items-center px-10">
            <div className="flex flex-col items-center mb-8 sm:mb-0">
              <div className="w-48 border-b border-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">{platformName}</p>
              <p className="text-xs text-slate-500">Direção / Coordenação</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2 text-success">
                <CheckCircle className="size-5" />
                <span className="font-semibold text-slate-800">{dateFormatter.format(new Date(certificate.issueDate))}</span>
              </div>
              <p className="text-xs text-slate-500">Data de Emissão</p>
            </div>
          </div>

          {/* Rodapé e QR Code */}
          <div className="mt-20 w-full flex flex-col-reverse sm:flex-row justify-between items-end border-t border-slate-200 pt-6">
            <div className="text-left">
              <p className="text-xs text-slate-400 mb-1">Código de Validação:</p>
              <p className="text-xs font-mono text-slate-600 bg-slate-100 p-1 px-2 rounded">
                {certificate.validationHash}
              </p>
            </div>
            
            {validationUrl && (
              <div className="flex flex-col items-end text-right mb-6 sm:mb-0">
                <div className="bg-white p-2 border border-slate-200 rounded-md">
                  <QRCodeSVG value={validationUrl} size={80} level="M" />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 max-w-[150px]">
                  Aponte a câmera para verificar a autenticidade
                </p>
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
