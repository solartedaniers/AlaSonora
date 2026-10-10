/**
 * Tailwind is only a helper here: every value comes from the CSS variables in
 * src/app/theme/tokens.scss. The default palette, spacing, radii, shadows and
 * type scale are replaced (not extended), so classes like `bg-white` or
 * `text-gray-700` simply don't exist.
 */

const COLOR_TOKENS = [
  'primary', 'on-primary', 'primary-container', 'on-primary-container',
  'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container',
  'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
  'error', 'on-error', 'error-container', 'on-error-container',
  'success', 'on-success', 'success-container', 'on-success-container',
  'warning', 'warning-container', 'on-warning-container',
  'surface', 'on-surface', 'on-surface-variant',
  'surface-container-lowest', 'surface-container-low', 'surface-container',
  'surface-container-high', 'surface-container-highest',
  'outline', 'outline-variant',
  'sulfur', 'on-sulfur', 'record', 'on-record', 'focus', 'scrim',
  'chrome', 'chrome-raised', 'on-chrome', 'on-chrome-variant', 'chrome-line',
];

// Opacity modifiers (`bg-primary/20`) can't be applied to a bare var(), so they
// are resolved with color-mix against the same token.
const tokenColor = (name) => ({ opacityValue }) => {
  const color = `var(--color-${name})`;
  if (opacityValue === undefined) return color;
  const numeric = Number(opacityValue);
  const amount = Number.isNaN(numeric) ? `calc(${opacityValue} * 100%)` : `${numeric * 100}%`;
  return `color-mix(in srgb, ${color} ${amount}, transparent)`;
};

const SPACING_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];

const scale = (prefix, keys) => Object.fromEntries(keys.map((key) => [key, `var(--${prefix}-${key})`]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: ['class', '.theme-dark'],
  // The color functions above already handle opacity, so the legacy
  // `--tw-*-opacity` plumbing is unnecessary.
  corePlugins: {
    backgroundOpacity: false,
    textOpacity: false,
    borderOpacity: false,
    divideOpacity: false,
    placeholderOpacity: false,
    ringOpacity: false,
  },
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      ...Object.fromEntries(COLOR_TOKENS.map((name) => [name, tokenColor(name)])),
    },
    spacing: {
      0: '0',
      px: '1px',
      ...Object.fromEntries(SPACING_STEPS.map((step) => [step, `calc(var(--space-unit) * ${step})`])),
      gutter: 'var(--space-gutter)',
      section: 'var(--space-section)',
      touch: 'var(--touch-target)',
      header: 'var(--header-height)',
      ruler: 'var(--ruler-size)',
    },
    borderRadius: {
      none: 'var(--radius-none)',
      xs: 'var(--radius-xs)',
      sm: 'var(--radius-sm)',
      DEFAULT: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
      '2xl': 'var(--radius-2xl)',
      '3xl': 'var(--radius-3xl)',
      full: 'var(--radius-full)',
    },
    boxShadow: {
      none: 'none',
      sm: 'var(--shadow-sm)',
      DEFAULT: 'var(--shadow-md)',
      md: 'var(--shadow-md)',
      lg: 'var(--shadow-lg)',
      xl: 'var(--shadow-xl)',
      '2xl': 'var(--shadow-xl)',
      inner: 'var(--shadow-inner)',
    },
    fontFamily: {
      display: 'var(--font-display)',
      body: 'var(--font-body)',
      data: ['var(--font-data)', { fontFeatureSettings: '"tnum"' }],
    },
    fontSize: {
      xs: ['var(--text-xs)', { lineHeight: 'var(--leading-snug)' }],
      sm: ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
      base: ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
      lg: ['var(--text-lg)', { lineHeight: 'var(--leading-normal)' }],
      xl: ['var(--text-xl)', { lineHeight: 'var(--leading-snug)' }],
      '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-snug)' }],
      '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
      '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-tight)' }],
      '5xl': ['var(--text-5xl)', { lineHeight: 'var(--leading-tight)' }],
      '6xl': ['var(--text-6xl)', { lineHeight: 'var(--leading-tight)' }],
    },
    fontWeight: {
      normal: 'var(--weight-regular)',
      medium: 'var(--weight-medium)',
      semibold: 'var(--weight-semibold)',
      bold: 'var(--weight-bold)',
      extrabold: 'var(--weight-black)',
    },
    lineHeight: scale('leading', ['none', 'tight', 'snug', 'normal', 'relaxed']),
    letterSpacing: {
      display: 'var(--tracking-display)',
      tight: 'var(--tracking-tight)',
      normal: 'var(--tracking-normal)',
      wide: 'var(--tracking-wide)',
      wider: 'var(--tracking-wider)',
      widest: 'var(--tracking-wider)',
    },
    transitionDuration: { DEFAULT: 'var(--duration-base)', ...scale('duration', ['instant', 'fast', 'base', 'slow']) },
    transitionTimingFunction: {
      DEFAULT: 'var(--ease-standard)',
      linear: 'linear',
      ...scale('ease', ['standard', 'in', 'out', 'in-out']),
    },
    animation: {
      none: 'none',
      spin: 'spin var(--duration-spin) linear infinite',
      ping: 'ping var(--duration-spin) var(--ease-out) infinite',
      pulse: 'pulse var(--duration-pulse) var(--ease-in-out) infinite',
      float: 'float var(--duration-float) var(--ease-in-out) infinite',
      scan: 'scan var(--duration-sweep) linear infinite',
    },
    extend: {
      ringColor: { DEFAULT: 'var(--color-focus)' },
      borderColor: { DEFAULT: 'var(--color-outline-variant)' },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(calc(var(--space-unit) * -2))' },
        },
        scan: {
          '0%': { left: '8%' },
          '100%': { left: '92%' },
        },
      },
    },
  },
  plugins: [
    // `current:` styles the active route link through its aria-current attribute.
    ({ addVariant }) => addVariant('current', '&[aria-current="page"]'),
  ],
};
