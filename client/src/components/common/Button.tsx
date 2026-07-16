import React from 'react';

interface ButtonProps {
  variant?: 'bull' | 'bear' | 'accent' | 'default';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

const variantColors: Record<
  NonNullable<ButtonProps['variant']>,
  { bg: string; hover: string; active: string; textColor: string }
> = {
  bull: {
    bg: 'var(--bull)',
    hover: 'oklch(0.72 0.22 145)',
    active: 'oklch(0.58 0.18 145)',
    textColor: '#fff',
  },
  bear: {
    bg: 'var(--bear)',
    hover: 'oklch(0.67 0.24 25)',
    active: 'oklch(0.53 0.20 25)',
    textColor: '#fff',
  },
  accent: {
    bg: 'var(--accent)',
    hover: 'var(--accent-hover)',
    active: 'oklch(0.63 0.13 200)',
    textColor: '#fff',
  },
  default: {
    bg: 'var(--surface-3)',
    hover: 'oklch(0.33 0.012 260)',
    active: 'oklch(0.25 0.010 260)',
    textColor: 'var(--text-primary)',
  },
};

const sizeStyles: Record<
  NonNullable<ButtonProps['size']>,
  { padding: string; fontSize: string }
> = {
  sm: { padding: '4px 12px', fontSize: 'var(--font-label)' },
  md: { padding: '8px 16px', fontSize: 'var(--font-body)' },
  lg: { padding: '12px 24px', fontSize: 'var(--font-section)' },
};

export default function Button({
  variant = 'default',
  size = 'md',
  disabled = false,
  onClick,
  children,
}: ButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);

  const colors = variantColors[variant];
  const sizes = sizeStyles[size];

  let background = colors.bg;
  if (disabled) {
    // keep base background, opacity handles the visual
  } else if (isActive) {
    background = colors.active;
  } else if (isHovered) {
    background = colors.hover;
  }

  const style: React.CSSProperties = {
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-family)',
    fontWeight: 500,
    textAlign: 'center',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: sizes.padding,
    fontSize: sizes.fontSize,
    background,
    color: colors.textColor,
    opacity: disabled ? 0.5 : 1,
    transition: 'background 0.15s ease',
  };

  return (
    <button
      style={style}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      {children}
    </button>
  );
}
