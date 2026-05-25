import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../components/StatusBadge";

describe("StatusBadge", () => {
  it("renders success badge", () => {
    render(<StatusBadge status="success" />);
    expect(screen.getByText("success")).toBeInTheDocument();
  });

  it("renders error badge", () => {
    render(<StatusBadge status="error" />);
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("renders rate_limited badge", () => {
    render(<StatusBadge status="rate_limited" />);
    expect(screen.getByText("rate_limited")).toBeInTheDocument();
  });

  it("renders unknown status as outline badge", () => {
    render(<StatusBadge status="unknown" />);
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });
});
