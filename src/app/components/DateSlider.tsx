"use client"

import { useState, useRef, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface DateSliderProps {
  dates: string[];
  activeDates: string[];
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
}

export default function DateSlider({ dates, activeDates, onSelectDate, selectedDate }: DateSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check if we can scroll in either direction
  const checkScrollability = () => {
    if (!sliderRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10); // 10px buffer
  };

  // Scroll the slider left or right
  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    
    const scrollAmount = 300; // Adjust as needed
    const newScrollLeft = direction === 'left' 
      ? sliderRef.current.scrollLeft - scrollAmount 
      : sliderRef.current.scrollLeft + scrollAmount;
    
    sliderRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('nb-NO', { month: 'short' });
    const weekday = date.toLocaleString('nb-NO', { weekday: 'short' });
    
    return { day, month, weekday };
  };

  // Check if a date is today
  const isToday = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    
    return date.getTime() === today.getTime();
  };

  // Set up scroll event listener
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    
    checkScrollability();
    slider.addEventListener('scroll', checkScrollability);
    window.addEventListener('resize', checkScrollability);
    
    return () => {
      slider.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, []);

  return (
    <div className="relative w-full mb-6">
      <div className="flex items-center">
        <button 
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className={`p-1 rounded-full shadow-md mr-2 ${
            canScrollLeft 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          aria-label="Scroll left"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        
        <div 
          ref={sliderRef}
          className="flex-1 overflow-x-auto scrollbar-hide flex space-x-2 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {dates.map(date => {
            const { day, month, weekday } = formatDateDisplay(date);
            const isActive = activeDates.includes(date);
            const isSelected = selectedDate === date;
            const isTodayDate = isToday(date);
            
            return (
              <button
                key={date}
                onClick={() => isActive && onSelectDate(date)}
                className={`flex-shrink-0 w-16 h-20 rounded-lg flex flex-col items-center justify-center transition-all ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                    : isActive 
                      ? 'bg-white hover:bg-gray-50 text-gray-900 shadow-sm border border-gray-200' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                } ${
                  isTodayDate && !isSelected ? 'border-2 border-blue-500' : ''
                }`}
              >
                <span className="text-xs font-medium">{weekday}</span>
                <span className="text-xl font-bold">{day}</span>
                <span className="text-xs">{month}</span>
                {isTodayDate && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-500'}`}></div>
                )}
              </button>
            );
          })}
        </div>
        
        <button 
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={`p-1 rounded-full shadow-md ml-2 ${
            canScrollRight 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          aria-label="Scroll right"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
} 