import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeSelector } from '@/components/ThemeSelector';

export const Header: React.FC = () => {
  return (
    <header className="px-6 md:px-12 lg:px-24 py-6">
      <nav className="flex items-center justify-between max-w-7xl mx-auto" aria-label="Main navigation">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div className="text-xl font-mono-custom text-foreground tracking-wide">
            Thanos
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeSelector />
        </div>
      </nav>
    </header>
  );
};
