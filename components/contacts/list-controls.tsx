"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpDown, Check, ListFilter } from "lucide-react";
import type { ListFilter as ListFilterId, SortOption } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "recent", label: "Date added" },
  { id: "updated", label: "Recently updated" },
  { id: "alphabetical", label: "Name A–Z" },
  { id: "reminder", label: "Reminder date" },
];

const FILTER_OPTIONS: { id: ListFilterId; label: string }[] = [
  { id: "all", label: "All contacts" },
  { id: "reminders_due", label: "Reminders due" },
  { id: "willing_to_refer", label: "Willing to refer" },
];

interface ListControlsProps {
  sort: SortOption;
  filter: ListFilterId;
  dueCount: number;
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: ListFilterId) => void;
}

type OpenMenu = "sort" | "filter" | null;

export function ListControls({
  sort,
  filter,
  dueCount,
  onSortChange,
  onFilterChange,
}: ListControlsProps) {
  const [open, setOpen] = useState<OpenMenu>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sortLabelId = useId();
  const filterLabelId = useId();

  const sortLabel =
    SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "Date added";
  const filterLabel =
    FILTER_OPTIONS.find((o) => o.id === filter)?.label ?? "All contacts";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex items-center gap-1">
      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open === "sort"}
          aria-labelledby={sortLabelId}
          onClick={() => setOpen((v) => (v === "sort" ? null : "sort"))}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowUpDown className="size-3.5" />
          <span id={sortLabelId} className="max-w-28 truncate">
            {sortLabel}
          </span>
        </button>
        {open === "sort" && (
          <div
            role="listbox"
            aria-label="Sort by"
            className="absolute right-0 z-50 mt-1 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-md"
          >
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Sort by
            </p>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={sort === option.id}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary",
                  sort === option.id && "text-foreground",
                )}
                onClick={() => {
                  onSortChange(option.id);
                  setOpen(null);
                }}
              >
                {option.label}
                {sort === option.id ? (
                  <Check className="size-3.5 text-primary" />
                ) : (
                  <span className="size-3.5" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open === "filter"}
          aria-labelledby={filterLabelId}
          onClick={() => setOpen((v) => (v === "filter" ? null : "filter"))}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ListFilter className="size-3.5" />
          <span id={filterLabelId} className="max-w-28 truncate">
            {filter === "all" ? "Filter" : filterLabel}
          </span>
        </button>
        {open === "filter" && (
          <div
            role="listbox"
            aria-label="Filter"
            className="absolute right-0 z-50 mt-1 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-md"
          >
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Filter
            </p>
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={filter === option.id}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary",
                  filter === option.id && "text-foreground",
                )}
                onClick={() => {
                  onFilterChange(option.id);
                  setOpen(null);
                }}
              >
                <span>
                  {option.label}
                  {option.id === "reminders_due" && dueCount > 0
                    ? ` (${dueCount})`
                    : ""}
                </span>
                {filter === option.id ? (
                  <Check className="size-3.5 text-primary" />
                ) : (
                  <span className="size-3.5" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
