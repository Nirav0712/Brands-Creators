/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/web/app/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/features/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/admin/app/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/admin/components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/admin/features/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/admin/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/**/*.{js,ts,jsx,tsx}',
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
      },
    },
  },
  plugins: [],
};
