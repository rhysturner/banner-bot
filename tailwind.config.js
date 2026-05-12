/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // BannerBot dark editor palette
        ink:       { 950: '#0b0d12', 900: '#11141b', 800: '#161a23', 700: '#1d2230', 600: '#262c3c' },
        accent:    { 500: '#2f6bff' },
      },
    },
  },
  plugins: [],
};
