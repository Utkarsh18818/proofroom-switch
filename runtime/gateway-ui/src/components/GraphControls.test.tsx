import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GraphControls, { MAX_GRAPH_ZOOM, MIN_GRAPH_ZOOM } from "./GraphControls";

afterEach(cleanup);
describe("diagram viewport controls", () => {
  it("zooms from the current scale and fits without selecting graph content", () => {
    const onZoom = vi.fn();
    const onFit = vi.fn();
    render(<GraphControls zoom={2} onZoom={onZoom} onFit={onFit} />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(onZoom).toHaveBeenLastCalledWith(2.5);
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(onZoom).toHaveBeenLastCalledWith(1.6);
    fireEvent.click(screen.getByRole("button", { name: "Fit diagram to view" }));
    expect(onFit).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Diagram zoom").textContent).toBe("200%");
  });
  it("enforces both scale bounds and disables unavailable diagrams", () => {
    const onZoom = vi.fn();
    const onFit = vi.fn();
    const { rerender } = render(<GraphControls zoom={MIN_GRAPH_ZOOM} onZoom={onZoom} onFit={onFit} />);
    expect((screen.getByRole("button", { name: "Zoom out" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<GraphControls zoom={MAX_GRAPH_ZOOM} onZoom={onZoom} onFit={onFit} />);
    expect((screen.getByRole("button", { name: "Zoom in" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<GraphControls zoom={1} disabled onZoom={onZoom} onFit={onFit} />);
    for (const button of screen.getAllByRole("button")) {
      fireEvent.click(button);
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    expect(onZoom).not.toHaveBeenCalled();
    expect(onFit).not.toHaveBeenCalled();
  });
});