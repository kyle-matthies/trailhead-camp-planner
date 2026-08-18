// Convenient aliases over the generated Supabase types. Import these in features
// instead of reaching into database.types directly.
import type { Database, Tables, Enums } from "./database.types";

export type Trip = Tables<"trips">;
export type TripMember = Tables<"trip_members">;
export type TripInvite = Tables<"trip_invites">;
export type TripParty = Tables<"trip_parties">;
export type Campground = Tables<"campgrounds">;
export type Campsite = Tables<"campsites">;
export type Tent = Tables<"tents">;
export type Vehicle = Tables<"vehicles">;
export type SiteAssignment = Tables<"site_camper_assignments">;
export type SharedGear = Tables<"trip_shared_gear">;
export type ShoppingItem = Tables<"shopping_items">;
export type Expense = Tables<"expenses">;
export type CostSplit = Tables<"cost_splits">;
export type BoardPost = Tables<"board_posts">;
export type BoardReply = Tables<"board_replies">;
export type BoardPhoto = Tables<"board_photos">;
export type GearItem = Tables<"gear_items">;
export type PackingItem = Tables<"trip_packing_items">;
export type Profile = Tables<"profiles">;

export type TripRole = Enums<"trip_role">;
export type ItemSource = Enums<"item_source">;
export type InviteStatus = Enums<"invite_status">;

/** Role ordering for permission checks (higher index = more privileged). */
export const ROLE_ORDER: TripRole[] = ["camper", "cit", "counselor", "director"];

export function roleAtLeast(role: TripRole | null | undefined, min: TripRole): boolean {
  if (!role) return false;
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(min);
}

/** Settlement breakdown shape returned by the trip_settlement RPC. */
export interface SettlementEntry {
  party_id?: string;
  member_id?: string;
  name: string;
  paid: number;
  fair_share: number;
  net: number;
}
export interface Settlement {
  trip_id: string;
  total_spent: number;
  settle_unit: "party" | "member";
  fair_share: number;
  custom_split_count?: number;
  breakdown: SettlementEntry[];
}

export type { Database };
