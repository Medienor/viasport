"use client"

import { useState, useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
}

interface MatchHighlightsProps {
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  matchStatus: string;
  maxResults?: number;
}

// Define a more specific type for YouTube API response
interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    thumbnails: {
      high?: {
        url: string;
      };
      medium: {
        url: string;
      };
    };
    publishedAt: string;
    channelTitle: string;
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

export default function MatchHighlights({ 
  homeTeam, 
  awayTeam, 
  matchDate,
  matchStatus,
  maxResults = 5 
}: MatchHighlightsProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!homeTeam || !awayTeam) return;
      
      setLoading(true);
      try {
        // Format the search query
        const searchQuery = `${homeTeam} vs ${awayTeam}`;
        const encodedQuery = encodeURIComponent(searchQuery);
        
        console.log(`Fetching videos for: ${searchQuery}, status: ${matchStatus}`);
        
        // Get videos from our API endpoint with match status
        const response = await fetch(`/api/youtube/search?q=${encodedQuery}&maxResults=${maxResults}&status=${matchStatus}`);
        
        console.log(`API response status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch videos: ${response.statusText}`);
        }
        
        const data = await response.json() as YouTubeSearchResponse;
        console.log(`API returned data:`, data);
        
        if (data.items && data.items.length > 0) {
          console.log(`Found ${data.items.length} videos`);
          const formattedVideos = data.items.map((item: YouTubeSearchItem) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium.url,
            publishedAt: item.snippet.publishedAt,
            channelTitle: item.snippet.channelTitle
          }));
          
          setVideos(formattedVideos);
        } else {
          console.log(`No videos found in API response`);
          setError("Ingen videoer funnet");
        }
      } catch (err) {
        console.error("Error fetching videos:", err);
        setError("Kunne ikke hente videoer");
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [homeTeam, awayTeam, matchDate, matchStatus, maxResults]);

  const nextVideo = () => {
    if (videos.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % videos.length);
      setIsPlaying(false);
    }
  };

  const prevVideo = () => {
    if (videos.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + videos.length) % videos.length);
      setIsPlaying(false);
    }
  };

  // Scroll the selected thumbnail into view
  useEffect(() => {
    if (thumbnailsRef.current && videos.length > 0) {
      const thumbnailElements = thumbnailsRef.current.querySelectorAll('.thumbnail-item');
      if (thumbnailElements[currentIndex]) {
        thumbnailElements[currentIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [currentIndex, videos.length]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('nb-NO', { 
      day: 'numeric', 
      month: 'short'
    }).format(date);
  };

  // Get appropriate title based on match status
  const getSectionTitle = () => {
    switch (matchStatus) {
      case 'LIVE':
        return 'Live Streaming';
      case 'FT':
      case 'AET':
      case 'PEN':
        return 'Høydepunkter';
      default:
        return 'Høydepunkter';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold">{getSectionTitle()}</h2>
        </div>
        <div className="flex justify-center items-center h-64 bg-gray-50">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div className="bg-white rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold">{getSectionTitle()}</h2>
        </div>
        <div className="flex flex-col justify-center items-center h-64 bg-gray-50 p-6">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 text-center">
            {error || `Ingen ${getSectionTitle().toLowerCase()} tilgjengelig for denne kampen ennå.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden mb-6">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-xl font-bold">{getSectionTitle()}</h2>
      </div>
      
      <div className="relative">
        {/* Video player or thumbnail preview */}
        <div className="relative aspect-video bg-black">
          {isPlaying ? (
            <iframe 
              src={`https://www.youtube.com/embed/${videos[currentIndex].id}?autoplay=1`}
              title={videos[currentIndex].title}
              className="w-full h-full"
              allowFullScreen
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
          ) : (
            <div className="relative w-full h-full cursor-pointer" onClick={() => setIsPlaying(true)}>
              <div className="relative w-full h-full">
                <Image 
                  src={videos[currentIndex].thumbnail} 
                  alt={videos[currentIndex].title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-20 transition-opacity">
                <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
                  <PlayIcon className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation arrows overlaid on video */}
          {videos.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); prevVideo(); }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-opacity"
                aria-label="Previous video"
              >
                <ChevronLeftIcon className="h-6 w-6 text-white" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); nextVideo(); }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-opacity"
                aria-label="Next video"
              >
                <ChevronRightIcon className="h-6 w-6 text-white" />
              </button>
            </>
          )}
        </div>
        
        {/* Video info */}
        <div className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2">{videos[currentIndex].title}</h3>
          <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
            <span className="font-medium">{videos[currentIndex].channelTitle}</span>
            <span>{formatDate(videos[currentIndex].publishedAt)}</span>
          </div>
        </div>
        
        {/* Thumbnails carousel */}
        {videos.length > 1 && (
          <div 
            ref={thumbnailsRef}
            className="px-4 pb-4 flex space-x-3 overflow-x-auto scrollbar-hide"
          >
            {videos.map((video, index) => (
              <div 
                key={video.id}
                className={`thumbnail-item flex-shrink-0 cursor-pointer transition-all duration-200 ${
                  index === currentIndex 
                    ? 'opacity-100 scale-105 ring-2 ring-blue-500' 
                    : 'opacity-70 hover:opacity-90'
                }`}
                style={{ width: '160px' }}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsPlaying(false);
                }}
              >
                <div className="relative aspect-video">
                  <Image 
                    src={video.thumbnail} 
                    alt={video.title}
                    fill
                    className="object-cover rounded"
                    sizes="160px"
                  />
                  {index === currentIndex && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-700 line-clamp-1">{video.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add custom scrollbar hiding styles */}
      <style jsx>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        
        /* Line clamp for multi-line text truncation */
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
} 