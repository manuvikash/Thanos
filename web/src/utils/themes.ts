/**
 * Theme configuration for Thanos Admin Portal
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  cssClass: string;
}

export const themes: Theme[] = [
  {
    id: 'slate-dark',
    name: 'Midnight',
    description: 'Pure black theme with minimal colors',
    cssClass: 'theme-slate-dark',
  },
  {
    id: 'ocean-light',
    name: 'Ocean Light',
    description: 'Clean light theme with ocean blue accents',
    cssClass: 'theme-ocean-light',
  },
  {
    id: 'teal-dark',
    name: 'Teal Dark',
    description: 'Original teal theme with dark background',
    cssClass: 'theme-teal-dark',
  },
];

export const defaultTheme = themes[0]; // Midnight as default

/**
 * Theme CSS Variables Definition
 */
export const themeVariables = {
  'teal-dark': {
    '--background': '180 100% 3.5%',
    '--foreground': '180 5% 98%',
    '--card': '180 50% 6%',
    '--card-foreground': '180 5% 98%',
    '--popover': '180 50% 6%',
    '--popover-foreground': '180 5% 98%',
    '--primary': '189 100% 50%',
    '--primary-foreground': '180 100% 3.5%',
    '--secondary': '180 30% 15%',
    '--secondary-foreground': '180 5% 98%',
    '--muted': '180 30% 12%',
    '--muted-foreground': '180 10% 60%',
    '--accent': '189 100% 50%',
    '--accent-foreground': '180 100% 3.5%',
    '--destructive': '0 84% 60%',
    '--destructive-foreground': '0 0% 98%',
    '--border': '180 30% 18%',
    '--input': '180 30% 18%',
    '--ring': '189 100% 50%',
    '--chart-1': '0 84% 60%',
    '--chart-2': '25 95% 53%',
    '--chart-3': '48 96% 53%',
    '--chart-4': '210 100% 60%',
    '--chart-5': '189 100% 50%',
    '--sidebar-background': '180 50% 6%',
    '--sidebar-foreground': '180 10% 85%',
    '--sidebar-primary': '189 100% 50%',
    '--sidebar-primary-foreground': '180 100% 3.5%',
    '--sidebar-accent': '180 30% 12%',
    '--sidebar-accent-foreground': '189 100% 50%',
    '--sidebar-border': '180 30% 18%',
    '--sidebar-ring': '189 100% 50%',
  },
  'slate-dark': {
    '--background': '0 0% 0%',
    '--foreground': '0 0% 95%',
    '--card': '0 0% 4%',
    '--card-foreground': '0 0% 95%',
    '--popover': '0 0% 4%',
    '--popover-foreground': '0 0% 95%',
    '--primary': '0 0% 90%',
    '--primary-foreground': '0 0% 0%',
    '--secondary': '0 0% 10%',
    '--secondary-foreground': '0 0% 95%',
    '--muted': '0 0% 8%',
    '--muted-foreground': '0 0% 60%',
    '--accent': '0 0% 90%',
    '--accent-foreground': '0 0% 0%',
    '--destructive': '0 84% 60%',
    '--destructive-foreground': '0 0% 95%',
    '--border': '0 0% 15%',
    '--input': '0 0% 15%',
    '--ring': '0 0% 90%',
    '--chart-1': '0 84% 60%',
    '--chart-2': '25 95% 53%',
    '--chart-3': '48 96% 53%',
    '--chart-4': '120 60% 50%',
    '--chart-5': '280 60% 60%',
    '--sidebar-background': '0 0% 4%',
    '--sidebar-foreground': '0 0% 85%',
    '--sidebar-primary': '0 0% 90%',
    '--sidebar-primary-foreground': '0 0% 0%',
    '--sidebar-accent': '0 0% 8%',
    '--sidebar-accent-foreground': '0 0% 90%',
    '--sidebar-border': '0 0% 15%',
    '--sidebar-ring': '0 0% 90%',
  },
  'ocean-light': {
    '--background': '0 0% 100%',
    '--foreground': '222 47% 11%',
    '--card': '0 0% 100%',
    '--card-foreground': '222 47% 11%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '222 47% 11%',
    '--primary': '199 89% 48%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '210 40% 96%',
    '--secondary-foreground': '222 47% 11%',
    '--muted': '210 40% 96%',
    '--muted-foreground': '215 16% 47%',
    '--accent': '199 89% 48%',
    '--accent-foreground': '0 0% 100%',
    '--destructive': '0 84% 60%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '214 32% 91%',
    '--input': '214 32% 91%',
    '--ring': '199 89% 48%',
    '--chart-1': '0 84% 60%',
    '--chart-2': '25 95% 53%',
    '--chart-3': '48 96% 53%',
    '--chart-4': '173 58% 39%',
    '--chart-5': '199 89% 48%',
    '--sidebar-background': '0 0% 98%',
    '--sidebar-foreground': '222 47% 11%',
    '--sidebar-primary': '199 89% 48%',
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': '210 40% 96%',
    '--sidebar-accent-foreground': '199 89% 48%',
    '--sidebar-border': '214 32% 91%',
    '--sidebar-ring': '199 89% 48%',
  },
} as const;

export type ThemeId = keyof typeof themeVariables;
