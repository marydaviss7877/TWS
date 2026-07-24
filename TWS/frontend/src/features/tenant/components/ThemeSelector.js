import React, { useState, useEffect } from 'react';
import { useTenantTheme } from '../providers/TenantThemeProvider';
import { PREDEFINED_THEMES, AVAILABLE_FONTS, isValidColor } from '../utils/themeConfig';
import toast from 'react-hot-toast';
import {
  PaintBrushIcon,
  CheckIcon,
  SwatchIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useTenantSlug } from '../../../shared/hooks/useTenantSlug';

const ThemeSelector = () => {
  const tenantSlug = useTenantSlug();
  const { theme, updateTheme } = useTenantTheme();
  const [selectedThemeName, setSelectedThemeName] = useState(theme?.name || 'default');
  const [customColors, setCustomColors] = useState({
    primary: theme?.customColors?.primary || theme?.colors?.primary || '#6366F1',
    secondary: theme?.customColors?.secondary || theme?.colors?.secondary || '#10B981',
    accent: theme?.customColors?.accent || theme?.colors?.accent || '#A855F7'
  });
  const [selectedFonts, setSelectedFonts] = useState({
    heading: theme?.fonts?.heading || 'Geist',
    body: theme?.fonts?.body || 'Inter'
  });
  const [isCustomMode, setIsCustomMode] = useState(theme?.name === 'custom');
  const [saving, setSaving] = useState(false);
  const [previewTheme, setPreviewTheme] = useState(null);

  // Update local state when theme changes
  useEffect(() => {
    if (theme) {
      setSelectedThemeName(theme.name || 'default');
      setCustomColors({
        primary: theme.customColors?.primary || theme.colors?.primary || '#6366F1',
        secondary: theme.customColors?.secondary || theme.colors?.secondary || '#10B981',
        accent: theme.customColors?.accent || theme.colors?.accent || '#A855F7'
      });
      setSelectedFonts({
        heading: theme.fonts?.heading || 'Geist',
        body: theme.fonts?.body || 'Inter'
      });
      setIsCustomMode(theme.name === 'custom');
    }
  }, [theme]);

  // Apply preview theme
  useEffect(() => {
    if (previewTheme) {
      const root = document.documentElement;
      const tenantPortalElement = document.querySelector('.tenant-portal') || root;
      
      // Temporarily apply preview colors
      tenantPortalElement.style.setProperty('--tenant-primary', previewTheme.colors.primary);
      tenantPortalElement.style.setProperty('--tenant-secondary', previewTheme.colors.secondary);
      tenantPortalElement.style.setProperty('--tenant-accent', previewTheme.colors.accent);
      tenantPortalElement.style.setProperty('--tenant-heading-font', previewTheme.fonts.heading);
      tenantPortalElement.style.setProperty('--tenant-body-font', previewTheme.fonts.body);
    }
  }, [previewTheme]);

  const handleThemeSelect = (themeName) => {
    setSelectedThemeName(themeName);
    setIsCustomMode(false);
    
    const selectedTheme = PREDEFINED_THEMES[themeName];
    if (selectedTheme) {
      setPreviewTheme({
        name: themeName,
        colors: selectedTheme.colors,
        fonts: selectedFonts
      });
    }
  };

  const handleCustomColorChange = (colorType, value) => {
    if (!isValidColor(value)) return;
    
    setCustomColors(prev => ({
      ...prev,
      [colorType]: value
    }));
    
    setIsCustomMode(true);
    setSelectedThemeName('custom');
    
    setPreviewTheme({
      name: 'custom',
      colors: {
        ...customColors,
        [colorType]: value
      },
      fonts: selectedFonts
    });
  };

  const handleFontChange = (fontType, value) => {
    setSelectedFonts(prev => ({
      ...prev,
      [fontType]: value
    }));
    
    setPreviewTheme(prev => prev ? {
      ...prev,
      fonts: {
        ...prev.fonts,
        [fontType]: value
      }
    } : null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const themeData = {
        name: isCustomMode ? 'custom' : selectedThemeName,
        colors: isCustomMode ? customColors : PREDEFINED_THEMES[selectedThemeName]?.colors || customColors,
        fonts: selectedFonts,
        customColors: isCustomMode ? customColors : {}
      };

      await updateTheme(themeData);
      toast.success('Theme saved successfully!');
      setPreviewTheme(null); // Clear preview after save
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Failed to save theme. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentColors = () => {
    if (isCustomMode) {
      return customColors;
    }
    return PREDEFINED_THEMES[selectedThemeName]?.colors || customColors;
  };

  const currentColors = getCurrentColors();

  return (
    <div className="space-y-6">
      {/* Predefined Themes */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <SwatchIcon className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
          Predefined Themes
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(PREDEFINED_THEMES).map(([key, themeData]) => {
            const isSelected = selectedThemeName === key && !isCustomMode;
            return (
              <button
                key={key}
                onClick={() => handleThemeSelect(key)}
                className={`relative p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-400 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-indigo-600 dark:bg-indigo-400 text-white rounded-full p-1">
                    <CheckIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                    <div
                      className="flex-1"
                      style={{ backgroundColor: themeData.colors.primary }}
                    />
                    <div
                      className="flex-1"
                      style={{ backgroundColor: themeData.colors.secondary }}
                    />
                    <div
                      className="flex-1"
                      style={{ backgroundColor: themeData.colors.accent }}
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {themeData.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {themeData.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <PaintBrushIcon className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
          Custom Colors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['primary', 'secondary', 'accent'].map((colorType) => (
            <div key={colorType}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                {colorType} Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customColors[colorType]}
                  onChange={(e) => handleCustomColorChange(colorType, e.target.value)}
                  className="w-16 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={customColors[colorType]}
                  onChange={(e) => handleCustomColorChange(colorType, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="#000000"
                />
              </div>
              <div
                className="mt-2 h-12 rounded-lg"
                style={{ backgroundColor: customColors[colorType] }}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            💡 Tip: Select a predefined theme or customize your own colors. Changes are previewed in real-time.
          </p>
        </div>
      </div>

      {/* Font Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
          Fonts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['heading', 'body'].map((fontType) => (
            <div key={fontType}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                {fontType} Font
              </label>
              <select
                value={selectedFonts[fontType]}
                onChange={(e) => handleFontChange(fontType, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white max-h-60 overflow-y-auto"
                style={{ fontFamily: selectedFonts[fontType] }}
                size="1"
              >
                {AVAILABLE_FONTS[fontType].map((font) => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label} - {font.description}
                  </option>
                ))}
              </select>
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p
                  className="text-sm"
                  style={{ fontFamily: selectedFonts[fontType] }}
                >
                  {fontType === 'heading' ? 'Sample Heading Text' : 'Sample body text with the selected font.'}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 Tip: Fonts are loaded from Google Fonts. Choose fonts that match your brand identity.
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Preview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="p-4 rounded-lg text-white"
            style={{ backgroundColor: currentColors.primary }}
          >
            <p className="font-semibold">Primary</p>
            <p className="text-sm opacity-90">{currentColors.primary}</p>
          </div>
          <div
            className="p-4 rounded-lg text-white"
            style={{ backgroundColor: currentColors.secondary }}
          >
            <p className="font-semibold">Secondary</p>
            <p className="text-sm opacity-90">{currentColors.secondary}</p>
          </div>
          <div
            className="p-4 rounded-lg text-white"
            style={{ backgroundColor: currentColors.accent }}
          >
            <p className="font-semibold">Accent</p>
            <p className="text-sm opacity-90">{currentColors.accent}</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? 'Saving...' : 'Save Theme'}
        </button>
      </div>
    </div>
  );
};

export default ThemeSelector;
