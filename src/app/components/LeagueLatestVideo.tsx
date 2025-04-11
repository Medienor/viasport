'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LeagueLatestVideoProps {
  leagueName: string;
  leagueId: number;
  leagueLogo: string;
}

// Add a function to check if league is mapped
const isMappedLeague = (leagueId: number): boolean => {
  const mappedLeagues = [
    39,  // Premier League
    103, // Eliteserien
    140, // La Liga
    135, // Serie A
    725  // Toppserien
  ];
  return mappedLeagues.includes(leagueId);
};

export default function LeagueLatestVideo({ leagueName, leagueId, leagueLogo }: LeagueLatestVideoProps) {
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If league is not mapped, don't render anything
  if (!isMappedLeague(leagueId)) {
    return null;
  }

  // Reuse the same helper functions from EliteserienVideos
  const extractScore = (title: string) => {
    const scoreRegex = /(\d+)\s*-\s*(\d+)/;
    const match = title.match(scoreRegex);
    
    if (match) {
      return {
        home: match[1],
        away: match[2]
      };
    }
    return null;
  };

  const extractTeams = (title: string) => {
    const teamsRegex = /(.+?)\s*\d+\s*-\s*\d+\s*(.+?)(\s*-\s*|$)/i;
    const match = title.match(teamsRegex);
    
    if (match) {
      return {
        home: match[1].trim(),
        away: match[2].trim()
      };
    }
    
    const titleParts = title.split(' - ');
    return {
      full: titleParts[0]
    };
  };

  // Helper to determine if it's a Norwegian league
  const isNorwegianLeague = (id: number) => {
    return [103, 104, 725].includes(id); // Eliteserien, OBOS, Toppserien
  };

  // Get the appropriate search term based on league
  const getSearchTerm = (leagueId: number) => {
    switch (leagueId) {
      case 39:  // Premier League
        return 'premier league highlights';
      case 140: // La Liga
        return 'la liga highlights';
      case 135: // Serie A
        return 'serie a highlights';
      case 78:  // Bundesliga
        return 'bundesliga highlights';
      case 61:  // Ligue 1
        return 'ligue 1 highlights';
      case 103: // Eliteserien
        return 'eliteserien høydepunkter';
      case 104: // OBOS
        return 'obos-ligaen høydepunkter';
      case 725: // Toppserien
        return 'toppserien høydepunkter';
      default:
        return `${leagueName} highlights`;
    }
  };

  // Get the display term for the title
  const getDisplayTerm = (leagueId: number) => {
    return isNorwegianLeague(leagueId) ? 'Høydepunkter' : 'Highlights';
  };

  // Define trusted channels for each league
  const getChannelIds = (leagueId: number): string[] => {
    switch (leagueId) {
      case 39:  // Premier League
        return [
          'UCG5qGWdu8nIRZqJ_GgDwQ-w',  // Official Premier League
          'UC9LQwHZoucFT94I2h6JOcjw',  // Liverpool
          'UCEg25rdRZXg32iwai6N6l0w',  // Tottenham
          'UCpryVRk_VDudG8SHXgWcG0w',  // Arsenal
          'UCtK4QAczAN2mt2ow_jlGinQ',  // Everton
          'UCyAxjuAr8f_BFDGCO3Htbxw'   // Nottingham Forest
        ];
      case 103: // Eliteserien
        return ['UC9QZZRUajPEoo1Q-V3MfvnQ']; // TV2 Sport
      case 140: // La Liga
        return [
          'UCWV3obpZVGgJ3j9FVhEjF2Q', // Real Madrid
          'UC14UlmYlSNiQCBe9Eookf_A'  // Barcelona
        ];
      case 135: // Serie A
        return ['UCBJeMCIeLQos7wacox4hmLQ']; // Serie A Official
      case 725: // Toppserien
        return ['UCrjEfwPwH3n1xuiNhWXv3iw']; // Toppserien channel
      default:
        return [];
    }
  };

  // Add Premier League team names for title matching
  const premierLeagueTeams = [
    'arsenal', 'aston villa', 'bournemouth', 'brentford', 'brighton', 
    'burnley', 'chelsea', 'crystal palace', 'everton', 'liverpool', 
    'luton', 'manchester city', 'manchester united', 'man city', 'man united',
    'man utd', 'newcastle', 'nottingham forest', 'sheffield united', 
    'tottenham', 'spurs', 'west ham', 'wolves'
  ];

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const searchTerm = getSearchTerm(leagueId);
        const channelIds = getChannelIds(leagueId);
        
        const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchTerm)}&maxResults=50&order=date`);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const filteredVideos = data.items.filter((video: any) => {
            const publishDate = new Date(video.snippet.publishedAt);
            const title = video.snippet.title.toLowerCase();
            
            if (leagueId === 39) { // Premier League
              const hasTeamName = premierLeagueTeams.some(team => 
                title.includes(team.toLowerCase())
              );
              
              return publishDate > thirtyDaysAgo && 
                     channelIds.includes(video.snippet.channelId) &&
                     hasTeamName &&
                     (title.includes('highlight') || title.includes('highlights')) &&
                     !title.includes('shorts');
            } else if ([103, 725].includes(leagueId)) {
              return publishDate > thirtyDaysAgo && 
                     getChannelIds(leagueId).includes(video.snippet.channelId) &&
                     title.includes('høydepunkter');
            } else if (leagueId === 140) {
              return publishDate > thirtyDaysAgo && 
                     getChannelIds(leagueId).includes(video.snippet.channelId) &&
                     (title.includes('highlight') || title.includes('highlights'));
            } else if (leagueId === 135) {
              return publishDate > thirtyDaysAgo && 
                     getChannelIds(leagueId).includes(video.snippet.channelId) &&
                     (title.includes('highlight') || title.includes('highlights'));
            }
            return publishDate > thirtyDaysAgo;
          });

          // Sort by date (newest first)
          filteredVideos.sort((a, b) => 
            new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime()
          );

          if (filteredVideos.length > 0) {
            setVideo(filteredVideos[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching video:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [leagueName, leagueId]);

  if (loading) {
    return (
      <div className="animate-pulse mt-4">
        <div className="bg-gray-200 rounded-lg h-48"></div>
      </div>
    );
  }

  if (error) {
    return null; // Hide the component if there's an error
  }

  if (!video) {
    return null; // Hide if no video is found
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <h3 className="font-medium mb-4">Siste høydepunkter fra {leagueName}</h3>
      <Link 
        href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative rounded-lg overflow-hidden group"
      >
        <div className="relative aspect-video">
          <Image
            src={video.snippet.thumbnails.high.url}
            alt={video.snippet.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          
          {/* Top gradient with league logo */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 to-transparent z-10">
            <div className="flex items-center p-4">
              <Image 
                src={leagueLogo}
                alt={leagueName}
                width={32}
                height={32}
                className="mr-2"
              />
              <span className="text-white font-bold text-lg">{leagueName}</span>
            </div>
          </div>
        </div>
        
        {/* Title box */}
        <div className="bg-blue-900 text-white p-3">
          <h4 className="font-bold text-sm">
            {extractTeams(video.snippet.title).full || 
             `${extractTeams(video.snippet.title).home} - ${extractTeams(video.snippet.title).away}`} - {getDisplayTerm(leagueId)}
          </h4>
          <p className="text-xs text-gray-300 mt-1 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path>
              <path d="M13 7h-2v5.414l3.293 3.293 1.414-1.414L13 11.586z"></path>
            </svg>
            {new Date(video.snippet.publishedAt).toLocaleDateString('no-NO', {
              day: 'numeric',
              month: 'long'
            })}
          </p>
        </div>
      </Link>
    </div>
  );
} 