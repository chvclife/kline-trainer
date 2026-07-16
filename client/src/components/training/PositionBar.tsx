import React from 'react';

interface PositionBarProps {
  position: number; // 0-1
  costPrice: number;
}

export default function PositionBar({ position, costPrice }: PositionBarProps) {
  const pct = position * 100;
  const hasPosition = position > 0.001;

  const outerStyle: React.CSSProperties = {
    height: '24px',
    background: 'var(--surface-3)',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  };

  const filledStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: `${pct}%`,
    background: hasPosition ? 'var(--bull)' : 'var(--surface-3)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  };

  const textStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-micro)',
    color: position > 0.3 ? '#fff' : 'var(--text-secondary)',
    fontWeight: 600,
    textShadow: position > 0.3 ? '0 0 4px rgba(0,0,0,0.5)' : 'none',
  };

  const label = `${pct.toFixed(0)}%${costPrice > 0 ? ` 成本 ${costPrice.toFixed(2)}` : ''}`;

  return (
    <div style={outerStyle}>
      <div style={filledStyle} />
      <div style={textStyle}>{label}</div>
    </div>
  );
}