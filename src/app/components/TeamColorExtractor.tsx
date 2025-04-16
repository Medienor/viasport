'use client';

import { useEffect, useState } from 'react';
import ColorThief from 'colorthief';
import { createClient } from '@supabase/supabase-js';

interface TeamColorExtractorProps {
  homeTeamLogo: string;
  awayTeamLogo: string;
  homeTeamId: number;
  awayTeamId: number;
}

// Initialize Supabase client
const supabase = createClient(
  'https://cdynfbwdwdfsiwkgixua.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI',
  {
    global: {
      fetch: fetch as any
    }
  }
);

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

export default function TeamColorExtractor({ homeTeamLogo, awayTeamLogo, homeTeamId, awayTeamId }: TeamColorExtractorProps) {
  const [homeTeamColor, setHomeTeamColor] = useState<string | null>(null);
  const [awayTeamColor, setAwayTeamColor] = useState<string | null>(null);

  const extractColor = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        try {
          const colorThief = new ColorThief();
          const [r, g, b] = colorThief.getColor(img);
          const hexColor = rgbToHex(r, g, b);
          resolve(hexColor);
        } catch (error) {
          console.error('Error extracting color:', error);
          reject('#000000'); // Default to black on error
        }
      };

      img.onerror = () => {
        console.error('Error loading image');
        reject('#000000');
      };

      img.src = imageUrl;
    });
  };

  const saveTeamColor = async (teamId: number, color: string) => {
    try {
      const { data, error } = await supabase
        .from('team_colors')
        .upsert(
          { team_id: teamId, primary_color: color },
          { onConflict: 'team_id' }
        );

      if (error) throw error;
      console.log(`Saved color ${color} for team ${teamId}`);
    } catch (error) {
      console.error('Error saving team color:', error);
    }
  };

  useEffect(() => {
    const loadColors = async () => {
      try {
        // First check if we already have the colors stored
        const { data: existingColors } = await supabase
          .from('team_colors')
          .select('team_id, primary_color')
          .in('team_id', [homeTeamId, awayTeamId]);

        const existingHomeColor = existingColors?.find(c => c.team_id === homeTeamId)?.primary_color;
        const existingAwayColor = existingColors?.find(c => c.team_id === awayTeamId)?.primary_color;

        // If we don't have stored colors, extract them
        if (!existingHomeColor) {
          const homeColor = await extractColor(homeTeamLogo);
          setHomeTeamColor(homeColor);
          await saveTeamColor(homeTeamId, homeColor);
        } else {
          setHomeTeamColor(existingHomeColor);
        }

        if (!existingAwayColor) {
          const awayColor = await extractColor(awayTeamLogo);
          setAwayTeamColor(awayColor);
          await saveTeamColor(awayTeamId, awayColor);
        } else {
          setAwayTeamColor(existingAwayColor);
        }

      } catch (error) {
        console.error('Error in loadColors:', error);
      }
    };

    loadColors();
  }, [homeTeamLogo, awayTeamLogo, homeTeamId, awayTeamId]);

  // This component doesn't render anything visible
  return null;
} 