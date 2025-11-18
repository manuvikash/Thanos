import React, { useState, useEffect } from 'react';
import { SidebarItem } from './SidebarItem';
import { DashboardIcon } from './icons/DashboardIcon';
import { TableIcon } from './icons/TableIcon';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isCollapsed?: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  view: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Overview',
    icon: <DashboardIcon />,
    view: 'dashboard',
  },
  {
    id: 'findings',
    label: 'Findings Table',
    icon: <TableIcon />,
    view: 'findings',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isCollapsed: isCollapsedProp,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(isCollapsedProp ?? false);

  useEffect(() => {
    // Function to check viewport width and update collapsed state
    const handleResize = () => {
      const viewportWidth = window.innerWidth;
      if (viewportWidth < 768) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    // Set initial state based on current viewport width
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Clean up resize listener on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update internal state when prop changes
  useEffect(() => {
    if (isCollapsedProp !== undefined) {
      setIsCollapsed(isCollapsedProp);
    }
  }, [isCollapsedProp]);

  return (
    <nav
      aria-label="Main navigation"
      className={`
        fixed left-0 top-0 h-screen z-50
        bg-[#102020]/80 backdrop-blur-sm border-r border-neutral-800
        transition-all duration-200
        ${isCollapsed ? 'w-16' : 'w-60'}
      `}
    >
      <div className="flex flex-col h-full pt-20">
        {navigationItems.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            view={item.view}
            isActive={currentView === item.view}
            isCollapsed={isCollapsed}
            onClick={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
};
