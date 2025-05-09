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
    <div className="border-b border-gray-200 dark:border-none dark:bg-[#222222]">
      <div className="overflow-x-auto lg:overflow-hidden no-scrollbar">
        <nav className="-mb-px flex space-x-8 min-w-full no-scrollbar" aria-label="Tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={
                pathname === tab.href
                  ? 'whitespace-nowrap border-b-[3px] pb-3 pt-4 px-1 text-sm font-medium flex-shrink-0 border-[#ff6b00] text-primary-600 dark:text-white'
                  : 'whitespace-nowrap border-b-2 pb-3 pt-4 px-1 text-sm font-medium flex-shrink-0 border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
              }
              aria-current={pathname === tab.href ? 'page' : undefined}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
} 