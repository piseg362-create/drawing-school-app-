"use client"
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../../component/theme/theme-provider';
import { Toaster } from "@/components/ui/sonner"
import { DemoBanner } from '../components/demo-banner';
import '../lib/i18n'; // Initialize i18n globally

// Primary font for dashboard UI
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

// Secondary font for headings
const poppins = Poppins({ 
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function RootLayout({
  children,
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    // suppressHydrationWarning is strictly required on the html tag for next-themes
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased bg-background text-foreground flex flex-col min-h-screen`}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
             <Toaster />
             <DemoBanner />
             <main className="flex-1 overflow-auto">
               {children}
             </main>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}