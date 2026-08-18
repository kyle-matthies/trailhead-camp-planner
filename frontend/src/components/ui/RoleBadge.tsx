import { Crown, Shield, Sprout, User } from "lucide-react";
import type { TripRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const META: Record<
  TripRole,
  { label: string; className: string; Icon: typeof Crown }
> = {
  director: { label: "Camp Director", className: "bg-campfire-100 text-campfire-800", Icon: Crown },
  counselor: { label: "Counselor", className: "bg-forest-100 text-forest-800", Icon: Shield },
  cit: { label: "CIT", className: "bg-sky-100 text-sky-800", Icon: Sprout },
  camper: { label: "Camper", className: "bg-stone-100 text-stone-700", Icon: User },
};

export default function RoleBadge({
  role,
  className,
  showIcon = true,
}: {
  role: TripRole;
  className?: string;
  showIcon?: boolean;
}) {
  const m = META[role];
  const Icon = m.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        m.className,
        className
      )}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {m.label}
    </span>
  );
}
