'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface NewsItem {
  id: string;
  title: string;
  subtitle?: string;
  urls?: {
    external_url?: string;
    canonical_url?: string;
    public_url_desktop?: string;
  };
  image?: any;
  category?: {
    title: string;
  };
  published_at?: string;
  updated_at?: string;
  entity_type?: string;
  slug?: string;
}

export default function LatestNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        console.log('Fetching news data...');
        setLoading(true);
        
        const response = await fetch('https://livescore6.p.rapidapi.com/news/v2/list', {
          headers: {
            'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
            'x-rapidapi-host': 'livescore6.p.rapidapi.com'
          }
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('News API response structure:', Object.keys(data));
        
        // Let's explore the full response to find where the news items are
        console.log('homepageArticles:', data.homepageArticles);
        console.log('categories:', data.categories);
        console.log('topStories:', data.topStories);
        
        // Try different paths to find news items
        let newsItems = [];
        
        if (data.homepageArticles && data.homepageArticles.articles && data.homepageArticles.articles.length > 0) {
          console.log('Found news in homepageArticles.articles');
          newsItems = data.homepageArticles.articles;
        } else if (data.topStories && data.topStories.length > 0) {
          console.log('Found news in topStories');
          newsItems = data.topStories;
        } else if (data.categories && data.categories.length > 0) {
          // Try to get football news from categories
          const footballCategory = data.categories.find(cat => cat.title === 'football');
          if (footballCategory) {
            console.log('Found football category, trying to fetch articles');
            // We might need to make another API call to get articles for this category
            try {
              const categoryResponse = await fetch(`https://livescore6.p.rapidapi.com/news/v2/list-by-sport?category=${footballCategory.id}&page=1`, {
                headers: {
                  'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
                  'x-rapidapi-host': 'livescore6.p.rapidapi.com'
                }
              });
              
              if (categoryResponse.ok) {
                const categoryData = await categoryResponse.json();
                console.log('Football category data:', categoryData);
                if (categoryData.data && categoryData.data.length > 0) {
                  console.log('Found news in football category');
                  newsItems = categoryData.data;
                }
              }
            } catch (err) {
              console.error('Failed to fetch football category news:', err);
            }
          }
        }
        
        console.log(`Found ${newsItems.length} news items`);
        
        if (newsItems.length > 0) {
          console.log('Sample news item:', newsItems[0]);
          
          // Log the image structure to debug
          const sampleItem = newsItems[0];
          console.log('Image data:', sampleItem.image);
          
          if (sampleItem.image && sampleItem.image.data && sampleItem.image.data.urls) {
            console.log('Image URLs:', sampleItem.image.data.urls.uploaded);
          }
          
          // Limit to 3 news items
          setNews(newsItems.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Helper function to format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('no-NO', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (loading) return (
    <div className="animate-pulse space-y-4 mt-4">
      {/* Show only 3 loading placeholders */}
      {[...Array(3)].map((_, i) => (
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
        {/* Only render the first 3 news items */}
        {news.slice(0, 3).map((item) => {
          // Get image URL from different possible structures
          let imageUrl = null;
          
          if (item.image?.data?.urls?.uploaded?.embed) {
            imageUrl = item.image.data.urls.uploaded.embed;
          } else if (item.image?.data?.urls?.uploaded?.gallery) {
            imageUrl = item.image.data.urls.uploaded.gallery;
          } else if (item.image?.data?.urls?.uploaded?.thumbnail) {
            imageUrl = item.image.data.urls.uploaded.thumbnail;
          } else if (item.image?.data?.uploaded?.embed) {
            imageUrl = item.image.data.uploaded.embed;
          } else if (item.image?.data?.uploaded?.gallery) {
            imageUrl = item.image.data.uploaded.gallery;
          } else if (item.image?.data?.uploaded?.thumbnail) {
            imageUrl = item.image.data.uploaded.thumbnail;
          }
          
          // Get the article URL
          const articleUrl = item.urls?.external_url || 
                            item.urls?.canonical_url || 
                            item.urls?.public_url_desktop || 
                            `https://www.livescore.com/en/news/${item.id}/`;
          
          console.log('Article URLs:', item.urls);
          
          return (
            <li key={item.id} className="flex space-x-3">
              <div className="relative h-16 w-16 flex-shrink-0 rounded overflow-hidden">
                {imageUrl ? (
                  <Image 
                    src={imageUrl} 
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="bg-gray-200 h-full w-full flex items-center justify-center">
                    <span className="text-xs text-gray-500">No image</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <a 
                  href={articleUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <h3 className="text-sm font-medium hover:text-blue-600 hover:underline line-clamp-2">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {item.subtitle}
                    </p>
                  )}
                  {!item.subtitle && item.published_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(item.published_at).toLocaleDateString()}
                    </p>
                  )}
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
} 