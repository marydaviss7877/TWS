/**
 * Theme Configuration System
 * Defines predefined themes and provides utilities for theme management
 */

// Predefined themes with color palettes
export const PREDEFINED_THEMES = {
  default: {
    name: 'Default',
    colors: {
      primary: '#6366F1',
      secondary: '#10B981',
      accent: '#A855F7'
    },
    description: 'The default Wolfstack theme'
  },
  light: {
    name: 'Light',
    colors: {
      primary: '#3B82F6',
      secondary: '#059669',
      accent: '#8B5CF6'
    },
    description: 'Bright and professional'
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#818CF8',
      secondary: '#34D399',
      accent: '#C084FC'
    },
    description: 'Modern dark theme'
  },
  blue: {
    name: 'Ocean Blue',
    colors: {
      primary: '#2563EB',
      secondary: '#0284C7',
      accent: '#0EA5E9'
    },
    description: 'Calm and professional'
  },
  green: {
    name: 'Forest Green',
    colors: {
      primary: '#059669',
      secondary: '#10B981',
      accent: '#34D399'
    },
    description: 'Natural and fresh'
  },
  purple: {
    name: 'Royal Purple',
    colors: {
      primary: '#7C3AED',
      secondary: '#9333EA',
      accent: '#A855F7'
    },
    description: 'Elegant and sophisticated'
  },
  orange: {
    name: 'Sunset Orange',
    colors: {
      primary: '#EA580C',
      secondary: '#F97316',
      accent: '#FB923C'
    },
    description: 'Warm and energetic'
  },
  red: {
    name: 'Crimson Red',
    colors: {
      primary: '#DC2626',
      secondary: '#EF4444',
      accent: '#F87171'
    },
    description: 'Bold and vibrant'
  }
};

// Default theme — the fixed HousesBase brand. There is no per-tenant color
// customization; every tenant renders these colors.
export const DEFAULT_THEME = {
  name: 'default',
  colors: {
    primary: '#103D67',
    secondary: '#10B981',
    accent: '#F04E25'
  }
};

/**
 * Convert hex color to RGB
 */
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Convert RGB to hex
 */
export const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

/**
 * Lighten or darken a color
 */
export const adjustColorBrightness = (hex, percent) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const r = Math.min(255, Math.max(0, Math.round(rgb.r + (rgb.r * percent / 100))));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g + (rgb.g * percent / 100))));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b + (rgb.b * percent / 100))));
  
  return rgbToHex(r, g, b);
};

/**
 * Generate color shades (50-950) from a base color
 * This creates a palette similar to Tailwind's color system
 */
export const generateColorShades = (baseColor) => {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return {};
  
  const shades = {};
  const shadeValues = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  
  shadeValues.forEach((shade) => {
    let factor;
    if (shade <= 500) {
      // Lighter shades
      factor = (500 - shade) / 500 * 0.8; // 0 to 0.8
      shades[shade] = rgbToHex(
        Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor)),
        Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor)),
        Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor))
      );
    } else {
      // Darker shades
      factor = (shade - 500) / 450 * 0.7; // 0 to 0.7
      shades[shade] = rgbToHex(
        Math.max(0, Math.round(rgb.r * (1 - factor))),
        Math.max(0, Math.round(rgb.g * (1 - factor))),
        Math.max(0, Math.round(rgb.b * (1 - factor)))
      );
    }
  });
  
  return shades;
};

/**
 * Get theme by name
 */
export const getThemeByName = (name) => {
  return PREDEFINED_THEMES[name] || PREDEFINED_THEMES.default;
};

/**
 * Validate color hex format
 */
export const isValidColor = (color) => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};
