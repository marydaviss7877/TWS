/**
 * Hook to get theme-aware styles for components
 * Returns actual color values (not CSS variables) for use in inline styles
 */
import { useTenantTheme } from '../providers/TenantThemeProvider';
import { generateColorShades } from './themeConfig';

export const useThemeStyles = () => {
  const { theme } = useTenantTheme();

  // Get actual color values from theme (not CSS variables)
  const getPrimaryColor = (shade = 500) => {
    const baseColor = theme?.customColors?.primary || theme?.colors?.primary || '#6366F1';
    if (shade === 500) return baseColor;
    const shades = generateColorShades(baseColor);
    return shades[shade] || baseColor;
  };

  const getSecondaryColor = (shade = 500) => {
    const baseColor = theme?.customColors?.secondary || theme?.colors?.secondary || '#10B981';
    if (shade === 500) return baseColor;
    const shades = generateColorShades(baseColor);
    return shades[shade] || baseColor;
  };

  const getAccentColor = (shade = 500) => {
    const baseColor = theme?.customColors?.accent || theme?.colors?.accent || '#A855F7';
    if (shade === 500) return baseColor;
    const shades = generateColorShades(baseColor);
    return shades[shade] || baseColor;
  };

  const getThemeColor = (colorType, shade = 500) => {
    switch (colorType) {
      case 'primary': return getPrimaryColor(shade);
      case 'secondary': return getSecondaryColor(shade);
      case 'accent': return getAccentColor(shade);
      default: return getPrimaryColor(shade);
    }
  };

  const getThemeGradient = (fromColor = 'primary', toColor = 'accent', fromShade = 500, toShade = 600) => {
    const from = getThemeColor(fromColor, fromShade);
    const to = getThemeColor(toColor, toShade);
    return `linear-gradient(to right, ${from}, ${to})`;
  };

  const getThemeGradientBr = (fromColor = 'primary', toColor = 'accent', fromShade = 500, toShade = 600) => {
    const from = getThemeColor(fromColor, fromShade);
    const to = getThemeColor(toColor, toShade);
    return `linear-gradient(to bottom right, ${from}, ${to})`;
  };

  return {
    // Color getters (return actual hex colors, not CSS variables)
    primaryColor: getPrimaryColor(),
    secondaryColor: getSecondaryColor(),
    accentColor: getAccentColor(),
    getPrimaryColor,
    getSecondaryColor,
    getAccentColor,
    getThemeColor,
    
    // Gradient getters (return actual gradient strings with hex colors)
    primaryGradient: getThemeGradient('primary', 'accent'),
    primaryGradientBr: getThemeGradientBr('primary', 'accent'),
    secondaryGradient: getThemeGradient('secondary', 'primary'),
    accentGradient: getThemeGradient('accent', 'primary'),
    getThemeGradient,
    getThemeGradientBr,
    
    // Style objects for common use cases
    cardHeader: {
      background: getThemeGradient('primary', 'accent', 600, 700),
      color: 'white'
    },
    iconBg: {
      background: getThemeGradientBr('primary', 'accent'),
      color: 'white'
    },
    buttonPrimary: {
      background: getThemeGradient('primary', 'accent'),
      color: 'white'
    },
    buttonSecondary: {
      background: getSecondaryColor(),
      color: 'white'
    },
    
    // Theme data
    theme
  };
};

export default useThemeStyles;
