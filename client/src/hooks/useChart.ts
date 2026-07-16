import { useChartStore } from "../store/chartStore";

export function useChart() {
  const indicators = useChartStore((s) => s.indicators);
  const subChartCount = useChartStore((s) => s.subChartCount);
  const activeDrawingTool = useChartStore((s) => s.activeDrawingTool);
  const drawings = useChartStore((s) => s.drawings);
  const addIndicator = useChartStore((s) => s.addIndicator);
  const removeIndicator = useChartStore((s) => s.removeIndicator);
  const setSubChartCount = useChartStore((s) => s.setSubChartCount);
  const setActiveDrawingTool = useChartStore((s) => s.setActiveDrawingTool);
  const addDrawing = useChartStore((s) => s.addDrawing);
  const removeDrawing = useChartStore((s) => s.removeDrawing);
  const clearDrawings = useChartStore((s) => s.clearDrawings);

  return {
    indicators,
    subChartCount,
    activeDrawingTool,
    drawings,
    addIndicator,
    removeIndicator,
    setSubChartCount,
    setActiveDrawingTool,
    addDrawing,
    removeDrawing,
    clearDrawings,
  };
}