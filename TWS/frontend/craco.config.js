const path = require('path');
const webpack = require('webpack');

module.exports = {
  jest: {
    configure: (jestConfig) => {
      // Remove jest-watch-typeahead if not installed
      if (jestConfig.watchPlugins) {
        jestConfig.watchPlugins = jestConfig.watchPlugins.filter(
          plugin => !plugin || (typeof plugin === 'string' && !plugin.includes('jest-watch-typeahead'))
        );
      }
      return jestConfig;
    }
  },
  devServer: (devServerConfig) => {
    devServerConfig.historyApiFallback = {
      index: '/index.html',
      disableDotRule: true
    };
    devServerConfig.proxy = {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug'
      }
    };
    return devServerConfig;
  },
  webpack: {
    configure: (webpackConfig) => {
      // Fix module resolution issues
      const frontendNodeModules = path.resolve(__dirname, 'node_modules');
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        modules: [
          frontendNodeModules,
          'node_modules'
        ],
        alias: {
          ...webpackConfig.resolve.alias,
          // Mirrors the "paths" block in jsconfig.json — keep both in sync.
          '@features': path.resolve(__dirname, 'src/features'),
          '@shared': path.resolve(__dirname, 'src/shared'),
          '@constants': path.resolve(__dirname, 'src/constants'),
          '@hooks': path.resolve(__dirname, 'src/shared/hooks'),
          '@utils': path.resolve(__dirname, 'src/shared/utils'),
          '@services': path.resolve(__dirname, 'src/shared/services'),
          // Force prosemirror-view to frontend's 1.33.11 (has __serializeForClipboard; 1.34+ removed it)
          'prosemirror-view': path.resolve(__dirname, 'node_modules/prosemirror-view'),
          // '@' = src root, for the shadcn CLI (components.json) — kept last so the more
          // specific aliases above are matched first.
          '@': path.resolve(__dirname, 'src'),
        },
        fallback: {
          ...webpackConfig.resolve.fallback,
          fs: false,
          path: false,
        },
      };

      // Replace html-docx-js internal (uses fs) with browser shim
      webpackConfig.plugins = webpackConfig.plugins || [];
      webpackConfig.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /[\\/]html-docx-js[\\/]build[\\/]internal\.js$/,
          path.resolve(__dirname, 'src/app/lib/html-docx-internal-browser.js')
        )
      );

      // Ensure proper module resolution for react-scripts
      webpackConfig.resolveLoader = {
        ...webpackConfig.resolveLoader,
        modules: [
          path.resolve(__dirname, 'node_modules'),
          'node_modules'
        ]
      };

      // Ensure CSS processing works correctly
      const cssRule = webpackConfig.module.rules.find(rule => 
        rule.oneOf && rule.oneOf.some(oneOf => 
          oneOf.test && oneOf.test.toString().includes('css')
        )
      );

      if (cssRule && cssRule.oneOf) {
        cssRule.oneOf.forEach(oneOf => {
          if (oneOf.test && oneOf.test.toString().includes('css')) {
            if (oneOf.use && Array.isArray(oneOf.use)) {
              oneOf.use.forEach(use => {
                if (use.loader && use.loader.includes('postcss-loader')) {
                  use.options = {
                    ...use.options,
                    postcssOptions: {
                      plugins: [
                        require('tailwindcss'),
                        require('autoprefixer'),
                      ],
                    },
                  };
                }
              });
            }
          }
        });
      }

      // Some dependencies ship broken source-map references:
      // - html2pdf.js references an es6-promise map that is not included.
      // - ot-json1@1.0.2 ends json1.release.js with `sourceMappingURL=true`.
      // Ignore only those known upstream packaging defects.
      const prevIgnore = webpackConfig.ignoreWarnings || [];
      webpackConfig.ignoreWarnings = [
        ...prevIgnore,
        (warning) =>
          typeof warning.message === 'string' &&
          warning.message.includes('html2pdf.js') &&
          warning.message.includes('Failed to parse source map'),
        (warning) =>
          typeof warning.message === 'string' &&
          warning.message.includes('ot-json1') &&
          warning.message.includes('Failed to parse source map') &&
          warning.message.includes('dist/true'),
      ];

      return webpackConfig;
    }
  },
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
};
