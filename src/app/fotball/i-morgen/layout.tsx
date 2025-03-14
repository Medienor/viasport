import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fotball kamper på TV i morgen | ViaSport',
  description: 'Se alle fotballkamper som spilles i morgen på TV og strømmetjenester. Komplett oversikt over kamptider, kanaler og hvor du kan se kampene.',
  openGraph: {
    title: 'Fotball kamper på TV i morgen | ViaSport',
    description: 'Se alle fotballkamper som spilles i morgen på TV og strømmetjenester.',
    url: 'https://viasport.no/fotball/i-morgen',
    siteName: 'ViaSport',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fotball kamper på TV i morgen | ViaSport',
    description: 'Se alle fotballkamper som spilles i morgen på TV og strømmetjenester.',
  },
};

export default function IMorgenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 