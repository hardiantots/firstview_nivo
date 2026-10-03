import Image from 'next/image';
import { ReactNode } from 'react';
import { PageTitle, ActionLink } from '@/components/ui/nivo';
import logo from '@/assets/logo-with-text-horizontal.png';
export default function SetupFrame({
  title,
  description,
  children,
  backHref = '/journey-start',
  backLabel = 'Kembali ke pilihan rencana',
}: {
  title: string;
  description: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="nivo-welcome nivo-setup">
      <section className="nivo-welcome-story">
        <Image src={logo} alt="NIVO" height={40} className="h-10 w-auto mb-12" />
        <PageTitle eyebrow="Rencana pilihanmu" title={title}>
          {description}
        </PageTitle>
        <ActionLink href={backHref} secondary>
          {backLabel}
        </ActionLink>
      </section>
      <div className="nivo-welcome-form">{children}</div>
    </main>
  );
}
