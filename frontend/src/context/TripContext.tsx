import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/useAuth";
import type { Trip, Profile } from "@/lib/types";
import { TripContext, type MemberWithProfile, type TripContextValue } from "@/context/trip-context";

export function TripProvider({
  tripId,
  children,
}: {
  tripId: string;
  children: ReactNode;
}) {
  const { user } = useAuth();

  const tripQ = useQuery({
    queryKey: ["trip", tripId, "trip"],
    queryFn: async (): Promise<Trip> => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const membersQ = useQuery({
    queryKey: ["trip", tripId, "members"],
    queryFn: async (): Promise<MemberWithProfile[]> => {
      const { data: members, error } = await supabase
        .from("trip_members")
        .select("*")
        .eq("trip_id", tripId);
      if (error) throw error;
      const ids = (members ?? []).map((m) => m.user_id);
      let profiles: Profile[] = [];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("*")
          .in("id", ids);
        profiles = profs ?? [];
      }
      const byId = new Map(profiles.map((p) => [p.id, p]));
      return (members ?? []).map((m) => ({ ...m, profile: byId.get(m.user_id) }));
    },
  });

  const members = membersQ.data ?? [];
  const mine = members.find((m) => m.user_id === user?.id);

  function nameFor(userId: string | null | undefined): string {
    if (!userId) return "Someone";
    const m = members.find((mm) => mm.user_id === userId);
    return m?.display_name || m?.profile?.name || m?.profile?.email || "Camper";
  }

  const value: TripContextValue = {
    tripId,
    trip: tripQ.data ?? null,
    members,
    myRole: mine?.role ?? null,
    myMemberId: mine?.id ?? null,
    isLoading: tripQ.isLoading || membersQ.isLoading,
    error: tripQ.error || membersQ.error ? "Failed to load trip" : null,
    nameFor,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
