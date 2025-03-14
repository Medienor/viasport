"use client"

import { useEffect, useState } from 'react';
import Head from 'next/head';

interface SEOProps {
  title?: string;
  description?: string;
  sport?: string;
}

const SEO = ({ title, description, sport }: SEOProps) => {
  const [currentDate, setCurrentDate] = useState<string>('');
  
  useEffect(() => {
    // Get current month and year in Norwegian
    const date = new Date();
    const month = date.toLocaleString('nb-NO', { month: 'long' });
    const year = date.getFullYear();
    setCurrentDate(`${month} ${year}`);
  }, []);
  
  // Default title if no sport is provided
  const defaultTitle = 'ViaSport - Sportsendinger på TV og streaming';
  
  // Generate sport-specific title
  const sportTitle = sport 
    ? `${sport} på TV stream - Kanal, TV-tider (${currentDate})`
    : defaultTitle;
    
  // Use provided title or generate one
  const pageTitle = title || sportTitle;
  
  // Default description
  const defaultDescription = 'Finn ut når og hvor du kan se sport på TV og streaming. Kampoppsett, kanaler og tidspunkter for direktesendinger.';
  
  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
    </Head>
  );
};

export default SEO; 