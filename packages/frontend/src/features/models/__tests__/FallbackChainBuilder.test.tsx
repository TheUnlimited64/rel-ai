import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FallbackChainBuilder } from "../components/FallbackChainBuilder";

describe("FallbackChainBuilder", () => {
  it("renders label and input", () => {
    render(<FallbackChainBuilder items={[]} onChange={vi.fn()} />);

    expect(screen.getByText("Fallback Chain")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Model ID")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
  });

  it("renders existing items with numbers", () => {
    render(<FallbackChainBuilder items={["model-a", "model-b"]} onChange={vi.fn()} />);

    expect(screen.getByText("model-a")).toBeInTheDocument();
    expect(screen.getByText("model-b")).toBeInTheDocument();
  });

  it("calls onChange when adding item via button", async () => {
    const onChange = vi.fn();
    render(<FallbackChainBuilder items={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Model ID");
    await userEvent.type(input, "new-model");
    await userEvent.click(screen.getByText("Add"));

    expect(onChange).toHaveBeenCalledWith(["new-model"]);
  });

  it("calls onChange when adding item via Enter key", async () => {
    const onChange = vi.fn();
    render(<FallbackChainBuilder items={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Model ID");
    await userEvent.type(input, "new-model{Enter}");

    expect(onChange).toHaveBeenCalledWith(["new-model"]);
  });

  it("does not add duplicate items", async () => {
    const onChange = vi.fn();
    render(<FallbackChainBuilder items={["existing"]} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Model ID");
    await userEvent.type(input, "existing");
    await userEvent.click(screen.getByText("Add"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not add empty/whitespace items", async () => {
    const onChange = vi.fn();
    render(<FallbackChainBuilder items={[]} onChange={onChange} />);

    await userEvent.click(screen.getByText("Add"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes item when ✕ clicked", async () => {
    const onChange = vi.fn();
    render(<FallbackChainBuilder items={["model-a", "model-b"]} onChange={onChange} />);

    const removeButtons = screen.getAllByText("✕");
    await userEvent.click(removeButtons[0]!);

    expect(onChange).toHaveBeenCalledWith(["model-b"]);
  });

  it("moves item up when ↑ clicked", async () => {
    const onChange = vi.fn();
    render(<FallbackChainBuilder items={["model-a", "model-b"]} onChange={onChange} />);

    const upButtons = screen.getAllByText("↑");
    await userEvent.click(upButtons[1]!);

    expect(onChange).toHaveBeenCalledWith(["model-b", "model-a"]);
  });

  it("moves item down when ↓ clicked", async () => {
    const onChange = vi.fn();
    render(<FallbackChainBuilder items={["model-a", "model-b"]} onChange={onChange} />);

    const downButtons = screen.getAllByText("↓");
    await userEvent.click(downButtons[0]!);

    expect(onChange).toHaveBeenCalledWith(["model-b", "model-a"]);
  });

  it("disables ↑ on first item", () => {
    render(<FallbackChainBuilder items={["model-a", "model-b"]} onChange={vi.fn()} />);

    const upButtons = screen.getAllByText("↑");
    expect(upButtons[0]).toBeDisabled();
  });

  it("disables ↓ on last item", () => {
    render(<FallbackChainBuilder items={["model-a", "model-b"]} onChange={vi.fn()} />);

    const downButtons = screen.getAllByText("↓");
    expect(downButtons[1]).toBeDisabled();
  });

  it("uses custom label when provided", () => {
    render(<FallbackChainBuilder items={[]} onChange={vi.fn()} label="Custom Chain" />);

    expect(screen.getByText("Custom Chain")).toBeInTheDocument();
  });
});
