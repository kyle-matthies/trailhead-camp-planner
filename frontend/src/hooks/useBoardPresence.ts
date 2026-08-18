import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  normalizeBoardPresence,
  type BoardPresenceState,
  type BoardPresenceUser,
} from "@/lib/boardPresence";

interface UseBoardPresenceArgs {
  tripId: string | undefined;
  userId: string | null | undefined;
  name: string;
  typing: boolean;
}

function trackSelf(channel: RealtimeChannel, userId: string, name: string, typing: boolean) {
  void channel.track({
    user_id: userId,
    name: name || "Camper",
    typing,
    typing_at: typing ? new Date().toISOString() : null,
    online_at: new Date().toISOString(),
  });
}

export function useBoardPresence({
  tripId,
  userId,
  name,
  typing,
}: UseBoardPresenceArgs): BoardPresenceUser[] {
  const [users, setUsers] = useState<BoardPresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!tripId || !userId) {
      setUsers([]);
      return;
    }

    const channel = supabase.channel(`trip:${tripId}:board-presence`, {
      config: { private: true, presence: { key: userId } },
    });
    channelRef.current = channel;

    const sync = () => {
      setUsers(normalizeBoardPresence(channel.presenceState() as BoardPresenceState));
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") trackSelf(channel, userId, name, false);
      });

    return () => {
      channelRef.current = null;
      void channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [tripId, userId, name]);

  useEffect(() => {
    if (!channelRef.current || !userId) return;
    trackSelf(channelRef.current, userId, name, typing);
  }, [userId, name, typing]);

  return users;
}
