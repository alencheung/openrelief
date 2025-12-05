import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        border: 'rgb(var(--color-border))',
        input: 'rgb(var(--color-input))',
        ring: 'rgb(var(--color-ring))',
        background: 'rgb(var(--color-background))',
        foreground: 'rgb(var(--color-foreground))',
        primary: {
          DEFAULT: 'rgb(var(--color-primary))',
          foreground: 'rgb(var(--color-primary-foreground))',
          hover: 'rgb(var(--color-primary-hover))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary))',
          foreground: 'rgb(var(--color-secondary-foreground))',
          hover: 'rgb(var(--color-secondary-hover))',
        },
        destructive: {
          DEFAULT: 'rgb(var(--color-destructive))',
          foreground: 'rgb(var(--color-destructive-foreground))',
          hover: 'rgb(var(--color-destructive-hover))',
        },
        success: {
          DEFAULT: 'rgb(var(--color-success))',
          foreground: 'rgb(var(--color-success-foreground))',
          hover: 'rgb(var(--color-success-hover))',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning))',
          foreground: 'rgb(var(--color-warning-foreground))',
          hover: 'rgb(var(--color-warning-hover))',
        },
        info: {
          DEFAULT: 'rgb(var(--color-info))',
          foreground: 'rgb(var(--color-info-foreground))',
          hover: 'rgb(var(--color-info-hover))',
        },
        muted: {
          DEFAULT: 'rgb(var(--color-muted))',
          foreground: 'rgb(var(--color-muted-foreground))',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent))',
          foreground: 'rgb(var(--color-accent-foreground))',
          hover: 'rgb(var(--color-accent-hover))',
        },
        popover: {
          DEFAULT: 'hsl(var(--color-popover))',
          foreground: 'hsl(var(--color-popover-foreground))',
        },
        card: {
          DEFAULT: 'rgb(var(--color-card))',
          foreground: 'rgb(var(--color-card-foreground))',
        },
        // Enhanced emergency type colors with semantic variants
        emergency: {
          fire: {
            DEFAULT: 'rgb(var(--emergency-fire))',
            hover: 'rgb(var(--emergency-fire-hover))',
            light: 'rgb(var(--emergency-fire-light))',
            dark: 'rgb(var(--emergency-fire-dark))',
          },
          medical: {
            DEFAULT: 'rgb(var(--emergency-medical))',
            hover: 'rgb(var(--emergency-medical-hover))',
            light: 'rgb(var(--emergency-medical-light))',
            dark: 'rgb(var(--emergency-medical-dark))',
          },
          security: {
            DEFAULT: 'rgb(var(--emergency-security))',
            hover: 'rgb(var(--emergency-security-hover))',
            light: 'rgb(var(--emergency-security-light))',
            dark: 'rgb(var(--emergency-security-dark))',
          },
          natural: {
            DEFAULT: 'rgb(var(--emergency-natural))',
            hover: 'rgb(var(--emergency-natural-hover))',
            light: 'rgb(var(--emergency-natural-light))',
            dark: 'rgb(var(--emergency-natural-dark))',
          },
          infrastructure: {
            DEFAULT: 'rgb(var(--emergency-infrastructure))',
            hover: 'rgb(var(--emergency-infrastructure-hover))',
            light: 'rgb(var(--emergency-infrastructure-light))',
            dark: 'rgb(var(--emergency-infrastructure-dark))',
          },
        },
        // Enhanced trust score colors with semantic variants
        trust: {
          excellent: {
            DEFAULT: 'rgb(var(--trust-excellent))',
            bg: 'rgb(var(--trust-excellent-bg))',
          },
          good: {
            DEFAULT: 'rgb(var(--trust-good))',
            bg: 'rgb(var(--trust-good-bg))',
          },
          moderate: {
            DEFAULT: 'rgb(var(--trust-moderate))',
            bg: 'rgb(var(--trust-moderate-bg))',
          },
          low: {
            DEFAULT: 'rgb(var(--trust-low))',
            bg: 'rgb(var(--trust-low-bg))',
          },
          critical: {
            DEFAULT: 'rgb(var(--trust-critical))',
            bg: 'rgb(var(--trust-critical-bg))',
          },
          // Legacy support
          high: 'rgb(var(--trust-good))',
          medium: 'rgb(var(--trust-moderate))',
          low: 'rgb(var(--trust-low))',
        },
        // Status colors with semantic meaning
        status: {
          active: 'rgb(var(--status-active))',
          inactive: 'rgb(var(--status-inactive))',
          pending: 'rgb(var(--status-pending))',
          resolved: 'rgb(var(--status-resolved))',
          critical: 'rgb(var(--status-critical))',
        },
        // Enhanced map colors
        map: {
          background: 'rgb(var(--map-background))',
          water: 'rgb(var(--map-water))',
          land: 'rgb(var(--map-land))',
          road: 'rgb(var(--map-road))',
          building: 'rgb(var(--map-building))',
          park: 'rgb(var(--map-park))',
        },
      },
      borderRadius: {
        'xs': 'var(--radius-sm)',
        'sm': 'var(--radius-md)',
        DEFAULT: 'var(--radius-lg)',
        'md': 'var(--radius-xl)',
        'lg': 'var(--radius)',
        'xl': 'calc(var(--radius) - 2px)',
        '2xl': 'calc(var(--radius) - 4px)',
        'full': 'var(--radius-full)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['var(--font-size-xs)', { lineHeight: 'var(--line-height-normal)' }],
        'sm': ['var(--font-size-sm)', { lineHeight: 'var(--line-height-normal)' }],
        base: ['var(--font-size-base)', { lineHeight: 'var(--line-height-normal)' }],
        'lg': ['var(--font-size-lg)', { lineHeight: 'var(--line-height-normal)' }],
        'xl': ['var(--font-size-xl)', { lineHeight: 'var(--line-height-tight)' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-tight)' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
        '4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--line-height-tight)' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        DEFAULT: 'var(--spacing-md)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      lineHeight: {
        'tight': 'var(--line-height-tight)',
        'normal': 'var(--line-height-normal)',
        'relaxed': 'var(--line-height-relaxed)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'normal': 'var(--duration-normal)',
        'slow': 'var(--duration-slow)',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
        '128': '32rem',
        '144': '36rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'emergency-pulse': 'emergencyPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        emergencyPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
        },
      },
      screens: {
        '3xl': '1600px',
      },
      backdropBlur: {
        xs: '2px',
      },
      aspectRatio: {
        '4/3': '4 / 3',
        '3/2': '3 / 2',
        '2/3': '2 / 3',
        '9/16': '9 / 16',
      },
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
      },
      height: {
        '128': '32rem',
        '144': '36rem',
      },
      width: {
        '128': '32rem',
        '144': '36rem',
      },
      minWidth: {
        '128': '32rem',
        '144': '36rem',
      },

      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
}

export default config