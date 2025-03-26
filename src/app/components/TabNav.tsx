'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  name: string;
  href: string;
}

export default function TabNav({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200">
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto lg:overflow-hidden no-scrollbar">
        <nav 
          className="-mb-px flex space-x-8 min-w-full no-scrollbar" 
          aria-label="Tabs"
        >
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex-shrink-0 ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
} 