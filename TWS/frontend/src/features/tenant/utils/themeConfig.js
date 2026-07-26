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

// Available fonts - Comprehensive list of modern, popular fonts
export const AVAILABLE_FONTS = {
  heading: [
    { value: 'Geist', label: 'Geist', description: 'Modern sans-serif' },
    { value: 'Inter', label: 'Inter', description: 'Clean and readable' },
    { value: 'Space Grotesk', label: 'Space Grotesk', description: 'Geometric and bold' },
    { value: 'Poppins', label: 'Poppins', description: 'Geometric sans-serif' },
    { value: 'Montserrat', label: 'Montserrat', description: 'Elegant and modern' },
    { value: 'Roboto', label: 'Roboto', description: 'Google\'s signature font' },
    { value: 'Open Sans', label: 'Open Sans', description: 'Humanist sans-serif' },
    { value: 'Lato', label: 'Lato', description: 'Warm and friendly' },
    { value: 'Raleway', label: 'Raleway', description: 'Elegant and sophisticated' },
    { value: 'Nunito', label: 'Nunito', description: 'Rounded and friendly' },
    { value: 'Playfair Display', label: 'Playfair Display', description: 'Elegant serif' },
    { value: 'Merriweather', label: 'Merriweather', description: 'Readable serif' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro', description: 'Adobe\'s sans-serif' },
    { value: 'Ubuntu', label: 'Ubuntu', description: 'Humanist sans-serif' },
    { value: 'Oswald', label: 'Oswald', description: 'Condensed sans-serif' },
    { value: 'Lora', label: 'Lora', description: 'Well-balanced serif' },
    { value: 'Crimson Text', label: 'Crimson Text', description: 'Book serif' },
    { value: 'Work Sans', label: 'Work Sans', description: 'Professional sans-serif' },
    { value: 'Fira Sans', label: 'Fira Sans', description: 'Mozilla\'s font' },
    { value: 'DM Sans', label: 'DM Sans', description: 'Low-contrast sans-serif' },
    { value: 'Manrope', label: 'Manrope', description: 'Open-source sans-serif' },
    { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', description: 'Modern Indonesian font' },
    { value: 'Outfit', label: 'Outfit', description: 'Geometric sans-serif' },
    { value: 'Sora', label: 'Sora', description: 'Minimalist sans-serif' },
    { value: 'Epilogue', label: 'Epilogue', description: 'Versatile sans-serif' },
    { value: 'Bricolage Grotesque', label: 'Bricolage Grotesque', description: 'Contemporary sans-serif' },
    { value: 'Figtree', label: 'Figtree', description: 'Friendly sans-serif' },
    { value: 'Cabinet Grotesk', label: 'Cabinet Grotesk', description: 'Geometric sans-serif' },
    { value: 'Satoshi', label: 'Satoshi', description: 'Neo-grotesque sans-serif' },
    { value: 'Clash Display', label: 'Clash Display', description: 'Bold display font' },
    { value: 'Syne', label: 'Syne', description: 'Experimental sans-serif' }
  ],
  body: [
    { value: 'Inter', label: 'Inter', description: 'Clean and readable' },
    { value: 'Geist', label: 'Geist', description: 'Modern sans-serif' },
    { value: 'JetBrains Mono', label: 'JetBrains Mono', description: 'Monospace font' },
    { value: 'Poppins', label: 'Poppins', description: 'Geometric sans-serif' },
    { value: 'Roboto', label: 'Roboto', description: 'Google\'s signature font' },
    { value: 'Open Sans', label: 'Open Sans', description: 'Humanist sans-serif' },
    { value: 'Lato', label: 'Lato', description: 'Warm and friendly' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro', description: 'Adobe\'s sans-serif' },
    { value: 'Nunito', label: 'Nunito', description: 'Rounded and friendly' },
    { value: 'Merriweather', label: 'Merriweather', description: 'Readable serif' },
    { value: 'Lora', label: 'Lora', description: 'Well-balanced serif' },
    { value: 'Crimson Text', label: 'Crimson Text', description: 'Book serif' },
    { value: 'Work Sans', label: 'Work Sans', description: 'Professional sans-serif' },
    { value: 'Fira Sans', label: 'Fira Sans', description: 'Mozilla\'s font' },
    { value: 'DM Sans', label: 'DM Sans', description: 'Low-contrast sans-serif' },
    { value: 'Manrope', label: 'Manrope', description: 'Open-source sans-serif' },
    { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', description: 'Modern Indonesian font' },
    { value: 'Outfit', label: 'Outfit', description: 'Geometric sans-serif' },
    { value: 'Sora', label: 'Sora', description: 'Minimalist sans-serif' },
    { value: 'Epilogue', label: 'Epilogue', description: 'Versatile sans-serif' },
    { value: 'Figtree', label: 'Figtree', description: 'Friendly sans-serif' },
    { value: 'IBM Plex Sans', label: 'IBM Plex Sans', description: 'Corporate sans-serif' },
    { value: 'Atkinson Hyperlegible', label: 'Atkinson Hyperlegible', description: 'Accessibility-focused' },
    { value: 'Noto Sans', label: 'Noto Sans', description: 'Universal font' },
    { value: 'Rubik', label: 'Rubik', description: 'Rounded sans-serif' },
    { value: 'Quicksand', label: 'Quicksand', description: 'Rounded geometric' },
    { value: 'Comfortaa', label: 'Comfortaa', description: 'Rounded sans-serif' },
    { value: 'Mulish', label: 'Mulish', description: 'Versatile sans-serif' },
    { value: 'Red Hat Display', label: 'Red Hat Display', description: 'Professional sans-serif' },
    { value: 'Public Sans', label: 'Public Sans', description: 'US Web Design System font' }
  ]
};

// Fonts self-hosted as variable fonts in src/assets/fonts.css (imported once, globally) —
// never fetch these over the network, they're already loaded.
const SELF_HOSTED_FONTS = new Set([
  'Inter', 'Geist', 'JetBrains Mono', 'DM Sans', 'Sora', 'Space Grotesk',
]);

// Query params for the remaining picker fonts, lazy-loaded one at a time only when a
// tenant actually selects them — matches the weights previously blanket-loaded upfront.
const GOOGLE_FONT_PARAMS = {
  'Poppins': 'wght@100;200;300;400;500;600;700;800;900',
  'Montserrat': 'wght@100;200;300;400;500;600;700;800;900',
  'Roboto': 'wght@100;300;400;500;700;900',
  'Open Sans': 'wght@300;400;500;600;700;800',
  'Lato': 'wght@100;300;400;700;900',
  'Raleway': 'wght@100;200;300;400;500;600;700;800;900',
  'Nunito': 'wght@200;300;400;500;600;700;800;900',
  'Source Sans Pro': 'wght@200;300;400;600;700;900',
  'Ubuntu': 'wght@300;400;500;700',
  'Oswald': 'wght@200;300;400;500;600;700',
  'Work Sans': 'wght@100;200;300;400;500;600;700;800;900',
  'Fira Sans': 'wght@100;200;300;400;500;600;700;800;900',
  'Manrope': 'wght@200;300;400;500;600;700;800',
  'Plus Jakarta Sans': 'wght@200;300;400;500;600;700;800',
  'Outfit': 'wght@100;200;300;400;500;600;700;800;900',
  'Epilogue': 'wght@100;200;300;400;500;600;700;800;900',
  'Bricolage Grotesque': 'wght@200;300;400;500;600;700;800',
  'Figtree': 'wght@300;400;500;600;700;800;900',
  'Syne': 'wght@400;500;600;700;800',
  'IBM Plex Sans': 'wght@100;200;300;400;500;600;700',
  'Atkinson Hyperlegible': 'wght@400;700',
  'Noto Sans': 'wght@100;200;300;400;500;600;700;800;900',
  'Rubik': 'wght@300;400;500;600;700;800;900',
  'Quicksand': 'wght@300;400;500;600;700',
  'Comfortaa': 'wght@300;400;500;600;700',
  'Mulish': 'wght@200;300;400;500;600;700;800;900',
  'Red Hat Display': 'wght@300;400;500;600;700;800;900',
  'Public Sans': 'wght@100;200;300;400;500;600;700;800;900',
  'Playfair Display': 'wght@400;500;600;700;800;900',
  'Merriweather': 'wght@300;400;700;900',
  'Lora': 'wght@400;500;600;700',
  'Crimson Text': 'wght@400;600;700',
};

// The 3 Fontshare (non-Google) picker fonts, same lazy-load treatment.
const FONTSHARE_SLUGS = {
  'Cabinet Grotesk': 'cabinet-grotesk@100,200,300,400,500,600,700,800,900',
  'Satoshi': 'satoshi@300,400,500,700,900',
  'Clash Display': 'clash-display@200,300,400,500,600,700',
};

/**
 * Lazy-loads a single picker font by injecting one <link> tag, the first time it's ever
 * needed (self-hosted fonts and already-injected fonts are no-ops). Replaces the old
 * approach of blanket `@import`-ing all ~35 picker fonts on every single page load.
 */
export const loadFontOnDemand = (fontFamily) => {
  if (typeof document === 'undefined' || !fontFamily || SELF_HOSTED_FONTS.has(fontFamily)) return;

  const id = `tenant-font-${fontFamily.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;

  let href = null;
  if (GOOGLE_FONT_PARAMS[fontFamily]) {
    href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, '+')}:${GOOGLE_FONT_PARAMS[fontFamily]}&display=swap`;
  } else if (FONTSHARE_SLUGS[fontFamily]) {
    href = `https://api.fontshare.com/v2/css?f[]=${FONTSHARE_SLUGS[fontFamily]}&display=swap`;
  }
  if (!href) return; // Unknown font name — nothing to load.

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
};

// Default theme
export const DEFAULT_THEME = {
  name: 'default',
  colors: {
    primary: '#6366F1',
    secondary: '#10B981',
    accent: '#A855F7'
  },
  fonts: {
    heading: 'Geist',
    body: 'Inter'
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
