const SEOConfig = {
  titleTemplate: '%s | ViaSport',
  defaultTitle: 'ViaSport - Din sportsdestinasjon',
  description: 'Din ultimate destinasjon for sportskalendere, kampinformasjon og lagstatistikk i Norge.',
  canonical: 'https://www.viasport.no',
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    url: 'https://www.viasport.no',
    siteName: 'ViaSport',
    title: 'ViaSport - Din sportsdestinasjon',
    description: 'Din ultimate destinasjon for sportskalendere, kampinformasjon og lagstatistikk i Norge.',
    images: [
      {
        url: 'https://www.viasport.no/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ViaSport',
      },
    ],
  },
  twitter: {
    handle: '@viasport',
    site: '@viasport',
    cardType: 'summary_large_image',
  },
  additionalMetaTags: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1',
    },
    {
      name: 'keywords',
      content: 'sport, fotball, håndball, kamper, tabeller, norge, sportsresultater',
    },
  ],
};

export default SEOConfig; 