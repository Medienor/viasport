"use client"

import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';

// Custom hook to update document title
function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

export default function CookiesPage() {
  // Set the page title
  useDocumentTitle('Informasjonskapsler - ViaSport');

  return (
    <>
      {/* Breadcrumb navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex py-3" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-1">
              <li>
                <Link href="/" className="text-sm text-gray-500 hover:text-blue-600">
                  <HomeIcon className="h-4 w-4" />
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                <span className="ml-1 text-sm text-gray-700">
                  Informasjonskapsler
                </span>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main content - using the same max-w-7xl as navbar and breadcrumbs */}
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Informasjonskapsler (Cookies)</h1>
            
            <div className="prose prose-blue max-w-none">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
                <p className="text-blue-700">
                  <strong>Viktig informasjon:</strong> ViaSport.no drives av Medienor AS og er ikke tilknyttet 
                  ViaSport-selskapet som tilbyr strømmetjenester. Vi er en uavhengig tjeneste som viser når og hvor 
                  sportsarrangementer sendes på TV og strømmetjenester.
                </p>
              </div>
              
              <p className="text-lg text-gray-700 mb-6">
                Sist oppdatert: {new Date().toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">1. Hva er informasjonskapsler?</h2>
              <p>
                Informasjonskapsler (cookies) er små tekstfiler som lagres på din enhet (datamaskin, mobiltelefon eller nettbrett) 
                når du besøker en nettside. Disse filene gjør det mulig for nettsiden å huske dine handlinger og preferanser over 
                tid, slik at du ikke trenger å oppgi dem hver gang du besøker nettsiden eller navigerer fra en side til en annen.
              </p>
              <p className="mt-2">
                Informasjonskapsler kan være enten &ldquo;permanente&rdquo; eller &ldquo;midlertidige&rdquo; (sesjon). Permanente informasjonskapsler 
                forblir på enheten din i en bestemt periode eller til du sletter dem manuelt, mens midlertidige informasjonskapsler 
                slettes når du lukker nettleseren din.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">2. Hvordan vi bruker informasjonskapsler</h2>
              <p>
                ViaSport.no bruker informasjonskapsler for flere formål, inkludert:
              </p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>
                  <strong>Nødvendige informasjonskapsler:</strong> Disse er avgjørende for at nettsiden skal fungere riktig. 
                  De gjør det mulig for deg å navigere på nettsiden og bruke dens funksjoner. Disse informasjonskapslene samler 
                  ikke informasjon om deg som kan brukes til markedsføring eller for å huske hvor du har vært på internett.
                </li>
                <li>
                  <strong>Preferanse-informasjonskapsler:</strong> Disse gjør det mulig for nettsiden å huske informasjon som 
                  endrer hvordan nettsiden oppfører seg eller ser ut, som ditt foretrukne språk eller regionen du befinner deg i.
                </li>
                <li>
                  <strong>Statistikk-informasjonskapsler:</strong> Disse hjelper oss å forstå hvordan besøkende samhandler med 
                  nettsiden ved å samle og rapportere informasjon anonymt. De hjelper oss å forbedre hvordan nettsiden fungerer.
                </li>
                <li>
                  <strong>Markedsførings-informasjonskapsler:</strong> Disse brukes til å spore besøkende på tvers av nettsteder. 
                  Hensikten er å vise annonser som er relevante og engasjerende for den enkelte bruker.
                </li>
              </ul>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">3. Tredjeparters informasjonskapsler</h2>
              <p>
                I tillegg til våre egne informasjonskapsler, kan vi også bruke ulike tredjeparters informasjonskapsler for å 
                rapportere nettstedsbruk, integrere med sosiale medier, eller for å vise annonser på ViaSport.no. Disse kan inkludere:
              </p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>
                  <strong>Google Analytics:</strong> Vi bruker Google Analytics for å analysere hvordan brukere bruker vår nettside. 
                  Google Analytics samler informasjon om nettstedsbruk ved hjelp av informasjonskapsler. Informasjonen som samles 
                  inn om din bruk av nettsiden (inkludert din IP-adresse) overføres til og lagres av Google på servere i USA. 
                  Google bruker denne informasjonen til å evaluere din bruk av nettsiden, utarbeide rapporter om nettstedsaktivitet 
                  for nettstedsoperatører og for å tilby andre tjenester relatert til nettstedsaktivitet og internettbruk.
                </li>
                <li>
                  <strong>Sosiale medier:</strong> Vi kan integrere funksjoner fra sosiale medier på vår nettside, som Facebook, 
                  Twitter og Instagram. Disse funksjonene kan samle inn informasjon om din IP-adresse og hvilke sider du besøker 
                  på vår nettside. De kan også sette informasjonskapsler for å aktivere funksjonene til å fungere riktig.
                </li>
                <li>
                  <strong>Annonseringspartnere:</strong> Vi kan bruke annonseringspartnere som Google AdSense for å vise annonser 
                  på vår nettside. Disse partnerne kan bruke informasjonskapsler for å samle inn informasjon om dine besøk på 
                  denne og andre nettsteder for å vise relevante annonser basert på dine interesser.
                </li>
              </ul>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">4. Kontroll over informasjonskapsler</h2>
              <p>
                De fleste nettlesere er satt til å akseptere informasjonskapsler som standard. Du kan imidlertid endre 
                innstillingene i nettleseren din for å slette eller blokkere informasjonskapsler. Vær oppmerksom på at hvis 
                du velger å blokkere informasjonskapsler, kan det påvirke funksjonaliteten til nettsiden og din brukeropplevelse.
              </p>
              <p className="mt-2">
                Her er lenker til instruksjoner for hvordan du kan administrere informasjonskapsler i ulike nettlesere:
              </p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>
                  <a href="https://support.google.com/chrome/answer/95647" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    Mozilla Firefox
                  </a>
                </li>
                <li>
                  <a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    Safari
                  </a>
                </li>
                <li>
                  <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    Microsoft Edge
                  </a>
                </li>
              </ul>
              <p className="mt-2">
                I tillegg kan du besøke <a href="https://www.youronlinechoices.eu" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">www.youronlinechoices.eu</a> for 
                informasjon om hvordan du kan velge bort atferdsbasert annonsering fra mange annonseringsnettverk.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">5. Samtykke til bruk av informasjonskapsler</h2>
              <p>
                Når du først besøker vår nettside, vil du bli bedt om å gi ditt samtykke til vår bruk av informasjonskapsler 
                gjennom vår cookie-banner. Du kan velge å akseptere alle informasjonskapsler, kun nødvendige informasjonskapsler, 
                eller tilpasse dine preferanser. Du kan når som helst endre dine preferanser ved å klikke på &ldquo;Cookie-innstillinger&rdquo; 
                i bunnen av vår nettside.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">6. Endringer i vår informasjonskapsel-policy</h2>
              <p>
                Vi kan oppdatere vår informasjonskapsel-policy fra tid til annen. Eventuelle endringer vil bli publisert på denne 
                siden, og hvis endringene er betydelige, vil vi gi en mer fremtredende melding.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">7. Kontaktinformasjon</h2>
              <p>
                Hvis du har spørsmål om vår bruk av informasjonskapsler, vennligst kontakt oss på:
              </p>
              <p className="mt-2">
                <strong>Selskap:</strong> Medienor AS<br />
                <strong>Org.nr:</strong> 924 303 263<br />
                <strong>E-post:</strong> josef@medienor.no<br />
                <strong>Adresse:</strong> Skoglien 23, 5056 Bergen
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 