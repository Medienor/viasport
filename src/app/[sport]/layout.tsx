"use client"

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function SportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams();
  const sport = typeof params.sport === 'string' ? params.sport : '';
  const [pageTitle, setPageTitle] = useState('ViaSport - Sportsendinger på TV og streaming');
  
  // Capitalize first letter of sport name
  const formattedSport = sport.charAt(0).toUpperCase() + sport.slice(1);
  
  useEffect(() => {
    // Get current month and year in Norwegian
    const date = new Date();
    const month = date.toLocaleString('nb-NO', { month: 'long' });
    const year = date.getFullYear();
    const currentDate = `${month} ${year}`;
    
    // Set the document title directly
    const title = `${formattedSport} på TV stream - Kanal, TV-tider (${currentDate})`;
    document.title = title;
    setPageTitle(title);
  }, [formattedSport]);
  
  const description = `Finn ut når og hvor du kan se ${formattedSport.toLowerCase()} på TV og streaming. Kampoppsett, kanaler og tidspunkter for direktesendinger.`;
  
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
      </Head>
      <main>
        {children}
      </main>
    </>
  );
} 