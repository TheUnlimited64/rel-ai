import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FallbackChainBuilderProps {
  items: string[];
  onChange: (items: string[]) => void;
  label?: string;
}

export function FallbackChainBuilder({ items, onChange, label = "Fallback Chain" }: FallbackChainBuilderProps) {
  const [input, setInput] = useState("");

  function addItem() {
    const trimmed = input.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setInput("");
    }
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: "up" | "down") {
    const next = [...items];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    const temp = next[index];
    next[index] = next[target]!;
    next[target] = temp!;
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Model ID"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addItem(); }
          }}
        />
        <Button type="button" variant="outline" onClick={addItem}>Add</Button>
      </div>
      {items.map((item, i) => (
        <div key={`${item}-${i}`} className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm">
          <span className="text-muted-foreground">{i + 1}.</span>
          <span className="flex-1 font-mono">{item}</span>
          <Button type="button" variant="ghost" size="sm" disabled={i === 0} onClick={() => moveItem(i, "up")}>↑</Button>
          <Button type="button" variant="ghost" size="sm" disabled={i === items.length - 1} onClick={() => moveItem(i, "down")}>↓</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>✕</Button>
        </div>
      ))}
    </div>
  );
}
