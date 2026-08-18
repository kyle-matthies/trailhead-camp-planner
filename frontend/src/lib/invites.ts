import { getAccessToken } from "./supabase";
import type { TripRole } from "@/lib/types";

const API_URL = (import.meta.env.VITE_AI_API_URL as string) || "http://localhost:8000";

export interface SendTripInviteRequest {
  tripId: string;
  email: string;
  role: Exclude<TripRole, "director">;
}

export interface SendTripInviteResponse {
  invite_id: string;
  token: string;
  email: string;
  role: Exclude<TripRole, "director">;
  invite_url: string;
  email_sent: boolean;
  delivery_error?: string | null;
}

export async function sendTripInvite(
  req: SendTripInviteRequest
): Promise<SendTripInviteResponse> {
  const token = await getAccessToken();
  if (!token) throw new Error("You must be signed in to invite campers.");

  const res = await fetch(`${API_URL}/api/invites/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      trip_id: req.tripId,
      email: req.email,
      role: req.role,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Could not send invite." }));
    throw new Error(err.detail || `Could not send invite (${res.status}).`);
  }
  return res.json();
}
