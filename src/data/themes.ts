export type ThemeId = 'default' | 'elegant' | 'neon' | 'corporate' | 'festive';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  headingFont: string;
  bodyFont: string;
  colors: {
    bgGradientFrom: string;
    bgGradientVia: string;
    bgGradientTo: string;
    processingGradientFrom: string;
    processingGradientVia: string;
    processingGradientTo: string;
    surfaceDark: string;
    surfaceMedium: string;
    primary: string;
    primaryHover: string;
    secondary: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    success: string;
  };
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Modern purple-pink gradient',
    headingFont: 'Poppins',
    bodyFont: 'Inter',
    colors: {
      bgGradientFrom: '#6366f1',     // indigo-500
      bgGradientVia: '#9333ea',      // purple-600
      bgGradientTo: '#ec4899',       // pink-500
      processingGradientFrom: '#581c87', // purple-900
      processingGradientVia: '#312e81',  // indigo-900
      processingGradientTo: '#1e3a8a',   // blue-900
      surfaceDark: '#111827',        // gray-900
      surfaceMedium: '#1f2937',      // gray-800
      primary: '#9333ea',            // purple-600
      primaryHover: '#7e22ce',       // purple-700
      secondary: '#ec4899',          // pink-500
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.9)',
      textMuted: 'rgba(255,255,255,0.7)',
      success: '#22c55e',            // green-500
    },
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant',
    description: 'Rose gold and cream for weddings',
    headingFont: 'Playfair Display',
    bodyFont: 'Lato',
    colors: {
      bgGradientFrom: '#be9b7b',     // rose gold
      bgGradientVia: '#d4b896',      // champagne
      bgGradientTo: '#f5e6d3',       // cream
      processingGradientFrom: '#4a3728', // dark brown
      processingGradientVia: '#5d4037',  // warm brown
      processingGradientTo: '#6d5c4e',   // medium brown
      surfaceDark: '#2c2420',
      surfaceMedium: '#3d342e',
      primary: '#be9b7b',            // rose gold
      primaryHover: '#a88968',
      secondary: '#d4af37',          // gold accent
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.9)',
      textMuted: 'rgba(255,255,255,0.7)',
      success: '#86efac',
    },
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    description: 'Electric colors for parties',
    headingFont: 'Orbitron',
    bodyFont: 'Exo 2',
    colors: {
      bgGradientFrom: '#0f0f0f',     // near black
      bgGradientVia: '#1a0a2e',      // dark purple
      bgGradientTo: '#16213e',       // dark blue
      processingGradientFrom: '#0f0f0f',
      processingGradientVia: '#1a0a2e',
      processingGradientTo: '#0f172a',
      surfaceDark: '#0a0a0a',
      surfaceMedium: '#141414',
      primary: '#ff1493',            // hot pink
      primaryHover: '#ff69b4',
      secondary: '#00ffff',          // cyan
      textPrimary: '#ffffff',
      textSecondary: '#ff1493',
      textMuted: '#00ffff',
      success: '#39ff14',            // neon green
    },
  },
  corporate: {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional navy and gold',
    headingFont: 'Montserrat',
    bodyFont: 'Source Sans 3',
    colors: {
      bgGradientFrom: '#1e3a5f',     // navy
      bgGradientVia: '#1e4976',      // medium navy
      bgGradientTo: '#2563eb',       // blue
      processingGradientFrom: '#0f172a',
      processingGradientVia: '#1e293b',
      processingGradientTo: '#1e3a5f',
      surfaceDark: '#0f172a',        // slate-900
      surfaceMedium: '#1e293b',      // slate-800
      primary: '#2563eb',            // blue-600
      primaryHover: '#1d4ed8',       // blue-700
      secondary: '#d4af37',          // gold
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.95)',
      textMuted: 'rgba(255,255,255,0.75)',
      success: '#22c55e',
    },
  },
  festive: {
    id: 'festive',
    name: 'Festive',
    description: 'Holiday red, gold, and emerald',
    headingFont: 'Quicksand',
    bodyFont: 'Nunito',
    colors: {
      bgGradientFrom: '#991b1b',     // deep red
      bgGradientVia: '#b91c1c',      // red
      bgGradientTo: '#dc2626',       // bright red
      processingGradientFrom: '#14532d', // emerald-900
      processingGradientVia: '#166534',  // emerald-800
      processingGradientTo: '#15803d',   // emerald-700
      surfaceDark: '#1c1917',        // stone-900
      surfaceMedium: '#292524',      // stone-800
      primary: '#dc2626',            // red-600
      primaryHover: '#b91c1c',       // red-700
      secondary: '#fbbf24',          // amber-400 (gold)
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.9)',
      textMuted: 'rgba(255,255,255,0.7)',
      success: '#4ade80',
    },
  },
};

export const THEME_OPTIONS = Object.values(THEMES);
