-- Trailhead Camp Planner — 0005 security hardening (pins search_path on the three flagged funcs)

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_shopping_purchased() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.purchased = (new.actual_cost is not null);
  return new;
end;
$$;

create or replace function public.storage_trip_id(p_name text) returns uuid
language plpgsql immutable set search_path = '' as $$
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
