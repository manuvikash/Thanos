import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarItem } from './SidebarItem';
import { SidebarParentItem } from './SidebarParentItem';
import { DashboardIcon } from './icons/DashboardIcon';
import { TableIcon } from './icons/TableIcon';
import { ROUTES, isDashboardRoute } from '../routes';

interface SidebarProps {
  isCollapsed?: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  children?: NavigationItem[];
  isCollapsible?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    isCollapsible: true,
    children: [
      {
        id: 'overview-metrics',
        label: 'Overview Metrics',
        icon: <DashboardIcon />,
        path: ROUTES.DASHBOARD.OVERVIEW_METRICS,
      },
      {
        id: 'severity-distribution',
        label: 'Severity Distribution',
        icon: <DashboardIcon />,
        path: ROUTES.DASHBOARD.SEVERITY_DISTRIBUTION,
      },
      {
        id: 'top-failing-rules',
        label: 'Top Failing Rules',
        icon: <DashboardIcon />,
        path: ROUTES.DASHBOARD.TOP_FAILING_RULES,
      },
      {
        id: 'findings-timeline',
        label: 'Findings Timeline',
        icon: <DashboardIcon />,
        path: ROUTES.DASHBOARD.FINDINGS_TIMELINE,
      },
    ],
  },
  {
    id: 'findings',
    label: 'Findings Table',
    icon: <TableIcon />,
    path: ROUTES.FINDINGS,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed: isCollapsedProp,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(isCollapsedProp ?? false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Restore expansion state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-expanded-items');
    if (savedState) {
      try {
        setExpandedItems(JSON.parse(savedState));
      } catch (e) {
        console.error('Failed to parse sidebar expansion state:', e);
      }
    }
  }, []);

  // Auto-expand Dashboard parent if navigating to a dashboard child route
  useEffect(() => {
    if (isDashboardRoute(location.pathname)) {
      setExpandedItems((prev) => {
        const newState = { ...prev, dashboard: true };
        localStorage.setItem('sidebar-expanded-items', JSON.stringify(newState));
        return newState;
      });
    }
  }, [location.pathname]);

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

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleToggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const newState = { ...prev, [itemId]: !prev[itemId] };
      localStorage.setItem('sidebar-expanded-items', JSON.stringify(newState));
      return newState;
    });
  };

  const isItemActive = (item: NavigationItem): boolean => {
    if (item.children) {
      // Parent is active if any child is active
      return item.children.some((child) => location.pathname === child.path);
    }
    return location.pathname === item.path;
  };

  return (
    <nav
      role="navigation"
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
          <React.Fragment key={item.id}>
            {item.isCollapsible && item.children ? (
              <>
                <SidebarParentItem
                  icon={item.icon}
                  label={item.label}
                  isExpanded={expandedItems[item.id] ?? false}
                  isActive={isItemActive(item)}
                  isCollapsed={isCollapsed}
                  onClick={() => handleToggleExpand(item.id)}
                />
                {expandedItems[item.id] && !isCollapsed && (
                  <div className="transition-all duration-200 overflow-hidden">
                    {item.children.map((child) => (
                      <SidebarItem
                        key={child.id}
                        icon={child.icon}
                        label={child.label}
                        view={child.path}
                        isActive={location.pathname === child.path}
                        isCollapsed={isCollapsed}
                        isChild={true}
                        onClick={handleNavigate}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <SidebarItem
                icon={item.icon}
                label={item.label}
                view={item.path}
                isActive={location.pathname === item.path}
                isCollapsed={isCollapsed}
                onClick={handleNavigate}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};
