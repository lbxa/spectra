import type { CSSProperties } from "react";

type ShortcutsCardProps = {
  shiftActive: boolean;
  escapeDescription?: string;
};

function ShortcutRow({
  keyLabel,
  description,
  isActive = false
}: {
  keyLabel: string;
  description: string;
  isActive?: boolean;
}) {
  return (
    <>
      <span style={isActive ? { ...keyBaseStyle, ...shiftActiveStyle } : keyBaseStyle}>{keyLabel}</span>
      <span style={{ fontSize: "11px", opacity: "0.9" }}>{description}</span>
    </>
  );
}

export function ShortcutsCard({ shiftActive, escapeDescription = "Exit capture" }: ShortcutsCardProps) {
  return (
    <div data-component-picker-shortcuts="true" style={panelStyle}>
      <div style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.02em", opacity: "0.9" }}>
        Keyboard shortcuts
      </div>
      <div style={shortcutsGridStyle}>
        <ShortcutRow keyLabel="Esc" description={escapeDescription} />
        <ShortcutRow keyLabel="Shift" description="Select parent" isActive={shiftActive} />
      </div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  position: "fixed",
  right: "12px",
  bottom: "12px",
  display: "grid",
  gap: "6px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid rgba(148, 163, 184, 0.28)",
  background: "rgba(17, 24, 39, 0.94)",
  color: "#f8fafc",
  font: "12px/1.35 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.25)",
  zIndex: "2147483647",
  pointerEvents: "none",
  userSelect: "none"
};

const shortcutsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "max-content 1fr",
  columnGap: "8px",
  rowGap: "6px",
  alignItems: "center"
};

const keyBaseStyle: CSSProperties = {
  padding: "2px 7px",
  borderRadius: "6px",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "rgba(148, 163, 184, 0.4)",
  background: "rgba(51, 65, 85, 0.35)",
  fontSize: "11px",
  fontWeight: "600",
  color: "#e2e8f0",
  transition: "border-color 120ms ease, color 120ms ease, background 120ms ease"
};

const shiftActiveStyle: CSSProperties = {
  borderColor: "rgba(217, 70, 239, 0.9)",
  background: "rgba(217, 70, 239, 0.22)",
  color: "#f5d0fe"
};
