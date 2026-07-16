import React from 'react';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label?: string;
}

export default function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: SliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const computeValue = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawValue = xRatio * (max - min) + min;
    const stepped = Math.round(rawValue / step) * step;
    const clamped = Math.max(min, Math.min(max, stepped));
    onChange(clamped);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    computeValue(e.clientX);

    const handleMouseMove = (ev: MouseEvent) => {
      computeValue(ev.clientX);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--font-label)',
    color: 'var(--text-secondary)',
  };

  const trackContainerStyle: React.CSSProperties = {
    position: 'relative',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  };

  const trackStyle: React.CSSProperties = {
    height: '4px',
    width: '100%',
    background: 'var(--surface-3)',
    borderRadius: '2px',
    position: 'relative',
  };

  const filledStyle: React.CSSProperties = {
    position: 'absolute',
    height: '100%',
    background: 'var(--accent)',
    borderRadius: '2px',
    left: 0,
    width: `${percentage}%`,
  };

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: 'var(--accent)',
    border: '2px solid var(--surface-1)',
    top: '-6px',
    left: `${percentage}%`,
    transform: `translateX(-50%)`,
    pointerEvents: 'none',
  };

  const valueDisplayStyle: React.CSSProperties = {
    fontSize: 'var(--font-label)',
    color: 'var(--text-muted)',
    textAlign: 'center',
  };

  return (
    <div style={wrapperStyle}>
      {label && <span style={labelStyle}>{label}</span>}
      <div
        ref={trackRef}
        style={trackContainerStyle}
        onMouseDown={handleMouseDown}
      >
        <div style={trackStyle}>
          <div style={filledStyle} />
          <div style={thumbStyle} />
        </div>
      </div>
      <div style={valueDisplayStyle}>{value}</div>
    </div>
  );
}
