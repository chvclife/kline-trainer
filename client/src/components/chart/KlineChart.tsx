import { useRef, useId } from 'react';
import { useChart } from '../../hooks/useChart';
import { useMAOverlay } from '../../hooks/useMAOverlay';

interface KlineChartProps {
  maParams?: number[];
}

export default function KlineChart({ maParams = [] }: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartId = useId();

  // Initialize chart with klinecharts, sync data and sub-chart indicators (MACD/RSI/KDJ)
  const chartRef = useChart({ containerRef, chartId });

  // Draw MA lines directly on main chart canvas (同花顺 style)
  useMAOverlay({ chartRef, containerRef, maParams });

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
