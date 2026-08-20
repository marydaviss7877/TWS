/**
 * TWS Brand Design Tokens — Layer 1 (root/reference tokens)
 *
 * The single hand-maintained source for the brand color palette. Every other
 * color reference in the app — Tailwind's `primary`/`secondary`/`accent`
 * classes (tailwind.config.js), the generated CSS custom properties
 * (tokens.generated.css), and the --theme- / --wolfstack- fallback values —
 * derives from this file. Change a brand color here once, run `npm run
 * tokens` (or just `npm start`/`npm run build`, which do it automatically),
 * and it propagates everywhere. Never hand-copy these hex values elsewhere.
 */

const navy = {
  50: '#eef6ff',
  100: '#dfeeff',
  200: '#c4ddff',
  300: '#9fc1f7',
  400: '#6d93dc',
  500: '#103D67',
  600: '#0c3157',
  700: '#0a2746',
  800: '#081f3a',
  900: '#061a2d',
  950: '#041421',
};

const orange = {
  50: '#fff1ee',
  100: '#ffe0d8',
  200: '#ffc3b0',
  300: '#ff9b7f',
  400: '#ff7a5b',
  500: '#f04e25',
  600: '#d8431b',
  700: '#b83515',
  800: '#962a12',
  900: '#731f10',
  950: '#4f180d',
};

const green = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
  950: '#022c22',
};

module.exports = {
  brand: {
    navy,
    orange,
    green,
    ink: '#0f172a',
    mist: '#f4f8fd',
  },
};
