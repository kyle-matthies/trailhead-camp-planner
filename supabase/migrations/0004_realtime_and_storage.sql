-- Trailhead Camp Planner — 0004 realtime publication + storage scaffold (photos deferred)

-- ---------- realtime: broadcast collaborative tables (RLS still gates delivery) ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.board_posts,
      public.board_replies,
      public.shopping_items,
      public.trip_shared_gear,
      public.site_camper_assignments,
      public.trip_members,
      public.expenses,
      public.tents,
      public.vehicles,
      public.campsites;
  end if;
end $$;

-- ---------- storage: private trip-photos bucket (scaffold, no UI in Phase 1) ----------
insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', false)
on conflict (id) do nothing;

-- Safe path->trip_id parser: expects 'trips/<uuid>/...'; returns null on any malformed path.
-- (search_path pinned in 0005)
create or replace function public.storage_trip_id(p_name text) returns uuid
language plpgsql immutable as $$
declare
  v uuid;
begin
  if coalesce((storage.foldername(p_name))[1], '') <> 'trips' then
    return null;
  end if;
  begin
    v := ((storage.foldername(p_name))[2])::uuid;
  exception when others then
    return null;
  end;
  return v;
end;
$$;

create policy "trip_photos_select" on storage.objects for select to authenticated
  using (bucket_id = 'trip-photos' and public.is_trip_member(public.storage_trip_id(name)));
create policy "trip_photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-photos' and public.can_collaborate(public.storage_trip_id(name)));
create policy "trip_photos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'trip-photos' and public.can_collaborate(public.storage_trip_id(name)));
