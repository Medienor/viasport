import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { sport: string } }): Promise<Metadata> {
  // Return empty object to let child pages handle their own metadata
  return {};
}

export default function SportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
} 