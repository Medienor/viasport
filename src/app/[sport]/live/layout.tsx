import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    absolute: 'Direktesendte fotballkamper som går nå på TV & Stream | ViaSport.no',
  },
  description: 'Se alle direktesendte fotballkamper som spilles akkurat nå. Følg kampene live med oppdaterte resultater og statistikk.',
  openGraph: {
    title: 'Direktesendte fotballkamper som går nå på TV & Stream | ViaSport.no',
    description: 'Se alle direktesendte fotballkamper som spilles akkurat nå. Følg kampene live med oppdaterte resultater og statistikk.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 