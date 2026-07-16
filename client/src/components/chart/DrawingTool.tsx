import type { Drawing } from "../../types";
import "./DrawingTool.css";

interface DrawingToolProps {
  activeTool: string | null;
  onSelectTool: (tool: Drawing["type"] | null) => void;
  onClearAll: () => void;
}

const TOOLS: { type: Drawing["type"]; label: string; icon: string }[] = [
  { type: "trendline", label: "趨勢線", icon: "╱" },
  { type: "horizontal", label: "水平線", icon: "—" },
  { type: "channel", label: "通道", icon: "∥" },
  { type: "rectangle", label: "矩形", icon: "□" },
];

export default function DrawingTool({
  activeTool,
  onSelectTool,
  onClearAll,
}: DrawingToolProps) {
  return (
    <div className="drawing-tool">
      <span className="drawing-tool__label">繪圖工具</span>
      <div className="drawing-tool__group">
        {TOOLS.map((tool) => (
          <button
            key={tool.type}
            className={`drawing-tool__btn${activeTool === tool.type ? " drawing-tool__btn--active" : ""}`}
            onClick={() =>
              onSelectTool(activeTool === tool.type ? null : tool.type)
            }
            title={tool.label}
          >
            <span className="drawing-tool__icon">{tool.icon}</span>
            <span className="drawing-tool__name">{tool.label}</span>
          </button>
        ))}
      </div>
      <button className="drawing-tool__clear" onClick={onClearAll}>
        清除全部
      </button>
    </div>
  );
}
