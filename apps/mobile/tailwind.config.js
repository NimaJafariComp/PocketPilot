/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#F4F5F7',
        foreground: '#142033',
        card: '#FFFFFF',
        muted: '#EDF2FB',
        mutedForeground: '#62718B',
        primary: '#2B67F6',
        primaryForeground: '#F8FBFF',
        secondary: '#E8EEFC',
        secondaryForeground: '#183153',
        accent: '#E7EFFF',
        border: '#D9E0EA',
        success: '#1F9D72',
        warning: '#D59B2F',
        danger: '#DC4960',
        ink: '#0B1730',
        darkBackground: '#08111F',
        darkCard: '#0E1A2D',
        darkMuted: '#102035',
        darkBorder: '#24344F',
        darkForeground: '#EDF3FF',
      },
      borderRadius: {
        xl: '20px',
        '2xl': '28px',
      },
      boxShadow: {
        panel: '0 12px 32px rgba(11, 23, 48, 0.12)',
      },
      fontFamily: {
        sans: ['System'],
        serif: ['Georgia'],
      },
    },
  },
  plugins: [],
};
