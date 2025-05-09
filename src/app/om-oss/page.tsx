import Link from 'next/link';
import Image from 'next/image';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';
import ClientHead from './ClientHead';

// Set revalidation time - about page doesn't change often
export const revalidate = 86400; // Revalidate once per day (24 hours)

export default function AboutUsPage() {
  return (
    <>
      {/* Client component for document title */}
      <ClientHead title="Om oss - ViaSport" />
      
      {/* Hero section - using bg2-img.jpg */}
      <div className="relative bg-blue-700 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/bg2-img.jpg"
            alt="Football stadium"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-blue-900/70 mix-blend-multiply"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Om ViaSport
          </h1>
          <p className="mt-6 text-xl max-w-3xl">
            Din komplette guide til fotballkamper på TV og strømmetjenester
          </p>
        </div>
      </div>

      {/* Main content - Added dark mode background */}
      <div className="bg-gray-50 dark:bg-dark-main py-16"> 
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Content card - Added dark mode background and base text color */}
          <div className="bg-white dark:bg-[#181818] dark:text-gray-300 shadow rounded-lg overflow-hidden"> 
            {/* Our mission - Adjusted dark mode styles */}
            <div className="p-8 border-b border-gray-200 dark:border-dark-border"> 
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Vår misjon</h2>
              {/* Adjusted dark mode text color */}
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4"> 
                ViaSport ble grunnlagt med ett enkelt mål: å gjøre det lettere for fotballfans å finne ut når og hvor de kan se sine favorittlag spille.
              </p>
              {/* Adjusted dark mode text color */}
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4"> 
                I en tid med stadig flere TV-kanaler og strømmetjenester kan det være vanskelig å holde oversikt over hvor kampene sendes. 
                Vi samler all denne informasjonen på ett sted, slik at du aldri går glipp av en kamp igjen.
              </p>
              {/* Adjusted dark mode text color */}
              <p className="text-lg text-gray-700 dark:text-gray-300"> 
                Vår tjeneste dekker alle store ligaer og turneringer, inkludert Eliteserien, Premier League, La Liga, Serie A, Bundesliga, 
                Champions League, Europa League og internasjonale mesterskap.
              </p>
            </div>

            {/* What we offer - Adjusted dark mode styles */}
            <div className="p-8 border-b border-gray-200 dark:border-dark-border"> 
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Hva vi tilbyr</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Feature Card 1 - Adjusted dark mode styles */}
                <div className="bg-gray-50 dark:bg-[#222222] p-6 rounded-lg"> 
                  {/* Adjusted dark mode icon background and color */}
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4"> 
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> 
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  {/* Adjusted dark mode text colors */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">TV-guide for fotball</h3> 
                  <p className="text-gray-700 dark:text-gray-400"> 
                    Komplett oversikt over hvilke kanaler og strømmetjenester som sender kampene du vil se.
                  </p>
                </div>
                
                {/* Feature Card 2 - Adjusted dark mode styles */}
                <div className="bg-gray-50 dark:bg-[#222222] p-6 rounded-lg"> 
                  {/* Adjusted dark mode icon background and color */}
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4"> 
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> 
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  {/* Adjusted dark mode text colors */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Kampprogram</h3> 
                  <p className="text-gray-700 dark:text-gray-400"> 
                    Oppdaterte kampprogrammer for alle ligaer og turneringer, med avsparktider og sendeinformasjon.
                  </p>
                </div>
                
                {/* Feature Card 3 - Adjusted dark mode styles */}
                <div className="bg-gray-50 dark:bg-[#222222] p-6 rounded-lg"> 
                  {/* Adjusted dark mode icon background and color */}
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4"> 
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> 
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  {/* Adjusted dark mode text colors */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Ligatabeller</h3> 
                  <p className="text-gray-700 dark:text-gray-400"> 
                    Oppdaterte tabeller for alle ligaer, med poeng, målforskjell og plassering.
                  </p>
                </div>
                
                {/* Feature Card 4 - Adjusted dark mode styles */}
                <div className="bg-gray-50 dark:bg-[#222222] p-6 rounded-lg"> 
                  {/* Adjusted dark mode icon background and color */}
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4"> 
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> 
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  {/* Adjusted dark mode text colors */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Kampvarsler</h3> 
                  <p className="text-gray-700 dark:text-gray-400"> 
                    Få varsler før kampene til dine favorittlag starter, så du aldri går glipp av en kamp.
                  </p>
                </div>
                
                {/* Feature Card 5 - Adjusted dark mode styles */}
                <div className="bg-gray-50 dark:bg-[#222222] p-6 rounded-lg"> 
                  {/* Adjusted dark mode icon background and color */}
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4"> 
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> 
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {/* Adjusted dark mode text colors */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Søkefunksjon</h3> 
                  <p className="text-gray-700 dark:text-gray-400"> 
                    Finn raskt informasjon om dine favorittlag, turneringer eller spesifikke kamper.
                  </p>
                </div>
                
                {/* Feature Card 6 - Adjusted dark mode styles */}
                <div className="bg-gray-50 dark:bg-[#222222] p-6 rounded-lg"> 
                  {/* Adjusted dark mode icon background and color */}
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4"> 
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> 
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  {/* Adjusted dark mode text colors */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Mobiloptimalisert</h3> 
                  <p className="text-gray-700 dark:text-gray-400"> 
                    Vår nettside er optimalisert for alle enheter, slik at du kan sjekke kampinformasjon hvor som helst.
                  </p>
                </div>
              </div>
            </div>

            {/* Our team - Adjusted dark mode styles and replaced names/roles */}
            <div className="p-8 border-b border-gray-200 dark:border-dark-border"> 
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Vårt team</h2>
              {/* Adjusted dark mode text color */}
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-8"> 
                ViaSport drives av et dedikert team av lidenskapelige fotballfans og teknologieksperter, som jobber for å gi deg den beste og mest nøyaktige tjenesten.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Team Card 1 - Adjusted dark mode styles and role */}
                <div className="bg-gray-50 dark:bg-[#222222] p-6 rounded-lg text-center"> 
                  {/* Adjusted dark mode icon background and color */}
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4"> 
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> 
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  {/* Adjusted dark mode text colors and role */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ledelse & Strategi</h3> 
                  <p className="text-gray-600 dark:text-gray-400">Sikrer visjon og retning</p> 
                </div>
                
                {/* Team Card 2 - Adjusted dark mode styles and role */}
                <div className="bg-gray-50 dark:bg-[#222222] p-6 rounded-lg text-center"> 
                  {/* Adjusted dark mode icon background and color */}
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4"> 
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> 
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  {/* Adjusted dark mode text colors and role */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Teknologi & Utvikling</h3> 
                  <p className="text-gray-600 dark:text-gray-400">Bygger og vedlikeholder plattformen</p> 
                </div>
                
                {/* Team Card 3 - Adjusted dark mode styles and role */}
                <div className="bg-gray-50 dark:bg-[#222222] p-6 rounded-lg text-center"> 
                  {/* Adjusted dark mode icon background and color */}
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4"> 
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> 
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                  {/* Adjusted dark mode text colors and role */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Data & Innholdskvalitet</h3> 
                  <p className="text-gray-600 dark:text-gray-400">Sørger for nøyaktig informasjon</p> 
                </div>
              </div>
            </div>

            {/* Our story - Adjusted dark mode styles */}
            <div className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Vår historie</h2>
              {/* Adjusted dark mode text color */}
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4"> 
                ViaSport ble startet i 2023 av lidenskapelige fotballfans som var frustrert over hvor vanskelig det var å finne ut hvor kampene ble sendt.
              </p>
              {/* Adjusted dark mode text color */}
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4"> 
                Etter å ha brukt timer på å lete gjennom TV-guider og strømmetjenester for å finne ut hvor de kunne se favorittlaget sitt spille, bestemte grunnleggerne seg for å lage en løsning på problemet.
              </p>
              {/* Adjusted dark mode text color */}
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4"> 
                De samlet et team av fotballfans og teknologieksperter, og sammen bygde de ViaSport - en nettside som samler all informasjon om fotballkamper på TV og strømmetjenester på ett sted.
              </p>
              {/* Adjusted dark mode text color */}
              <p className="text-lg text-gray-700 dark:text-gray-300"> 
                I dag har ViaSport vokst til å bli en ledende tjeneste for å finne fotballkamper på TV og strømmetjenester, med tusenvis av daglige brukere.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 