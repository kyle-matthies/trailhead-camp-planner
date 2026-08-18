-- Trailhead Camp Planner — 0006 move internal SECURITY DEFINER helpers out of the API-exposed
-- public schema into a private schema (policies/triggers bind by OID, so they keep
-- working). Only the two intentional self-authorizing RPCs remain in public:
--   public.accept_invite(uuid)   -- verifies the caller's email matches the invite
--   public.trip_settlement(uuid) -- checks membership before returning the breakdown

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- Relocate (OID preserved -> existing policies & triggers continue to resolve)
alter function public.is_trip_member(uuid)   set schema private;
alter function public.trip_role(uuid)         set schema private;
alter function public.can_collaborate(uuid)   set schema private;
alter function public.can_write_trip(uuid)    set schema private;
alter function public.is_trip_director(uuid)  set schema private;
alter function public.my_member_id(uuid)      set schema private;
alter function public.shares_any_trip(uuid)   set schema private;
alter function public.handle_new_user()       set schema private;
alter function public.handle_new_trip()       set schema private;

-- Rewire inter-function references now that trip_role lives in private
create or replace function private.can_collaborate(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.trip_role(p_trip) in ('director','counselor','cit');
$$;
create or replace function private.can_write_trip(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.trip_role(p_trip) in ('director','counselor');
$$;
create or replace function private.is_trip_director(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.trip_role(p_trip) = 'director';
$$;

-- trip_settlement stays a public RPC but must call the relocated helper
create or replace function public.trip_settlement(p_trip uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_total        numeric(12,2);
  v_party_count  int;
  v_member_count int;
  v_fair         numeric(12,2);
  v_breakdown    jsonb;
  v_unit         text;
begin
  if not private.is_trip_member(p_trip) then
    raise exception 'Not a member of this trip';
  end if;

  select coalesce((select sum(actual_cost) from public.shopping_items where trip_id = p_trip and purchased), 0)
       + coalesce((select sum(amount)      from public.expenses      where trip_id = p_trip), 0)
    into v_total;

  select count(*) into v_party_count from public.trip_parties where trip_id = p_trip;

  if v_party_count > 0 then
    v_unit := 'party';
    v_fair := round(v_total / v_party_count, 2);
    select coalesce(jsonb_agg(jsonb_build_object(
      'party_id', pa.id, 'name', pa.name, 'paid', paid.amt,
      'fair_share', v_fair, 'net', round(paid.amt - v_fair, 2)
    ) order by pa.name), '[]'::jsonb)
    into v_breakdown
    from public.trip_parties pa
    cross join lateral (
      select coalesce((select sum(amount) from public.expenses e where e.paid_by_party_id = pa.id), 0)
           + coalesce((select sum(actual_cost) from public.shopping_items si where si.paid_by_party_id = pa.id and si.purchased), 0) as amt
    ) paid;
  else
    v_unit := 'member';
    select count(*) into v_member_count from public.trip_members where trip_id = p_trip;
    v_fair := case when v_member_count > 0 then round(v_total / v_member_count, 2) else 0 end;
    select coalesce(jsonb_agg(jsonb_build_object(
      'member_id', m.id,
      'name', coalesce(nullif(m.display_name,''), pr.name, pr.email, 'Camper'),
      'paid', paid.amt, 'fair_share', v_fair, 'net', round(paid.amt - v_fair, 2)
    ) order by coalesce(nullif(m.display_name,''), pr.name)), '[]'::jsonb)
    into v_breakdown
    from public.trip_members m
    left join public.profiles pr on pr.id = m.user_id
    cross join lateral (
      select coalesce((select sum(amount) from public.expenses e where e.paid_by_member_id = m.id), 0)
           + coalesce((select sum(actual_cost) from public.shopping_items si where si.claimed_by = m.id and si.purchased), 0) as amt
    ) paid;
  end if;

  return jsonb_build_object(
    'trip_id', p_trip, 'total_spent', v_total,
    'settle_unit', v_unit, 'fair_share', v_fair, 'breakdown', v_breakdown
  );
end;
$$;

-- Grants on relocated helpers: authenticated only (private schema is not API-exposed)
revoke all on function private.is_trip_member(uuid)   from public;
revoke all on function private.trip_role(uuid)        from public;
revoke all on function private.can_collaborate(uuid)  from public;
revoke all on function private.can_write_trip(uuid)   from public;
revoke all on function private.is_trip_director(uuid) from public;
revoke all on function private.my_member_id(uuid)     from public;
revoke all on function private.shares_any_trip(uuid)  from public;
revoke all on function private.handle_new_user()      from public;
revoke all on function private.handle_new_trip()      from public;

grant execute on function private.is_trip_member(uuid)   to authenticated;
grant execute on function private.trip_role(uuid)        to authenticated;
grant execute on function private.can_collaborate(uuid)  to authenticated;
grant execute on function private.can_write_trip(uuid)   to authenticated;
grant execute on function private.is_trip_director(uuid) to authenticated;
grant execute on function private.my_member_id(uuid)     to authenticated;
grant execute on function private.shares_any_trip(uuid)  to authenticated;
