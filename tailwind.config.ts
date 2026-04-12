import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:          '#1D3557',
        'navy-dark':   '#162840',
        blue:          '#4A7C9E',
        'blue-light':  '#A8C8E0',
        gold:          '#C4943A',
        'gold-dark':   '#A87A2A',
        stone:         '#F7F5F2',
        border:        '#E5E0D8',
        muted:         '#6A7A88',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans:    ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:         '0 4px 24px rgba(29, 53, 87, 0.08)',
        'card-hover': '0 8px 32px rgba(29, 53, 87, 0.14)',
      },
    },
  },
  plugins: [],
}

export default config
