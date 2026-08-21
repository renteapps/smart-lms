import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCertificateByHash } from '@/lib/data/certificates';
import CertificateClientView from './CertificateClientView';

export async function generateMetadata({ params }: { params: Promise<{ hash: string }> }): Promise<Metadata> {
  const { hash } = await params;
  const supabase = await createClient();
  const certificate = await getCertificateByHash(supabase, hash);

  if (!certificate) {
    return {
      title: 'Certificado Inválido | Smart LMS',
    };
  }

  const title = `Certificado: ${certificate.courseTitle} - ${certificate.studentName}`;
  const description = `Verifique a autenticidade do certificado de ${certificate.studentName} no curso ${certificate.courseTitle} (${certificate.courseDurationHours}h).`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    }
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const supabase = await createClient();

  const certificate = await getCertificateByHash(supabase, hash);

  if (!certificate) {
    notFound();
  }

  // Get appearance settings
  const { data: appearanceData } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'appearance')
    .single();

  const platformName = appearanceData?.value?.platformName || 'Smart LMS';
  const logoUrl = appearanceData?.value?.logoUrl || '';

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <CertificateClientView
        certificate={certificate}
        platformName={platformName}
        logoUrl={logoUrl}
      />
    </div>
  );
}
