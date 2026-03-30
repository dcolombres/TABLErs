/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable dark mode based on class
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-bg': 'rgb(var(--color-slate-950) / <alpha-value>)',
        'card-bg': 'rgb(var(--color-slate-900) / <alpha-value>)',
        'card-border': 'rgb(var(--color-slate-800) / <alpha-value>)',
        'primary-accent': 'rgb(var(--color-indigo-500) / <alpha-value>)',
        'success-accent': 'rgb(var(--color-cyan-400) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}