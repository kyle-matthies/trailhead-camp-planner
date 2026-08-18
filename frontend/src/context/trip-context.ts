import { createContext } from "react";
import type { Trip, TripMember, Profile, TripRole } from "@/lib/types";

export interface MemberWithProfile extends TripMember {
  profile?: Profile;
}

export interface TripContextValue {
  tripId: string;
  trip: Trip | null;
  members: MemberWithProfile[];
  myRole: TripRole | null;
  myMemberId: string | null;
  isLoading: boolean;
  error: string | null;
  /** Resolve a user_id to a display name using the loaded membership roster. */
  nameFor: (userId: string | null | undefined) => string;
}

export const TripContext = createContext<TripContextValue | undefined>(undefined);
