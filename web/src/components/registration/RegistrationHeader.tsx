import React from 'react';
import { ThemeSelector } from '../ThemeSelector';

export const RegistrationHeader: React.FC = () => {
  return (
    <header className="px-6 md:px-12 lg:px-24 py-6">
      <nav className="flex items-center justify-between max-w-7xl mx-auto" aria-label="Main navigation">
        <div className="text-xl font-mono-custom text-foreground tracking-wide">
          Thanos
        </div>
        <ThemeSelector />
      </nav>
    </header>
  );
};
