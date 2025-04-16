'use client'; // Add this directive for client-side interactivity

import React, { useState } from 'react';

interface FollowButtonProps {
  // Add any props you might need later, e.g., matchId, userId
}

const FollowButton: React.FC<FollowButtonProps> = (props) => {
  const [isFollowing, setIsFollowing] = useState(false);

  const handleClick = () => {
    // Here you would typically add logic to update the follow status
    // in your backend or state management system.
    // For now, we just toggle the local state.
    setIsFollowing(!isFollowing);
  };

  return (
    <button
      onClick={handleClick}
      className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' // Styles for "Følger"
          : 'bg-black text-white hover:bg-gray-800' // Styles for "Følg"
      }`}
    >
      {isFollowing ? 'Følger' : 'Følg'}
    </button>
  );
};

export default FollowButton;