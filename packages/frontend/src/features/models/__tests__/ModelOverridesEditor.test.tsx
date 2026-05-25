import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelOverridesEditor } from "../components/ModelOverridesEditor";

import { useState, type ReactNode } from "react";

function StateWrapper({
  initialValue = "",
  initialParsed = {} as Record<string, unknown>,
  children,
}: {
  initialValue?: string;
  initialParsed?: Record<string, unknown>;
  children: (props: {
    value: string;
    onChange: (v: string) => void;
    parsedOverrides: Record<string, unknown> | null;
    onParsedChange: (p: Record<string, unknown> | null) => void;
  }) => ReactNode;
}) {
  const [value, setValue] = useState(initialValue);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(initialParsed);
  return <>{children({ value, onChange: setValue, parsedOverrides: parsed, onParsedChange: setParsed })}</>;
}

describe("ModelOverridesEditor", () => {
  it("renders label and textarea", () => {
    render(
      <ModelOverridesEditor
        value=""
        onChange={vi.fn()}
        parsedOverrides={{}}
        onParsedChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/overrides/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/temperature/)).toBeInTheDocument();
  });

  it("calls onChange when typing", async () => {
    const onChange = vi.fn();
    render(
      <ModelOverridesEditor
        value=""
        onChange={onChange}
        parsedOverrides={{}}
        onParsedChange={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText(/overrides/i);
    await userEvent.type(textarea, "test");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows error for invalid JSON on blur", async () => {
    render(
      <StateWrapper initialValue="{invalid">
        {(props) => <ModelOverridesEditor {...props} />}
      </StateWrapper>,
    );

    await userEvent.click(screen.getByLabelText(/overrides/i));
    await userEvent.tab();

    expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
  });

  it("shows error for valid non-object JSON on blur", async () => {
    render(
      <StateWrapper initialValue="[1,2,3]">
        {(props) => <ModelOverridesEditor {...props} />}
      </StateWrapper>,
    );

    await userEvent.click(screen.getByLabelText(/overrides/i));
    await userEvent.tab();

    expect(screen.getByText("Must be a JSON object")).toBeInTheDocument();
  });

  it("calls onParsedChange with parsed object for valid JSON on blur", async () => {
    const onParsedChange = vi.fn();
    render(
      <ModelOverridesEditor
        value='{"temperature":0.7}'
        onChange={vi.fn()}
        parsedOverrides={{}}
        onParsedChange={onParsedChange}
      />,
    );

    await userEvent.click(screen.getByLabelText(/overrides/i));
    await userEvent.tab();

    expect(onParsedChange).toHaveBeenCalledWith({ temperature: 0.7 });
  });

  it("does not call onParsedChange on blur when textarea is blank", async () => {
    const onParsedChange = vi.fn();
    render(
      <ModelOverridesEditor
        value=""
        onChange={vi.fn()}
        parsedOverrides={{}}
        onParsedChange={onParsedChange}
      />,
    );

    await userEvent.click(screen.getByLabelText(/overrides/i));
    await userEvent.tab();

    expect(onParsedChange).not.toHaveBeenCalled();
  });

  it("uses custom id when provided", () => {
    render(
      <ModelOverridesEditor
        value=""
        onChange={vi.fn()}
        parsedOverrides={{}}
        onParsedChange={vi.fn()}
        id="custom-id"
      />,
    );

    expect(screen.getByLabelText(/overrides/i)).toHaveAttribute("id", "custom-id");
  });
});
