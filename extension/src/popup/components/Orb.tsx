import { useEffect, useRef } from "react";
import { createOrbScene } from "../lib/orb-scene";

export function Orb() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = createOrbScene({
      container,
      width: container.clientWidth,
      height: container.clientHeight
    });
    scene.start();

    const triggerPulse = (event: Event) => {
      if ("isTrusted" in event && !event.isTrusted) {
        return;
      }
      scene.pulse();
    };

    document.addEventListener("pointerdown", triggerPulse, { capture: true });
    document.addEventListener("keydown", triggerPulse, { capture: true });
    document.addEventListener("input", triggerPulse, { capture: true });
    document.addEventListener("change", triggerPulse, { capture: true });

    const resize = () => {
      scene.resize(container.clientWidth, container.clientHeight);
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        resize();
      });
      resizeObserver.observe(container);
    } else {
      window.addEventListener("resize", resize);
    }

    return () => {
      document.removeEventListener("pointerdown", triggerPulse, { capture: true });
      document.removeEventListener("keydown", triggerPulse, { capture: true });
      document.removeEventListener("input", triggerPulse, { capture: true });
      document.removeEventListener("change", triggerPulse, { capture: true });
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      scene.dispose();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full"
      ref={containerRef}
    />
  );
}
