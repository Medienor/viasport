import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fotball kamper på TV i dag | ViaSport',
  description: 'Se alle fotballkamper som spilles i dag på TV og strømmetjenester. Komplett oversikt over kamptider, kanaler og hvor du kan se kampene.',
  openGraph: {
    title: 'Fotball kamper på TV i dag | ViaSport',
    description: 'Se alle fotballkamper som spilles i dag på TV og strømmetjenester.',
    url: 'https://viasport.no/fotball/i-dag',
    siteName: 'ViaSport',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fotball kamper på TV i dag | ViaSport',
    description: 'Se alle fotballkamper som spilles i dag på TV og strømmetjenester.',
  },
};

export default function IDagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 