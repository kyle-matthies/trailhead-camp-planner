-- Authorize private Supabase Realtime Presence channels for trip board online/typing.
-- Realtime validates these policies against realtime.messages when a private channel
-- is joined or presence metadata is tracked; messages are not persisted there.

create or replace function private.trip_id_from_realtime_topic(p_topic text)
returns uuid
language sql immutable
set search_path = ''
as $$
  select case
    when p_topic ~* '^trip:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:board-presence$'
      then split_part(p_topic, ':', 2)::uuid
    else null
  end;
$$;

revoke all on function private.trip_id_from_realtime_topic(text) from public;
grant execute on function private.trip_id_from_realtime_topic(text) to authenticated;

drop policy if exists realtime_trip_presence_read on realtime.messages;
drop policy if exists realtime_trip_presence_write on realtime.messages;

create policy realtime_trip_presence_read
on realtime.messages
for select
to authenticated
using (
  private is true
  and extension = 'presence'
  and topic = realtime.topic()
  and private.is_trip_member(private.trip_id_from_realtime_topic(realtime.topic()))
);

create policy realtime_trip_presence_write
on realtime.messages
for insert
to authenticated
with check (
  private is true
  and extension = 'presence'
  and topic = realtime.topic()
  and private.is_trip_member(private.trip_id_from_realtime_topic(realtime.topic()))
);
