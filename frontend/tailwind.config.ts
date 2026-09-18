import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic CSS variable colors (shadcn/ui pattern)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Semantic text tokens switch with the theme and meet WCAG AA on their default surfaces.
        'copy-muted': 'var(--copy-muted)',
        'copy-subtle': 'var(--copy-subtle)',
        // Saha palette — derived from the logo icon
        // Forest green (icon background): primary action color
        forest: {
          50: '#f0f7f3',
          100: '#d9ede1',
          200: '#b3dbc4',
          300: '#7ec2a0',
          400: '#4fa37c',
          500: '#3f5c49', // icon bg light
          600: '#314a3a', // icon bg dark
          700: '#243728',
          800: '#182419',
          900: '#0d130e',
          950: '#060a07',
        },
        // Sage green (icon vesica/leaf): accent / highlight color
        sage: {
          50: '#f3f9f4',
          100: '#e3f1e6',
          200: '#c6e3cc',
          300: '#9fc7a4', // exact icon leaf color
          400: '#74aa7b',
          500: '#4f8c57',
          600: '#3a6e40',
          700: '#2a5130',
          800: '#1c3620',
          900: '#0e1b10',
        },
        // Cream (icon ring color): used for text on dark surfaces
        cream: {
          DEFAULT: '#f3f0e7',
          50: '#fdfcf9',
          100: '#f8f5ee',
          200: '#f3f0e7', // exact icon ring color
          300: '#e8e2d5',
          400: '#d6cdb8',
          500: '#bfb49a',
        },
        // Sandstone: neutral base (warm parchment tones)
        sandstone: {
          50: '#fefcf8',
          100: '#faf8f0',
          200: '#f5f0e1',
          300: '#ede4cc',
          400: '#ddd0ae',
          500: '#c9b88a',
          600: '#b09a6a',
          700: '#806d49',
          800: '#6b5c3e',
          900: '#4a4030',
          950: '#2a231a',
        },
        ivory: {
          DEFAULT: '#FDFAF3',
          dark: '#f5f0e6',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        serif: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'warm-sm': '0 1px 3px 0 rgba(74, 64, 48, 0.08), 0 1px 2px -1px rgba(74, 64, 48, 0.06)',
        'warm-md': '0 4px 6px -1px rgba(74, 64, 48, 0.10), 0 2px 4px -2px rgba(74, 64, 48, 0.06)',
        'warm-lg': '0 10px 15px -3px rgba(74, 64, 48, 0.10), 0 4px 6px -4px rgba(74, 64, 48, 0.06)',
        'warm-xl':
          '0 20px 25px -5px rgba(74, 64, 48, 0.12), 0 8px 10px -6px rgba(74, 64, 48, 0.06)',
        'inner-warm': 'inset 0 2px 4px 0 rgba(74, 64, 48, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'lotus-pattern': "url('/patterns/lotus-subtle.svg')",
        'gradient-warm': 'linear-gradient(135deg, #f8f5ee 0%, #f3f0e7 100%)',
        'gradient-forest': 'linear-gradient(135deg, #3f5c49 0%, #314a3a 100%)',
      },
    },
  },
  plugins: [],
}

export default config
