/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        forest: {
          50: '#f0f7f1',
          100: '#d9eddb',
          200: '#b5dbb9',
          300: '#85c18d',
          400: '#55a361',
          500: '#2d7a4e',
          600: '#22613d',
          700: '#1c4e33',
          800: '#183e2a',
          900: '#143424',
          950: '#0a1d14',
        },
        sand: {
          50: '#faf8f3',
          100: '#f3efe4',
          200: '#e6ddc6',
          300: '#d5c5a1',
          400: '#c3a97a',
          500: '#b5935d',
          600: '#a87f51',
          700: '#8c6644',
          800: '#72533b',
          900: '#5e4533',
          950: '#33231a',
        },
        campfire: {
          50: '#fff8ed',
          100: '#ffefd4',
          200: '#ffdba8',
          300: '#ffc171',
          400: '#ff9d38',
          500: '#ff8011',
          600: '#f06507',
          700: '#c74b08',
          800: '#9e3b0f',
          900: '#803310',
          950: '#451806',
        },
      },
      fontFamily: {
        heading: ['Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    }
  },
  plugins: [import("tailwindcss-animate")],
}
