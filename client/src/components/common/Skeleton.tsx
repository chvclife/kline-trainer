interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "rect";
}

export default function Skeleton({
  width = "100%",
  height,
  variant = "rect",
}: SkeletonProps) {
  const resolvedHeight = height ?? (variant === "text" ? "1em" : "100px");

  const style: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof resolvedHeight === "number" ? `${resolvedHeight}px` : resolvedHeight,
    background: "var(--surface-3)",
    borderRadius: variant === "text" ? "4px" : "var(--radius-sm)",
    animation: "skeleton-pulse 1.5s ease-in-out infinite",
  };

  return <div style={style} />;
}