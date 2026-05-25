import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";

describe("LoadingSkeleton", () => {
  it("renders loading skeleton", () => {
    const { container } = render(<LoadingSkeleton />);

    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThanOrEqual(3);
  });
});
