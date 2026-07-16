import { useRef, useId } from 'react';

export default function KlineChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartId = useId();

  // chartId is reserved for future klinecharts integration
  void chartId;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}