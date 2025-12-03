import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { ROUTES } from '@/routes';
import { Button } from '@/components/ui/button';

export const RegistrationHeader: React.FC = () => {
  return (
    <header className="px-6 md:px-12 lg:px-24 py-6">
      <nav className="flex items-center justify-between max-w-7xl mx-auto" aria-label="Main navigation">
        <Link to={ROUTES.ROOT} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Shield className="h-8 w-8 text-cyan-400" />
          <span className="text-xl font-mono-custom text-foreground tracking-wide">
            Thanos
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to={ROUTES.DASHBOARD}>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Button>
          </Link>
          <Link to="/login">
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
              Sign In
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
};
