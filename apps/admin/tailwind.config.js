const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'app/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, 'components/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, 'features/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, 'lib/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, '../../packages/**/*.{js,ts,jsx,tsx}'),
    './apps/admin/app/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/admin/components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/admin/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        brand: {
          50: '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a4bcfd',
          400: '#8098f8',
          500: '#5c73f2',
          600: '#4355e7',
          700: '#3542cc',
          800: '#2d37a5',
          900: '#293282',
          950: '#1a1e4e',
        },
        admin: {
          sidebar: '#ffffff',
          surface: '#fbfcfd',
          card: '#ffffff',
          border: 'rgba(226, 232, 240, 0.85)',
          activeNav: '#f1f5f9',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'gemini-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'gemini-md': '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        'gemini-lg': '0 12px 32px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};
