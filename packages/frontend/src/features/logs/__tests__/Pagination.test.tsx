import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "../components/Pagination";

describe("Pagination", () => {
  it("returns null when totalPages <= 1", () => {
    const { container } = render(
      <Pagination offset={0} total={10} pageSize={50} onOffsetChange={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders pagination controls when totalPages > 1", () => {
    render(
      <Pagination offset={0} total={100} pageSize={50} onOffsetChange={vi.fn()} />,
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Prev")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Last")).toBeInTheDocument();
    expect(screen.getByText(/Page 1\/2/)).toBeInTheDocument();
  });

  it("shows correct range display", () => {
    render(
      <Pagination offset={50} total={120} pageSize={50} onOffsetChange={vi.fn()} />,
    );

    expect(screen.getByText("51–100 of 120")).toBeInTheDocument();
    expect(screen.getByText(/Page 2\/3/)).toBeInTheDocument();
  });

  it("disables First and Prev when on first page", () => {
    render(
      <Pagination offset={0} total={100} pageSize={50} onOffsetChange={vi.fn()} />,
    );

    expect(screen.getByText("First")).toBeDisabled();
    expect(screen.getByText("Prev")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();
    expect(screen.getByText("Last")).not.toBeDisabled();
  });

  it("disables Next and Last when on last page", () => {
    render(
      <Pagination offset={50} total={100} pageSize={50} onOffsetChange={vi.fn()} />,
    );

    expect(screen.getByText("First")).not.toBeDisabled();
    expect(screen.getByText("Prev")).not.toBeDisabled();
    expect(screen.getByText("Next")).toBeDisabled();
    expect(screen.getByText("Last")).toBeDisabled();
  });

  it("calls onOffsetChange(0) when First clicked", async () => {
    const onOffsetChange = vi.fn();
    render(
      <Pagination offset={50} total={100} pageSize={50} onOffsetChange={onOffsetChange} />,
    );

    await userEvent.click(screen.getByText("First"));
    expect(onOffsetChange).toHaveBeenCalledWith(0);
  });

  it("calls onOffsetChange with offset-pageSize when Prev clicked", async () => {
    const onOffsetChange = vi.fn();
    render(
      <Pagination offset={50} total={100} pageSize={50} onOffsetChange={onOffsetChange} />,
    );

    await userEvent.click(screen.getByText("Prev"));
    expect(onOffsetChange).toHaveBeenCalledWith(0);
  });

  it("calls onOffsetChange with offset+pageSize when Next clicked", async () => {
    const onOffsetChange = vi.fn();
    render(
      <Pagination offset={0} total={100} pageSize={50} onOffsetChange={onOffsetChange} />,
    );

    await userEvent.click(screen.getByText("Next"));
    expect(onOffsetChange).toHaveBeenCalledWith(50);
  });

  it("calls onOffsetChange for last page when Last clicked", async () => {
    const onOffsetChange = vi.fn();
    render(
      <Pagination offset={0} total={150} pageSize={50} onOffsetChange={onOffsetChange} />,
    );

    await userEvent.click(screen.getByText("Last"));
    expect(onOffsetChange).toHaveBeenCalledWith(100);
  });

  it("shows correct range on partial last page", () => {
    render(
      <Pagination offset={100} total={120} pageSize={50} onOffsetChange={vi.fn()} />,
    );

    expect(screen.getByText("101–120 of 120")).toBeInTheDocument();
  });
});
