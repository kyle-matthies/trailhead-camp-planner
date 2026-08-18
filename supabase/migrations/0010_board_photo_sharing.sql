-- Trailhead Camp Planner — 0010 board photo sharing metadata + owner-scoped storage paths

alter table public.board_photos
  add column caption text,
  add column original_name text,
  add column mime_type text,
  add column size_bytes bigint,
  add column width integer,
  add column height integer,
  add column thumbnail_path text,
  add column taken_at timestamptz,
  add column updated_at timestamptz,
  add column metadata jsonb not null default '{}'::jsonb;

alter table public.board_photos
  add constraint board_photos_mime_type_image_chk
    check (mime_type is null or mime_type like 'image/%'),
  add constraint board_photos_size_bytes_chk
    check (size_bytes is null or size_bytes >= 0),
  add constraint board_photos_dimensions_chk
    check (
      (width is null and height is null)
      or (coalesce(width, 0) > 0 and coalesce(height, 0) > 0)
    ),
  add constraint board_photos_storage_path_unique unique (storage_path),
  add constraint board_photos_thumbnail_path_unique unique (thumbnail_path);

create index board_photos_trip_created_idx
  on public.board_photos(trip_id, created_at desc);
create index board_photos_post_created_idx
  on public.board_photos(post_id, created_at);
create index board_photos_uploaded_by_idx
  on public.board_photos(uploaded_by);

create trigger trg_board_photos_updated
  before update on public.board_photos
  for each row execute function public.set_updated_at();

drop policy if exists photos_update on public.board_photos;
create policy photos_update on public.board_photos for update to authenticated
  using (uploaded_by = (select auth.uid()) or private.can_write_trip(trip_id))
  with check (uploaded_by = (select auth.uid()) or private.can_write_trip(trip_id));

-- New app uploads use:
-- trips/<trip_id>/board/<uploaded_by_user_id>/<photo_id>/original.<ext>
-- trips/<trip_id>/board/<uploaded_by_user_id>/<photo_id>/thumb.webp
create or replace function public.storage_photo_owner_id(p_name text) returns uuid
language plpgsql immutable set search_path = '' as $$
declare
  v uuid;
begin
  if coalesce((storage.foldername(p_name))[1], '') <> 'trips'
    or coalesce((storage.foldername(p_name))[3], '') <> 'board' then
    return null;
  end if;

  begin
    v := ((storage.foldername(p_name))[4])::uuid;
  exception when others then
    return null;
  end;

  return v;
end;
$$;

drop policy if exists "trip_photos_select" on storage.objects;
drop policy if exists "trip_photos_insert" on storage.objects;
drop policy if exists "trip_photos_delete" on storage.objects;

create policy "trip_photos_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'trip-photos'
    and private.is_trip_member(public.storage_trip_id(name))
  );

create policy "trip_photos_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trip-photos'
    and private.can_collaborate(public.storage_trip_id(name))
    and public.storage_photo_owner_id(name) = (select auth.uid())
  );

create policy "trip_photos_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'trip-photos'
    and (
      private.can_write_trip(public.storage_trip_id(name))
      or public.storage_photo_owner_id(name) = (select auth.uid())
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.board_photos;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

revoke execute on function public.storage_photo_owner_id(text) from anon;
grant execute on function public.storage_photo_owner_id(text) to authenticated;
