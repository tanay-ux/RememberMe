"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllTags } from "@/lib/db/contacts";
import type { Tag } from "@/lib/db/schema";
import { TAG_COLORS } from "@/lib/db/schema";

interface TagPickerProps {
  selected: string[];
  onChange: (tags: string[]) => void;
}

export function TagPicker({ selected, onChange }: TagPickerProps) {
  const [existingTags, setExistingTags] = useState<Tag[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    void getAllTags().then(setExistingTags);
  }, [selected]);

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (selected.some((t) => t.toLowerCase() === lower)) {
      setInput("");
      return;
    }
    onChange([...selected, trimmed]);
    setInput("");
  }

  function removeTag(name: string) {
    onChange(selected.filter((t) => t !== name));
  }

  const suggestions = existingTags.filter(
    (t) =>
      !selected.some((s) => s.toLowerCase() === t.name.toLowerCase()) &&
      (!input || t.name.toLowerCase().includes(input.toLowerCase())),
  );

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag, i) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1"
              style={{
                backgroundColor: `${TAG_COLORS[i % TAG_COLORS.length]}20`,
                color: TAG_COLORS[i % TAG_COLORS.length],
                borderColor: `${TAG_COLORS[i % TAG_COLORS.length]}40`,
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-sm hover:bg-black/10 p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a tag (e.g. React Summit 2026)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => addTag(input)}
        >
          Add
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, 8).map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => addTag(tag.name)}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
