'use client';

import { useState, useEffect } from 'react';
import EliteserienVideos from './EliteserienVideos';

export default function EliteserienVideosWrapper() {
  const [hasVideos, setHasVideos] = useState<boolean | null>(null);
  
  // This effect will run after EliteserienVideos mounts and renders
  useEffect(() => {
    // Check if the EliteserienVideos component rendered anything
    const checkVideosRendered = () => {
      // Give a small delay to ensure EliteserienVideos has had time to render
      setTimeout(() => {
        const videosElement = document.getElementById('eliteserien-videos-container');
        setHasVideos(!!videosElement && videosElement.children.length > 0);
      }, 100);
    };
    
    checkVideosRendered();
  }, []);
  
  // Don't render anything until we know if there are videos
  if (hasVideos === null) return null;
  
  // If no videos, don't render the container
  if (hasVideos === false) return null;
  
  return (
    <div className="bg-white dark:bg-[#181818] shadow-sm rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Høydepunkter fra Eliteserien</h2>
      <div id="eliteserien-videos-container">
        <EliteserienVideos />
      </div>
    </div>
  );
} 