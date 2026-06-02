import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogRow } from "../components/LogRow";
import type { LogEntry } from "../api";

const successLog: LogEntry = {
  id: "log-1",
  endpointId: "ep-12345678",
  requestedModel: "gpt-4",
  resolvedModel: "gpt-4-0613",
  providerId: "prov-12345678",
  promptTokens: 100,
  completionTokens: 50,
  latencyMs: 1200,
  status: "success",
  errorDetail: null,
  createdAt: "2024-01-15T10:30:00Z",
};

const errorLog: LogEntry = {
  id: "log-2",
  endpointId: "ep-87654321",
  requestedModel: "claude-3",
  resolvedModel: null,
  providerId: "prov-87654321",
  promptTokens: 0,
  completionTokens: 0,
  latencyMs: null,
  status: "error",
  errorDetail: "Rate limit exceeded",
  createdAt: "2024-01-15T11:00:00Z",
};

const nullFieldsLog: LogEntry = {
  id: "log-3",
  endpointId: null,
  requestedModel: "gpt-3.5",
  resolvedModel: null,
  providerId: null,
  promptTokens: null,
  completionTokens: null,
  latencyMs: null,
  status: "success",
  errorDetail: null,
  createdAt: "2024-01-15T12:00:00Z",
};

describe("LogRow", () => {
  it("renders log row with success data", () => {
    render(
      <table>
        <tbody>
          <LogRow log={successLog} expanded={false} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByText("gpt-4")).toBeInTheDocument();
    expect(screen.getByText("gpt-4-0613")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("1200ms")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();
  });

  it("renders dash for null resolvedModel", () => {
    render(
      <table>
        <tbody>
          <LogRow log={errorLog} expanded={false} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders dash for null tokens and latency", () => {
    render(
      <table>
        <tbody>
          <LogRow log={nullFieldsLog} expanded={false} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByText("gpt-3.5")).toBeInTheDocument();
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("shows expanded detail with error when expanded", () => {
    render(
      <table>
        <tbody>
          <LogRow log={errorLog} expanded={true} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("log-2")).toBeInTheDocument();
    expect(screen.getByText("Prompt Tokens")).toBeInTheDocument();
    expect(screen.getByText("Completion Tokens")).toBeInTheDocument();
  });

  it("does not show expanded detail when not expanded", () => {
    render(
      <table>
        <tbody>
          <LogRow log={errorLog} expanded={false} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.queryByText("Rate limit exceeded")).not.toBeInTheDocument();
  });

  it("does not show error section in expanded view when no errorDetail", () => {
    render(
      <table>
        <tbody>
          <LogRow log={successLog} expanded={true} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.queryByText("Error:")).not.toBeInTheDocument();
  });

  it("calls onToggle when row clicked", async () => {
    const onToggle = vi.fn();
    render(
      <table>
        <tbody>
          <LogRow log={successLog} expanded={false} onToggle={onToggle} />
        </tbody>
      </table>,
    );

    const row = screen.getByText("gpt-4").closest("tr")!;
    await userEvent.click(row);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("triggers onToggle on Enter keydown", () => {
    const onToggle = vi.fn();
    render(
      <table>
        <tbody>
          <LogRow log={successLog} expanded={false} onToggle={onToggle} />
        </tbody>
      </table>,
    );

    const row = screen.getByText("gpt-4").closest("tr")!;
    row.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("has aria-expanded attribute matching expanded prop", () => {
    const { rerender } = render(
      <table>
        <tbody>
          <LogRow log={successLog} expanded={false} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );

    const row = screen.getByText("gpt-4").closest("tr")!;
    expect(row).toHaveAttribute("aria-expanded", "false");

    rerender(
      <table>
        <tbody>
          <LogRow log={successLog} expanded={true} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );

    expect(row).toHaveAttribute("aria-expanded", "true");
  });
});
