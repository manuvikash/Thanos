import { useTheme } from '@/contexts/ThemeContext';

export function BackgroundSphere() {
  const { currentTheme } = useTheme();
  
  // Use inverted grey colors for Ocean Light theme to match Black theme aesthetic
  const isLightTheme = currentTheme.id === 'ocean-light';
  const gradientStart = isLightTheme ? 'hsl(0, 0%, 40%)' : 'hsl(var(--primary))';
  const gradientEnd = isLightTheme ? 'hsl(0, 0%, 100%)' : 'hsl(var(--background))';
  const strokeColor = isLightTheme ? 'hsl(0, 0%, 50%)' : 'hsl(var(--primary))';

  return (
    <div 
      className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] pointer-events-none z-0 opacity-20"
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="sphereGradient" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#sphereGradient)" fillOpacity="0.3" />
        <g stroke={strokeColor} strokeWidth="0.2" opacity="0.4">
          {[...Array(12)].map((_, i) => (
            <ellipse key={`h-${i}`} cx="50" cy="50" rx={50} ry={(i * 50) / 12} fill="none" />
          ))}
          {[...Array(12)].map((_, i) => (
            <ellipse key={`v-${i}`} cx="50" cy="50" rx={(i * 50) / 12} ry={50} fill="none" />
          ))}
        </g>
      </svg>
    </div>
  );
}
