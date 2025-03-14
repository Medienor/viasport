import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';
import ClientHead from './ClientHead';

// Set revalidation time - terms of use don't change often
export const revalidate = 86400; // Revalidate once per day (24 hours)

// Get the formatted date for "Last updated"
function getFormattedDate() {
  return new Date().toLocaleDateString('nb-NO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

export default function TermsOfUsePage() {
  // Get the formatted date on the server
  const formattedDate = getFormattedDate();
  
  return (
    <>
      {/* Client component for document title */}
      <ClientHead title="Vilkår for bruk - ViaSport" />
      
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
                  Vilkår for bruk
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
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Vilkår for bruk</h1>
            
            <div className="prose prose-blue max-w-none">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
                <p className="text-blue-700">
                  <strong>Viktig informasjon:</strong> ViaSport.no drives av Medienor AS og er ikke tilknyttet 
                  ViaSport-selskapet som tilbyr strømmetjenester. Vi er en uavhengig tjeneste som viser når og hvor 
                  sportsarrangementer sendes på TV og strømmetjenester.
                </p>
              </div>
              
              <p className="text-lg text-gray-700 mb-6">
                Sist oppdatert: {formattedDate}
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">1. Aksept av vilkår</h2>
              <p>
                Ved å bruke ViaSport.no, godtar du disse vilkårene for bruk i sin helhet. Hvis du ikke godtar disse vilkårene, 
                ber vi deg om ikke å bruke vår nettside. Vi forbeholder oss retten til å endre disse vilkårene når som helst, 
                og din fortsatte bruk av nettsiden etter slike endringer utgjør din aksept av de reviderte vilkårene.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">2. Tjenestebeskrivelse</h2>
              <p>
                ViaSport.no er en informasjonstjeneste som viser når og hvor sportsarrangementer sendes på TV og strømmetjenester. 
                Vi tilbyr informasjon om kamptider, lagstatistikk, tabeller og annen sportsinformasjon. Vår tjeneste bruker data 
                fra tredjeparter, inkludert Fotball API, for å gi deg oppdatert og nøyaktig informasjon.
              </p>
              <p className="mt-2">
                Vi er ikke en strømmetjeneste og tilbyr ikke direktesendinger av sportsarrangementer. Vi gir kun informasjon om 
                hvor og når du kan se disse arrangementene på lovlige TV-kanaler og strømmetjenester.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">3. Datakilder og tredjepartstjenester</h2>
              <p>
                ViaSport.no bruker data fra flere kilder, inkludert men ikke begrenset til:
              </p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>Fotball API og andre sportsdatakilder</li>
                <li>Offentlig tilgjengelig informasjon om TV-sendinger</li>
                <li>Informasjon fra strømmetjenester</li>
              </ul>
              <p>
                Vi gjør vårt beste for å sikre at informasjonen er nøyaktig og oppdatert, men vi kan ikke garantere 
                fullstendig nøyaktighet til enhver tid. Endringer i TV-sendinger, kampavlysninger eller andre faktorer 
                utenfor vår kontroll kan påvirke nøyaktigheten av informasjonen.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">4. Brukerkonto og registrering</h2>
              <p>
                Noen deler av vår tjeneste kan kreve at du oppretter en brukerkonto. Ved registrering forplikter du deg til å:
              </p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>Gi nøyaktig, oppdatert og fullstendig informasjon</li>
                <li>Opprettholde sikkerheten til din konto og passord</li>
                <li>Akseptere fullt ansvar for alle aktiviteter som skjer under din konto</li>
                <li>Varsle oss umiddelbart om uautorisert bruk av din konto</li>
              </ul>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">5. Immaterielle rettigheter</h2>
              <p>
                Alt innhold på ViaSport.no, inkludert tekst, grafikk, logoer, ikoner, bilder, lyd, videoer og programvare, 
                er eid av eller lisensiert til Medienor AS og er beskyttet av norske og internasjonale lover om opphavsrett 
                og andre immaterielle rettigheter.
              </p>
              <p className="mt-2">
                Du får en begrenset, ikke-eksklusiv, ikke-overførbar lisens til å bruke innholdet på nettsiden for personlige, 
                ikke-kommersielle formål. Du kan ikke:
              </p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>Reprodusere, distribuere, vise eller selge noe innhold fra nettsiden</li>
                <li>Modifisere eller lage avledede verk basert på innholdet</li>
                <li>Bruke innholdet for kommersielle formål uten vår uttrykkelige tillatelse</li>
                <li>Fjerne noen opphavsrettsmerker eller andre eiendomsmerker fra innholdet</li>
              </ul>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">6. Brukeratferd og begrensninger</h2>
              <p>
                Ved bruk av ViaSport.no, samtykker du til ikke å:
              </p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>Bruke tjenesten på noen måte som er ulovlig eller forbudt av disse vilkårene</li>
                <li>Bruke tjenesten for å overføre skadelig kode eller for å angripe eller manipulere tjenesten</li>
                <li>Forsøke å få uautorisert tilgang til deler av tjenesten, andre kontoer eller datasystemer</li>
                <li>Høste eller samle inn data om andre brukere uten deres samtykke</li>
                <li>Bruke automatiserte metoder for å hente ut data fra tjenesten (scraping) uten vår uttrykkelige tillatelse</li>
                <li>Forstyrre eller avbryte tjenesten eller servere eller nettverk tilknyttet tjenesten</li>
              </ul>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">7. Ansvarsfraskrivelse</h2>
              <p>
                ViaSport.no leveres &ldquo;som den er&rdquo; og &ldquo;som tilgjengelig&rdquo; uten noen garantier, verken uttrykte eller underforståtte. 
                Medienor AS fraskriver seg, i den grad det er tillatt av gjeldende lov, alle garantier, inkludert men ikke begrenset 
                til underforståtte garantier om salgbarhet, egnethet for et bestemt formål og ikke-krenkelse.
              </p>
              <p className="mt-2">
                Vi garanterer ikke at:
              </p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>Tjenesten vil oppfylle dine spesifikke krav</li>
                <li>Tjenesten vil være uavbrutt, rettidig, sikker eller feilfri</li>
                <li>Resultatene som kan oppnås fra bruken av tjenesten vil være nøyaktige eller pålitelige</li>
                <li>Kvaliteten på produkter, tjenester, informasjon eller annet materiale vil møte dine forventninger</li>
              </ul>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">8. Ansvarsbegrensning</h2>
              <p>
                I den grad det er tillatt av gjeldende lov, skal Medienor AS ikke være ansvarlig for noen indirekte, tilfeldige, 
                spesielle, følgeskader eller straffeerstatning, inkludert men ikke begrenset til tap av fortjeneste, data, bruk, 
                goodwill eller andre immaterielle tap som følge av:
              </p>
              <ul className="list-disc pl-6 mt-2 mb-4">
                <li>Din bruk eller manglende evne til å bruke tjenesten</li>
                <li>Uautorisert tilgang til eller endring av dine overføringer eller data</li>
                <li>Uttalelser eller atferd fra tredjepart på tjenesten</li>
                <li>Enhver annen sak relatert til tjenesten</li>
              </ul>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">9. Lenker til tredjepartsnettsteder</h2>
              <p>
                Vår tjeneste kan inneholde lenker til tredjepartsnettsteder eller tjenester som ikke eies eller kontrolleres av 
                Medienor AS. Vi har ingen kontroll over, og påtar oss intet ansvar for innholdet, personvernpolicyer eller praksis 
                på noen tredjepartsnettsteder eller tjenester. Du erkjenner og samtykker i at Medienor AS ikke skal være ansvarlig, 
                direkte eller indirekte, for skade eller tap forårsaket eller angivelig forårsaket av eller i forbindelse med bruk 
                av eller tillit til slikt innhold, varer eller tjenester tilgjengelig på eller gjennom slike nettsteder eller tjenester.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">10. Oppsigelse</h2>
              <p>
                Vi kan avslutte eller suspendere din tilgang til tjenesten umiddelbart, uten forvarsel eller ansvar, av enhver grunn, 
                inkludert, uten begrensning, hvis du bryter vilkårene. Ved oppsigelse opphører din rett til å bruke tjenesten umiddelbart.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">11. Gjeldende lov</h2>
              <p>
                Disse vilkårene skal styres og tolkes i samsvar med lovene i Norge, uten hensyn til dets konfliktlovbestemmelser. 
                Vår manglende håndhevelse av noen rettighet eller bestemmelse i disse vilkårene vil ikke bli ansett som et avkall 
                på disse rettighetene.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">12. Endringer i vilkårene</h2>
              <p>
                Vi forbeholder oss retten, etter eget skjønn, til å endre eller erstatte disse vilkårene når som helst. Ved vesentlige 
                endringer vil vi forsøke å gi minst 30 dagers varsel før nye vilkår trer i kraft. Hva som utgjør en vesentlig endring 
                vil bli bestemt etter vårt eget skjønn.
              </p>
              <p className="mt-2">
                Ved å fortsette å bruke vår tjeneste etter at disse endringene trer i kraft, samtykker du i å være bundet av de 
                reviderte vilkårene. Hvis du ikke godtar de nye vilkårene, ber vi deg om å slutte å bruke tjenesten.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4">13. Kontaktinformasjon</h2>
              <p>
                Hvis du har spørsmål om disse vilkårene, vennligst kontakt oss på:
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