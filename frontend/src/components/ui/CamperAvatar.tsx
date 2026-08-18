import { cn } from "@/lib/utils";

const COLORS = [
  "bg-forest-200 text-forest-800",
  "bg-sky-200 text-sky-800",
  "bg-campfire-200 text-campfire-900",
  "bg-sand-200 text-sand-800",
  "bg-rose-200 text-rose-800",
  "bg-violet-200 text-violet-800",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export default function CamperAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full w-8 h-8 text-xs font-semibold select-none",
        colorFor(name),
        className
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
