import { describe, expect, it } from "vitest";
import { normalizeBoardPresence, typingSummary } from "./boardPresence";

describe("boardPresence", () => {
  it("normalizes realtime presence state by user and keeps the latest metadata", () => {
    const users = normalizeBoardPresence({
      "user-a": [
        {
          user_id: "user-a",
          name: "Morgan",
          typing: false,
          online_at: "2026-06-10T05:00:00.000Z",
        },
        {
          user_id: "user-a",
          name: "Morgan",
          typing: true,
          typing_at: "2026-06-10T05:01:00.000Z",
          online_at: "2026-06-10T05:01:00.000Z",
        },
      ],
      "user-b": [
        {
          user_id: "user-b",
          name: "Rowan",
          typing: false,
          online_at: "2026-06-10T05:00:30.000Z",
        },
      ],
    });

    expect(users).toEqual([
      {
        userId: "user-a",
        name: "Morgan",
        typing: true,
        typingAt: "2026-06-10T05:01:00.000Z",
        onlineAt: "2026-06-10T05:01:00.000Z",
      },
      {
        userId: "user-b",
        name: "Rowan",
        typing: false,
        typingAt: null,
        onlineAt: "2026-06-10T05:00:30.000Z",
      },
    ]);
  });

  it("summarizes other campers who are typing", () => {
    const users = [
      {
        userId: "me",
        name: "Rowan",
        typing: true,
        typingAt: "2026-06-10T05:00:00.000Z",
        onlineAt: "2026-06-10T05:00:00.000Z",
      },
      {
        userId: "morgan",
        name: "Morgan",
        typing: true,
        typingAt: "2026-06-10T05:00:00.000Z",
        onlineAt: "2026-06-10T05:00:00.000Z",
      },
      {
        userId: "friend",
        name: "Sam",
        typing: true,
        typingAt: "2026-06-10T05:00:00.000Z",
        onlineAt: "2026-06-10T05:00:00.000Z",
      },
    ];

    expect(typingSummary(users, "me")).toBe("Morgan and Sam are typing...");
    expect(typingSummary(users, "morgan")).toBe("Rowan and Sam are typing...");
  });
});
