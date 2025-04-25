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
      <div className="overflow-x-auto lg:overflow-hidden no-scrollbar">
        <nav className="-mb-px flex space-x-8 min-w-full no-scrollbar" aria-label="Tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={
                pathname === tab.href
                  ? 'whitespace-nowrap border-b-[3px] pb-3 pt-4 px-1 text-sm font-medium flex-shrink-0 border-[#171717] text-primary-600'
                  : 'whitespace-nowrap border-b-2 pb-3 pt-4 px-1 text-sm font-medium flex-shrink-0 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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