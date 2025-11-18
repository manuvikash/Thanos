import React from 'react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  view: string;
  isActive: boolean;
  isCollapsed: boolean;
  isChild?: boolean;
  onClick: (view: string) => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  view,
  isActive,
  isCollapsed,
  isChild = false,
  onClick,
}) => {
  const handleClick = () => {
    onClick(view);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(view);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={isCollapsed ? label : undefined}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      tabIndex={0}
      className={`
        w-full flex items-center gap-3 py-3
        transition-all duration-200
        focus:outline-2 focus:outline-cyan-500 focus:outline-offset-[-2px] focus:outline
        ${isChild && !isCollapsed ? 'pl-12 pr-4' : 'px-4'}
        ${
          isActive
            ? 'bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400'
            : 'text-neutral-400 border-l-2 border-transparent hover:bg-neutral-800/50 hover:text-neutral-100'
        }
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!isCollapsed && (
        <span className="text-sm font-medium whitespace-nowrap">{label}</span>
      )}
    </button>
  );
};
