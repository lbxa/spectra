import { fireEvent, render, screen } from "@testing-library/react";
import { createContext, useContext, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SpaceSelect } from "./SpaceSelect";

type SelectContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const SelectContext = createContext<SelectContextValue | null>(null);

vi.mock("@/components/ui/select", () => {
  const Select = ({
    value,
    onValueChange,
    children
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
  }) => <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;

  const SelectTrigger = ({ children, className }: { children: ReactNode; className?: string }) => (
    <button type="button" role="combobox" aria-label="Space selector" className={className}>
      {children}
    </button>
  );

  const SelectValue = () => {
    const context = useContext(SelectContext);
    return <span>{context?.value}</span>;
  };

  const SelectContent = ({ children }: { children: ReactNode }) => <div>{children}</div>;

  const SelectItem = ({ value, children }: { value: string; children: ReactNode }) => {
    const context = useContext(SelectContext);
    return (
      <button
        type="button"
        role="option"
        onClick={() => {
          context?.onValueChange(value);
        }}
      >
        {children}
      </button>
    );
  };

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

describe("SpaceSelect", () => {
  it("renders an accessible selector trigger", () => {
    render(<SpaceSelect value="library" onValueChange={() => undefined} />);

    const trigger = screen.getByRole("combobox", { name: "Space selector" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("library");
  });

  it("fires value change when selecting another space", () => {
    const onValueChange = vi.fn();
    render(<SpaceSelect value="library" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("option", { name: "Previews" }));
    expect(onValueChange).toHaveBeenCalledWith("previews");
  });
});
