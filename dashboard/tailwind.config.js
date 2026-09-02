/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#1A233A',
        surfaceHover: '#2A3655',
        primary: '#3B82F6',
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        textMain: '#F3F4F6',
        textMuted: '#9CA3AF'
      }
    },
  },
  plugins: [],
}
