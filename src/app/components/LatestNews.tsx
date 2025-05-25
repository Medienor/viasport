'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface NewsItem {
  id: string;
  title: string;
  subtitle?: string;
  nb_title?: string;
  nb_subtitle?: string;
  nb_seo_slug?: string;
  seo_slug?: string;
  generated_image_url?: string;
  category_title?: string;
  published_at?: string;
  author_full_name?: string;
  custom_author?: string;
  nb_translated: boolean;
}

export default function LatestNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        console.log('Fetching news from Supabase...');
        setLoading(true);
        
        const supabase = createClientComponentClient();
        
        const { data, error } = await supabase
          .from('news_articles')
          .select(`
            id,
            title,
            subtitle,
            nb_title,
            nb_subtitle,
            nb_seo_slug,
            seo_slug,
            generated_image_url,
            category_title,
            published_at,
            author_full_name,
            custom_author,
            nb_translated
          `)
          .eq('status', 'active')
          .eq('nb_translated', true)
          .not('nb_title', 'is', null)
          .order('published_at', { ascending: false })
          .limit(100);

        if (error) {
          throw new Error(`Supabase error: ${error.message}`);
        }
        
        console.log(`Found ${data?.length || 0} Norwegian news articles`);
        setNews(data || []);
        
      } catch (err) {
        console.error('Failed to fetch news:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Helper function to format relative time
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return '';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 60) {
      return diffInMinutes <= 1 ? '1 minutt siden' : `${diffInMinutes} minutter siden`;
    } else if (diffInHours < 24) {
      return diffInHours === 1 ? '1 time siden' : `${diffInHours} timer siden`;
    } else if (diffInDays === 1) {
      return 'I går';
    } else if (diffInDays < 7) {
      return `${diffInDays} dager siden`;
    } else {
      return date.toLocaleDateString('no-NO', { 
        day: 'numeric', 
        month: 'short'
      });
    }
  };

  if (loading) return (
    <div className="animate-pulse space-y-4 mt-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="flex space-x-3">
          <div className="rounded bg-gray-200 h-16 w-16"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      ))}
    </div>
  );

  if (error) return <div className="text-red-500 text-sm mt-4">Kunne ikke laste nyheter: {error}</div>;

  if (news.length === 0) return <div className="text-sm text-gray-500 mt-4">Ingen nyheter tilgjengelig</div>;

  return (
    <div className="mt-4">
      <ul className="space-y-4">
        {news.map((item) => {
          // Use Norwegian slug if available, otherwise fall back to English slug
          const slug = item.nb_seo_slug || item.seo_slug;
          const articleUrl = slug ? `/news/${slug}` : `/news/${item.id}`;
          
          // Use Norwegian content if available
          const title = item.nb_title || item.title;
          
          return (
            <li key={item.id} className="flex space-x-3">
              <div className="relative h-16 w-16 flex-shrink-0 rounded overflow-hidden">
                {item.generated_image_url ? (
                  <Image 
                    src={item.generated_image_url} 
                    alt={title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="bg-gray-200 h-full w-full flex items-center justify-center">
                    <span className="text-xs text-gray-500">Ingen bilde</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Link 
                  href={articleUrl}
                  className="block"
                >
                  <h3 className="text-sm font-medium hover:text-blue-600 hover:underline line-clamp-2">
                    {title}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    {item.published_at && (
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(item.published_at)}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}