/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/crm/**/*.{js,jsx,ts,tsx}'],
  corePlugins: { preflight: false }, // ne pas écraser les styles DPM existants
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--crm-border))',
        input: 'hsl(var(--crm-input))',
        ring: 'hsl(var(--crm-ring))',
        background: 'hsl(var(--crm-background))',
        foreground: 'hsl(var(--crm-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--crm-primary))',
          foreground: 'hsl(var(--crm-primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--crm-secondary))',
          foreground: 'hsl(var(--crm-secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--crm-destructive))',
          foreground: 'hsl(var(--crm-destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--crm-muted))',
          foreground: 'hsl(var(--crm-muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--crm-accent))',
          foreground: 'hsl(var(--crm-accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--crm-popover))',
          foreground: 'hsl(var(--crm-popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--crm-card))',
          foreground: 'hsl(var(--crm-card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--crm-sidebar-background))',
          foreground: 'hsl(var(--crm-sidebar-foreground))',
          primary: 'hsl(var(--crm-sidebar-primary))',
          'primary-foreground': 'hsl(var(--crm-sidebar-primary-foreground))',
          accent: 'hsl(var(--crm-sidebar-accent))',
          'accent-foreground': 'hsl(var(--crm-sidebar-accent-foreground))',
          border: 'hsl(var(--crm-sidebar-border))',
          ring: 'hsl(var(--crm-sidebar-ring))',
        },
        success: { DEFAULT: 'hsl(var(--crm-success))' },
        warning: { DEFAULT: 'hsl(var(--crm-warning))' },
      },
      borderRadius: {
        lg: 'var(--crm-radius)',
        md: 'calc(var(--crm-radius) - 2px)',
        sm: 'calc(var(--crm-radius) - 4px)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
