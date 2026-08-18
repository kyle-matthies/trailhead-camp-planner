import type { ReactNode } from "react";
import { roleAtLeast, type TripRole } from "@/lib/types";

/**
 * Renders `children` only when `role` is at least `min`. UX hint only — RLS is the
 * real enforcement gate on the server. Pure (role passed in) for easy testing.
 */
export default function PermissionGate({
  role,
  min,
  children,
  fallback = null,
}: {
  role: TripRole | null | undefined;
  min: TripRole;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <>{roleAtLeast(role, min) ? children : fallback}</>;
}
