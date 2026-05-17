/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e6f4f6',
          100: '#cce9ed',
          200: '#99d3db',
          300: '#66bdc9',
          400: '#33a7b7',
          500: '#0091a5',
          600: '#006e7e',
          700: '#005a67',
          800: '#004550',
          900: '#003039',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
