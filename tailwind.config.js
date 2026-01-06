/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Account type colors (matching mockup)
        'taxable': '#E0F2FE',      // Light blue
        'taxable-gains': '#BFDBFE', // Slightly darker blue for gains
        'traditional': '#F3E8FF',   // Light purple/pink (401k)
        'roth': '#DBEAFE',          // Blue
        'social-security': '#EDE9FE', // Light purple
        // Tax bracket colors
        'bracket-10': '#D1FAE5',    // Green
        'bracket-12': '#FEF3C7',    // Yellow
        'bracket-22': '#FDE68A',    // Darker yellow
        'bracket-24': '#FDBA74',    // Orange
        'bracket-32': '#F87171',    // Red
        'bracket-35': '#FB7185',    // Pink-red
        'bracket-37': '#F43F5E',    // Dark red
        'tax-free': '#A7F3D0',      // Bright green
      },
    },
  },
  plugins: [],
}
