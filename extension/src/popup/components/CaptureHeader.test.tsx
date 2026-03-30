import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CaptureHeader } from "./CaptureHeader";

vi.mock("./Orb", () => ({
  Orb: () => <div data-testid="orb" />
}));

describe("CaptureHeader", () => {
  it("renders product label, separator, and status message", () => {
    render(
      <CaptureHeader
        isCaptureDisabled={false}
        onStartCapture={async () => undefined}
        statusMessage="Ready"
        activeSpace="library"
        onActiveSpaceChange={() => undefined}
      />
    );

    expect(screen.getByText("Spectra")).toBeInTheDocument();
    expect(screen.getByText("/")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("starts capture when capture button is clicked", () => {
    const onStartCapture = vi.fn(async () => undefined);
    render(
      <CaptureHeader
        isCaptureDisabled={false}
        onStartCapture={onStartCapture}
        statusMessage=""
        activeSpace="library"
        onActiveSpaceChange={() => undefined}
      />
    );

    fireEvent.click(screen.getByTitle("Capture component (hold Shift to target parent)"));
    expect(onStartCapture).toHaveBeenCalledTimes(1);
  });
});
