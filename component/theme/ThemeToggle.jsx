'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent server/client hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative p-2 w-10 h-10 rounded-full border border-gray-300 dark:border-[#3a3d45] bg-gray-50 dark:bg-[#1e222d] text-gray-800 dark:text-[#f2e9de] overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-[#c1552c] focus:outline-none flex items-center justify-center"
      aria-label="Toggle Dark Mode"
    >
      {/* Sun Icon (Light Mode) */}
      <div className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ${theme === 'dark' ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      </div>

      {/* Moon Icon (Dark Mode) */}
      <div className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ${theme === 'dark' ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      </div>
    </button>
  );
}