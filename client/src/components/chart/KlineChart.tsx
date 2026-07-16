import { useRef, useId } from 'react';
import { useChart } from '../../hooks/useChart';

export default function KlineChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartId = useId();

  // Initialize chart with klinecharts, sync data and indicators
  useChart({ containerRef, chartId });

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
