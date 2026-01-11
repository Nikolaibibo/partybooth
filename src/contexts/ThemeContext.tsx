import { createContext, useContext, useEffect, ReactNode } from 'react';
import { THEMES, ThemeConfig, ThemeId } from '../data/themes';

interface ThemeContextValue {
  theme: ThemeConfig;
  themeId: ThemeId;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES.default,
  themeId: 'default',
});

interface ThemeProviderProps {
  themeId?: ThemeId;
  children: ReactNode;
}

export function ThemeProvider({ themeId = 'default', children }: ThemeProviderProps) {
  const theme = THEMES[themeId] || THEMES.default;

  // Load custom fonts dynamically
  useEffect(() => {
    loadThemeFonts(theme);
  }, [theme]);

  const cssVars = {
    '--theme-bg-from': theme.colors.bgGradientFrom,
    '--theme-bg-via': theme.colors.bgGradientVia,
    '--theme-bg-to': theme.colors.bgGradientTo,
    '--theme-processing-from': theme.colors.processingGradientFrom,
    '--theme-processing-via': theme.colors.processingGradientVia,
    '--theme-processing-to': theme.colors.processingGradientTo,
    '--theme-surface-dark': theme.colors.surfaceDark,
    '--theme-surface-medium': theme.colors.surfaceMedium,
    '--theme-primary': theme.colors.primary,
    '--theme-primary-hover': theme.colors.primaryHover,
    '--theme-secondary': theme.colors.secondary,
    '--theme-text-primary': theme.colors.textPrimary,
    '--theme-text-secondary': theme.colors.textSecondary,
    '--theme-text-muted': theme.colors.textMuted,
    '--theme-success': theme.colors.success,
    '--theme-font-heading': theme.headingFont,
    '--theme-font-body': theme.bodyFont,
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value={{ theme, themeId }}>
      <div className="theme-root contents" style={cssVars}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Dynamic font loading
function loadThemeFonts(theme: ThemeConfig) {
  const fontFamilies = [theme.headingFont, theme.bodyFont];
  const uniqueFonts = [...new Set(fontFamilies)];

  // Skip default fonts (already loaded in index.html)
  const customFonts = uniqueFonts.filter((f) => !['Poppins', 'Inter'].includes(f));

  if (customFonts.length === 0) return;

  // Build Google Fonts URL
  const fontsQuery = customFonts
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700;800`)
    .join('&');
  const href = `https://fonts.googleapis.com/css2?${fontsQuery}&display=swap`;

  // Check if already loaded
  const existingLink = document.querySelector(`link[href="${href}"]`);
  if (existingLink) return;

  // Add preconnect if not present
  if (!document.querySelector('link[href="https://fonts.gstatic.com"]')) {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.gstatic.com';
    preconnect.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect);
  }

  // Add font link
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
