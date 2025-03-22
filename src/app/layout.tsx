import './globals.css';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import Providers from './providers'
import ScrollToTop from './components/ScrollToTop';
import ApiMonitor from './components/ApiMonitor';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Initialize the Inter font with the subsets you need
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "ViaSport - Forball på TV & Streaming",
  description: "Din ultimate destinasjon for sportskalendere og kampinformasjon",
};

// Add debugging log
console.log("Layout module is being evaluated");

// Flag to control verbose logging
const VERBOSE_LOGGING = false;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Only log if verbose logging is enabled
  if (VERBOSE_LOGGING) {
    console.log('RootLayout is rendering');
  }
  
  try {
    return (
      <html lang="nb" className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased flex flex-col min-h-screen`}>
        <head>
          {/* Move scripts outside of head */}
        </head>
        <body className="font-sans">
          {/* Google Analytics */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-Z17J77B571"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-Z17J77B571');
            `}
          </Script>

          {/* Google AdSense Script */}
          <Script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9301570336732312"
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />

          <Providers>
            <ScrollToTop />
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
            {process.env.NODE_ENV === 'development' && <ApiMonitor />}
          </Providers>
        </body>
      </html>
    );
  } catch (error) {
    console.error("Error in RootLayout:", error);
    return (
      <html lang="nb">
        <body>
          <div>Error in layout: {error instanceof Error ? error.message : String(error)}</div>
        </body>
      </html>
    );
  }
}