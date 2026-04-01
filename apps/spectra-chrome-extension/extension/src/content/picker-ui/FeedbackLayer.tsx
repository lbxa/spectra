type FeedbackLayerProps = {
  flashMounted: boolean;
  flashVisible: boolean;
  previewDataUrl: string | null;
  previewVisible: boolean;
};

export function FeedbackLayer({ flashMounted, flashVisible, previewDataUrl, previewVisible }: FeedbackLayerProps) {
  return (
    <>
      {flashMounted ? (
        <div
          data-component-picker-flash="true"
          style={{
            position: "fixed",
            inset: "0",
            pointerEvents: "none",
            zIndex: "2147483647",
            background: "#fff",
            opacity: flashVisible ? "0.82" : "0",
            transition: "opacity 250ms ease-out"
          }}
        />
      ) : null}
      {previewDataUrl ? (
        <img
          data-component-picker-capture-preview="true"
          src={previewDataUrl}
          alt="Captured screenshot preview"
          style={{
            position: "fixed",
            top: "16px",
            right: "16px",
            width: "auto",
            height: "auto",
            maxWidth: "120px",
            maxHeight: "120px",
            objectFit: "contain",
            borderRadius: "10px",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            boxShadow: "0 14px 28px rgba(0, 0, 0, 0.28)",
            background: "rgba(15, 23, 42, 0.8)",
            pointerEvents: "none",
            zIndex: "2147483647",
            opacity: previewVisible ? "1" : "0",
            transform: previewVisible ? "translateX(0)" : "translateX(calc(100% + 20px))",
            transition: "transform 320ms ease, opacity 320ms ease"
          }}
        />
      ) : null}
    </>
  );
}
