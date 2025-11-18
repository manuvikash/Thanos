import React from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface SidebarParentItemProps {
  icon: React.ReactNode;
  label: string;
  isExpanded: boolean;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

export const SidebarParentItem: React.FC<SidebarParentItemProps> = ({
  icon,
  label,
  isExpanded,
  isActive,
  isCollapsed,
  onClick,
}) => {
  const handleClick = () => {
    onClick();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={isCollapsed ? label : undefined}
      aria-label={label}
      aria-expanded={isExpanded}
      tabIndex={0}
      className={`
        w-full flex items-center gap-3 px-4 py-3
        transition-all duration-200
        focus:outline-2 focus:outline-cyan-500 focus:outline-offset-[-2px] focus:outline
        ${
          isActive
            ? 'bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400'
            : 'text-neutral-400 border-l-2 border-transparent hover:bg-neutral-800/50 hover:text-neutral-100'
        }
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!isCollapsed && (
        <>
          <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">
            {label}
          </span>
          <span
            className={`
              transition-transform duration-200 flex-shrink-0
              ${isExpanded ? 'rotate-180' : 'rotate-0'}
            `}
          >
            <ChevronDownIcon />
          </span>
        </>
      )}
    </button>
  );
};
