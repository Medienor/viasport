import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';
import ClientHead from './ClientHead';

// Set revalidation time - privacy policy doesn't change often
export const revalidate = 86400; // Revalidate once per day (24 hours)

// Get the formatted date for "Last updated"
function getFormattedDate() {
  return new Date().toLocaleDateString('nb-NO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

export default function PrivacyPolicyPage() {
  // Get the formatted date on the server
  const formattedDate = getFormattedDate();
  
  return (
    <>
      {/* Client component for document title */}
      <ClientHead title="Personvernerklæring - ViaSport" />
      
      {/* Main content - Added dark mode background */}
      <div className="bg-gray-50 dark:bg-dark-main min-h-screen py-12"> 
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Content card - Added dark mode background AND base text color */}
          <div className="bg-white dark:bg-[#181818] dark:text-gray-300 shadow rounded-lg p-8"> 
            {/* Heading - Added dark mode text color */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Personvernerklæring</h1> 
            
            {/* Prose container - Added dark:prose-invert for relative styling */}
            <div className="prose prose-blue dark:prose-invert max-w-none"> 
              {/* Important info box - Adjusted dark mode styles */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 dark:bg-blue-900/30 dark:border-blue-700"> 
                {/* Adjusted dark mode text color */}
                <p className="text-blue-700 dark:text-blue-300"> 
                  <strong>Viktig informasjon:</strong> ViaSport.no drives av Medienor AS og er ikke tilknyttet 
                  ViaSport-selskapet som tilbyr strømmetjenester. Vi er en uavhengig tjeneste som viser når og hvor 
                  sportsarrangementer sendes på TV og strømmetjenester.
                </p>
              </div>
              
              {/* "Last updated" - color handled by dark:prose-invert */}
              <p className="text-lg text-gray-700 mb-6"> 
                Sist oppdatert: {formattedDate}
              </p>
              
              {/* Headings and paragraphs below should be handled by dark:prose-invert */}
              <h2 className="text-xl font-semibold mt-8 mb-4">1. Innledning</h2>
              <p>
                ViaSport.no, drevet av Medienor AS (org.nr. 924 303 263), er opptatt av å beskytte dine personopplysninger. 
                Denne personvernerklæringen forklarer hvordan vi samler inn, bruker, lagrer og beskytter dine personopplysninger 
                når du bruker vår nettside og tjenester.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">2. Hvilke opplysninger vi samler inn</h2>
              <p>Vi kan samle inn følgende typer personopplysninger:</p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>Informasjon du gir oss direkte (navn, e-postadresse, etc. ved registrering eller kontakt)</li>
                <li>Informasjon vi samler automatisk (IP-adresse, enhetstype, nettlesertype)</li>
                <li>Informasjon om din bruk av nettsiden (sidevisninger, klikk, tid brukt)</li>
                <li>Informasjonskapsler (cookies) og lignende teknologier</li>
              </ul>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">3. Hvordan vi bruker dine opplysninger</h2>
              <p>Vi bruker dine personopplysninger til følgende formål:</p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>For å levere og forbedre våre tjenester</li>
                <li>For å personalisere din opplevelse</li>
                <li>For å kommunisere med deg om endringer i tjenesten eller viktige oppdateringer</li>
                <li>For å analysere bruksmønstre og forbedre nettsiden</li>
                <li>For å overholde juridiske forpliktelser</li>
              </ul>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">4. Deling av opplysninger</h2>
              <p>
                Vi deler ikke dine personopplysninger med tredjeparter, med mindre det er nødvendig for å levere våre tjenester, 
                eller vi er pålagt å gjøre det ved lov. Våre samarbeidspartnere inkluderer:
              </p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>Analyseverktøy (Google Analytics)</li>
                <li>Hostingleverandører</li>
                <li>Betalingstjenesteleverandører (ved eventuelle betalte tjenester)</li>
              </ul>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">5. Informasjonskapsler (cookies)</h2>
              <p>
                Vi bruker informasjonskapsler for å forbedre din brukeropplevelse, analysere nettstedtrafikk og personalisere innhold. 
                Du kan kontrollere bruken av informasjonskapsler gjennom innstillingene i din nettleser.
              </p>
              <p className="mt-2">
                Vi bruker følgende typer cookies:
              </p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>Nødvendige cookies for at nettsiden skal fungere</li>
                <li>Preferansecookies som husker dine valg og innstillinger</li>
                <li>Statistikk-cookies som hjelper oss å forstå hvordan besøkende bruker nettsiden</li>
                <li>Markedsføringscookies for å vise relevante annonser</li>
              </ul>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">6. Dine rettigheter</h2>
              <p>I henhold til personvernlovgivningen har du følgende rettigheter:</p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>Rett til innsyn i dine personopplysninger</li>
                <li>Rett til å korrigere uriktige personopplysninger</li>
                <li>Rett til å få slettet dine personopplysninger</li>
                <li>Rett til å begrense behandlingen av dine personopplysninger</li>
                <li>Rett til dataportabilitet</li>
                <li>Rett til å protestere mot behandling av dine personopplysninger</li>
              </ul>
              <p>
                For å utøve disse rettighetene, vennligst kontakt oss på josef@medienor.no.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">7. Sikkerhet</h2>
              <p>
                Vi har implementert passende tekniske og organisatoriske tiltak for å beskytte dine personopplysninger mot 
                uautorisert tilgang, tap eller skade. Vi gjennomgår og oppdaterer regelmessig våre sikkerhetstiltak.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">8. Oppbevaring av data</h2>
              <p>
                Vi oppbevarer dine personopplysninger kun så lenge det er nødvendig for å oppfylle formålene beskrevet i denne 
                personvernerklæringen, eller så lenge vi er pålagt å gjøre det av lov.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">9. Endringer i personvernerklæringen</h2>
              <p>
                Vi kan oppdatere denne personvernerklæringen fra tid til annen. Vi vil informere deg om vesentlige endringer ved 
                å publisere den nye versjonen på vår nettside, og hvis nødvendig, via e-post.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">10. Kontaktinformasjon</h2>
              <p>
                Hvis du har spørsmål eller bekymringer angående denne personvernerklæringen eller vår behandling av dine 
                personopplysninger, kan du kontakte oss på:
              </p>
              <p className="mt-2">
                <strong>Selskap:</strong> Medienor AS<br />
                <strong>Org.nr:</strong> 924 303 263<br />
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">11. Klagerett</h2>
              <p>
                Du har rett til å klage til Datatilsynet hvis du mener at vår behandling av dine personopplysninger ikke 
                overholder personvernlovgivningen. Du kan finne mer informasjon på 
                {/* Adjusted dark mode link color */}
                <a href="https://www.datatilsynet.no" className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:underline" target="_blank" rel="noopener noreferrer"> www.datatilsynet.no</a>. 
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 