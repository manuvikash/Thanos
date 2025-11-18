import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="px-6 md:px-12 lg:px-24 py-6">
      <nav className="flex items-center justify-between max-w-7xl mx-auto" aria-label="Main navigation">
        <div className="text-xl font-mono-custom text-neutral-100 tracking-wide">
          Thanos
        </div>
      </nav>
    </header>
  );
};
