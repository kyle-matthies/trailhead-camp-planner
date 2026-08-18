import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Subscribe to Supabase Realtime postgres_changes for the given tables scoped to a
 * trip, and invalidate that trip's React Query cache on any change so collaborators
 * see live updates. One channel per (trip, module) — unsubscribes on unmount.
 *
 * RLS governs delivery: a client only receives changes it is allowed to SELECT.
 */
export function useTripRealtime(tripId: string | undefined, tables: string[]) {
  const qc = useQueryClient();
  const tablesKey = tables.join(",");

  useEffect(() => {
    if (!tripId) return;
    const channel = supabase.channel(`trip:${tripId}:${tablesKey}`);
    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `trip_id=eq.${tripId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["trip", tripId] });
        }
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, tablesKey]);
}
