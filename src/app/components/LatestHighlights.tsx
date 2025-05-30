"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Fixture {
  id: number;
  youtube_highlight_id: string;
}

export default function LatestHighlights() {
  const [highlights, setHighlights] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('fixtures')
          .select('id, youtube_highlight_id')
          .not('youtube_highlight_id', 'is', null)
          .not('youtube_highlight_id', 'eq', '')
          .order('id', { ascending: false })
          .limit(4);

        if (error) {
          throw error;
        }

        setHighlights(data || []);
      } catch (error) {
        console.error('Error fetching highlights:', error);
        setError('Kunne ikke laste høydepunkter');
      } finally {
        setLoading(false);
      }
    };

    fetchHighlights();
  }, [supabase]);

  const getYoutubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const getYoutubeUrl = (videoId: string) => {
    return `https://www.youtube.com/watch?v=${videoId}`;
  };

  if (loading) {
    return (
      <div className="pr-0 lg:pr-8">
        {/* Desktop loading - 2x2 grid */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full aspect-video bg-gray-200 dark:bg-[#333333] rounded"></div>
            </div>
          ))}
        </div>
        {/* Mobile loading */}
        <div className="lg:hidden flex space-x-3 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse flex-shrink-0 w-48">
              <div className="w-full aspect-video bg-gray-200 dark:bg-[#333333] rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pr-0 lg:pr-8">
        <div className="text-center py-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (highlights.length === 0) {
    return (
      <div className="pr-0 lg:pr-8">
        <div className="text-center py-4">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Ingen høydepunkter tilgjengelig</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-0 lg:pr-8">
      {/* Desktop: 2x2 Grid */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-3">
        {highlights.map((highlight) => (
          <div key={highlight.id} className="relative group">
            <a
              href={getYoutubeUrl(highlight.youtube_highlight_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative w-full aspect-video rounded overflow-hidden hover:scale-105 transition-transform duration-150"
            >
              <Image
                src={getYoutubeThumbnail(highlight.youtube_highlight_id)}
                alt="Football highlights"
                fill
                className="object-contain"
                unoptimized
              />
            </a>
          </div>
        ))}
      </div>

      {/* Mobile: Horizontal slider */}
      <div className="lg:hidden flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
        {highlights.map((highlight) => (
          <div key={highlight.id} className="relative group flex-shrink-0 w-48">
            <a
              href={getYoutubeUrl(highlight.youtube_highlight_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative w-full aspect-video rounded overflow-hidden hover:scale-105 transition-transform duration-150"
            >
              <Image
                src={getYoutubeThumbnail(highlight.youtube_highlight_id)}
                alt="Football highlights"
                fill
                className="object-contain"
                unoptimized
              />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
} 