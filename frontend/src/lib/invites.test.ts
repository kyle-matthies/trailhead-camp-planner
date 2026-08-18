import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendTripInvite } from "./invites";
import { getAccessToken } from "./supabase";

vi.mock("./supabase", () => ({
  getAccessToken: vi.fn(),
}));

describe("sendTripInvite", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.mocked(getAccessToken).mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("posts invite details with the Supabase access token", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("jwt");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        invite_id: "invite-1",
        token: "token-1",
        email: "friend@example.com",
        role: "cit",
        invite_url: "http://localhost:5173/invite/token-1",
        email_sent: true,
      }),
    });

    const result = await sendTripInvite({
      tripId: "trip-1",
      email: "friend@example.com",
      role: "cit",
    });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/invites/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer jwt",
      },
      body: JSON.stringify({
        trip_id: "trip-1",
        email: "friend@example.com",
        role: "cit",
      }),
    });
    expect(result.email_sent).toBe(true);
  });

  it("requires an authenticated Supabase session", async () => {
    vi.mocked(getAccessToken).mockResolvedValue(null);

    await expect(
      sendTripInvite({
        tripId: "trip-1",
        email: "friend@example.com",
        role: "camper",
      })
    ).rejects.toThrow("You must be signed in to invite campers.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
