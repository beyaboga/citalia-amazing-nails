/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'rgb(var(--color-border-rgb) / <alpha-value>)', /* warm-gray-200 */
        input: 'rgb(var(--color-input-rgb) / <alpha-value>)', /* warm-gray-200 */
        ring: 'rgb(var(--color-ring-rgb) / <alpha-value>)', /* rose-500 */
        background: 'rgb(var(--color-background-rgb) / <alpha-value>)', /* warm-white */
        foreground: 'rgb(var(--color-foreground-rgb) / <alpha-value>)', /* brown-900 */
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)', /* rose-500 */
          foreground: 'rgb(var(--color-primary-foreground-rgb) / <alpha-value>)', /* white */
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary-rgb) / <alpha-value>)', /* purple-800 */
          foreground: 'rgb(var(--color-secondary-foreground-rgb) / <alpha-value>)', /* white */
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent-rgb) / <alpha-value>)', /* orange-300 */
          foreground: 'rgb(var(--color-accent-foreground-rgb) / <alpha-value>)', /* brown-900 */
        },
        destructive: {
          DEFAULT: 'rgb(var(--color-destructive-rgb) / <alpha-value>)', /* red-600 */
          foreground: 'rgb(var(--color-destructive-foreground-rgb) / <alpha-value>)', /* white */
        },
        success: {
          DEFAULT: 'rgb(var(--color-success-rgb) / <alpha-value>)', /* green-500 */
          foreground: 'rgb(var(--color-success-foreground-rgb) / <alpha-value>)', /* white */
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning-rgb) / <alpha-value>)', /* amber-400 */
          foreground: 'rgb(var(--color-warning-foreground-rgb) / <alpha-value>)', /* brown-900 */
        },
        error: {
          DEFAULT: 'rgb(var(--color-error-rgb) / <alpha-value>)', /* red-600 */
          foreground: 'rgb(var(--color-error-foreground-rgb) / <alpha-value>)', /* white */
        },
        muted: {
          DEFAULT: 'rgb(var(--color-muted-rgb) / <alpha-value>)', /* warm-gray-200 */
          foreground: 'rgb(var(--color-muted-foreground-rgb) / <alpha-value>)', /* warm-gray-600 */
        },
        card: {
          DEFAULT: 'rgb(var(--color-card-rgb) / <alpha-value>)', /* warm-gray-50 */
          foreground: 'rgb(var(--color-card-foreground-rgb) / <alpha-value>)', /* brown-900 */
        },
        popover: {
          DEFAULT: 'rgb(var(--color-popover-rgb) / <alpha-value>)', /* warm-gray-50 */
          foreground: 'rgb(var(--color-popover-foreground-rgb) / <alpha-value>)', /* brown-900 */
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        body: ['Source Sans 3', 'sans-serif'],
        caption: ['Nunito Sans', 'sans-serif'],
        data: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '70ch': '70ch',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      transitionDuration: {
        '250': '250ms',
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(45, 27, 30, 0.08)',
        'warm': '0 2px 6px rgba(45, 27, 30, 0.1)',
        'warm-md': '0 4px 12px rgba(45, 27, 30, 0.12)',
        'warm-lg': '0 8px 20px rgba(45, 27, 30, 0.14)',
        'warm-xl': '0 20px 40px -8px rgba(45, 27, 30, 0.16)',
      },
      zIndex: {
        '1': '1',
        '40': '40',
        '50': '50',
        '60': '60',
        '100': '100',
        '200': '200',
        '300': '300',
      },
    },
  },
  plugins: [],
}