export interface BoardPresenceMeta {
  user_id?: string;
  name?: string;
  typing?: boolean;
  typing_at?: string | null;
  online_at?: string;
}

export interface BoardPresenceUser {
  userId: string;
  name: string;
  typing: boolean;
  typingAt: string | null;
  onlineAt: string;
}

export type BoardPresenceState = Record<string, BoardPresenceMeta[]>;

function newer(a: string | null | undefined, b: string | null | undefined): boolean {
  return new Date(a || 0).getTime() > new Date(b || 0).getTime();
}

export function normalizeBoardPresence(state: BoardPresenceState): BoardPresenceUser[] {
  const byUser = new Map<string, BoardPresenceUser>();

  for (const metas of Object.values(state)) {
    for (const meta of metas) {
      if (!meta.user_id) continue;
      const current = byUser.get(meta.user_id);
      const next: BoardPresenceUser = {
        userId: meta.user_id,
        name: meta.name?.trim() || "Camper",
        typing: Boolean(meta.typing),
        typingAt: meta.typing_at ?? null,
        onlineAt: meta.online_at || "",
      };
      if (!current || newer(next.onlineAt, current.onlineAt)) {
        byUser.set(meta.user_id, next);
      }
    }
  }

  return [...byUser.values()].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    return byName || a.userId.localeCompare(b.userId);
  });
}

export function typingSummary(users: BoardPresenceUser[], currentUserId?: string | null): string {
  const names = users
    .filter((user) => user.userId !== currentUserId && user.typing)
    .map((user) => user.name);

  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing...`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
  return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`;
}
