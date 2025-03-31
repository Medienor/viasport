import type { Metadata, ResolvingMetadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://cdynfbwdwdfsiwkgixua.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI',
  {
    global: {
      fetch: fetch as any
    }
  }
);

type Props = {
  params: { matchId: string }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  try {
    console.log('Fetching match with ID:', params.matchId);
    
    const { data: match, error } = await supabase
      .from('fixtures')
      .select(`
        id,
        date,
        league_id,
        home_team_id,
        away_team_id,
        status,
        score,
        league,
        teams,
        match_status,
        venue,
        goals,
        event_data,
        event_goals,
        event_cards_yellow,
        event_cards_red,
        event_substitutions,
        fixture_statistics,
        head_to_head
      `)
      .eq('id', params.matchId)
      .single();

    if (error || !match) {
      console.error('Error fetching match:', error);
      return {
        title: 'Kamp ikke funnet | Viasport',
      };
    }

    // Format date
    const matchDate = new Date(match.date);
    const formattedDate = matchDate.toLocaleDateString('no-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Check if match is finished
    const isFinished = ['FT', 'AET', 'PEN'].includes(match.status.short);

    // Generate title based on match status
    let title;
    if (isFinished) {
      title = `${match.teams.home.name} - ${match.teams.away.name} (${match.goals.home}-${match.goals.away}), ${match.league.name} | Viasport`;
    } else {
      title = `${match.teams.home.name} - ${match.teams.away.name} | ${formattedDate} | Viasport`;
    }

    // Generate description
    let description;
    if (isFinished) {
      description = `Se høydepunkter og statistikk fra ${match.teams.home.name} mot ${match.teams.away.name} i ${match.league.name}. Kampen endte ${match.goals.home}-${match.goals.away}.`;
    } else {
      description = `Følg ${match.teams.home.name} mot ${match.teams.away.name} i ${match.league.name} ${formattedDate}. Få oppdateringer, statistikk og mer på Viasport.`;
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        url: `https://viasport.no/fotball/kamp/${match.id}`,
        images: [
          {
            url: match.teams.home.logo,
            alt: match.teams.home.name,
            width: 96,
            height: 96,
          },
          {
            url: match.teams.away.logo,
            alt: match.teams.away.name,
            width: 96,
            height: 96,
          },
        ],
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    };
  } catch (error) {
    console.error('Error in generateMetadata:', error);
    return {
      title: 'Kamp ikke funnet | Viasport',
    };
  }
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4">
      {children}
    </div>
  );
} 