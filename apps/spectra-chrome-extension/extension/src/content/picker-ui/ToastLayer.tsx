type ToastLayerProps = {
  message: string | null;
  visible: boolean;
};

export function ToastLayer({ message, visible }: ToastLayerProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      data-component-picker-toast="true"
      style={{
        position: "fixed",
        left: "50%",
        top: "16px",
        transform: visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-14px)",
        opacity: visible ? "1" : "0",
        transition: "transform 220ms ease, opacity 220ms ease",
        zIndex: "2147483647",
        background: "rgba(17, 24, 39, 0.92)",
        color: "#f9fafb",
        padding: "8px 12px",
        borderRadius: "8px",
        whiteSpace: "nowrap",
        maxWidth: "calc(100vw - 24px)",
        textOverflow: "ellipsis",
        overflow: "hidden",
        font: "12px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        pointerEvents: "none",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.25)"
      }}
    >
      {message}
    </div>
  );
}
