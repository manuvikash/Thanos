import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { signOut } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes';

export const Header: React.FC = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate(ROUTES.ROOT);
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

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
          <Button
            variant="ghost"
            onClick={handleSignOut}
            title="Sign Out"
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </nav>
    </header>
  );
};
