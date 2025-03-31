export function formatMatchDateTime(dateString: string) {
  const date = new Date(dateString);
  
  const dayName = date.toLocaleDateString('no-NO', { weekday: 'long' });
  const fullDate = date.toLocaleDateString('no-NO', { 
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const time = date.toLocaleTimeString('no-NO', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  return {
    dayName,
    fullDate,
    time,
    date: date.toLocaleDateString('no-NO', { 
      day: 'numeric', 
      month: 'short'
    })
  };
} 