import { Plus, Pencil, Trash2 } from "lucide-react";
import type { PlannedChange } from "@/lib/aiClient";
import { cn } from "@/lib/utils";

const OP_META = {
  insert: { Icon: Plus, className: "text-forest-600" },
  update: { Icon: Pencil, className: "text-sky-600" },
  delete: { Icon: Trash2, className: "text-red-600" },
} as const;

/**
 * Renders the agent's proposed changes with per-row checkboxes. The human reviews
 * and confirms before anything is written — the core AI write-safety control.
 */
export default function AIPreviewCard({
  changes,
  selected,
  onToggle,
}: {
  changes: PlannedChange[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  if (changes.length === 0) return null;
  return (
    <ul className="divide-y divide-stone-100 border border-stone-200 rounded-lg overflow-hidden">
      {changes.map((c) => {
        const meta = OP_META[c.op] ?? OP_META.update;
        const Icon = meta.Icon;
        return (
          <li key={c.id} className="flex items-start gap-2 p-2.5 bg-white">
            <input
              type="checkbox"
              checked={selected[c.id] ?? true}
              onChange={() => onToggle(c.id)}
              className="mt-0.5 accent-forest-600"
            />
            <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", meta.className)} />
            <span className="text-sm text-stone-700">{c.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
