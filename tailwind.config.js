/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Style gradients from styles.json (dynamic classes)
    'from-amber-400', 'to-orange-600',
    'from-red-500', 'to-pink-600',
    'from-purple-700', 'to-indigo-900',
    'from-purple-600', 'to-cyan-500',
    'from-teal-300', 'to-blue-400',
    'from-pink-500', 'to-yellow-400',
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        'theme-heading': ['var(--theme-font-heading)', 'sans-serif'],
        'theme-body': ['var(--theme-font-body)', 'sans-serif'],
      },
      colors: {
        theme: {
          'bg-from': 'var(--theme-bg-from)',
          'bg-via': 'var(--theme-bg-via)',
          'bg-to': 'var(--theme-bg-to)',
          'processing-from': 'var(--theme-processing-from)',
          'processing-via': 'var(--theme-processing-via)',
          'processing-to': 'var(--theme-processing-to)',
          'surface-dark': 'var(--theme-surface-dark)',
          'surface-medium': 'var(--theme-surface-medium)',
          'primary': 'var(--theme-primary)',
          'primary-hover': 'var(--theme-primary-hover)',
          'secondary': 'var(--theme-secondary)',
          'text-primary': 'var(--theme-text-primary)',
          'text-secondary': 'var(--theme-text-secondary)',
          'text-muted': 'var(--theme-text-muted)',
          'success': 'var(--theme-success)',
        },
      },
      backgroundImage: {
        'theme-gradient': 'linear-gradient(to bottom right, var(--theme-bg-from), var(--theme-bg-via), var(--theme-bg-to))',
        'theme-processing': 'linear-gradient(to bottom right, var(--theme-processing-from), var(--theme-processing-via), var(--theme-processing-to))',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'countdown-pulse': 'countdownPulse 0.8s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        countdownPulse: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '40%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
