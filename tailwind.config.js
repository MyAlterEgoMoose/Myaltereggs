/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        primary: '#2c7da0',
        secondary: '#5e6b7c',
        danger: '#b91c1c',
        accent: '#667eea',
        accentDark: '#764ba2',
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
