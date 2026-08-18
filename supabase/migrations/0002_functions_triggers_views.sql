-- Trailhead Camp Planner — 0002 functions, triggers, views
-- NOTE: the internal membership helpers below are relocated to a `private` schema
-- in 0006 (they bind to policies/triggers by OID, so the move is transparent).

-- ============ updated_at maintainer ============
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_trips_updated       before update on public.trips            for each row execute function public.set_updated_at();
create trigger trg_campgrounds_updated before update on public.campgrounds      for each row execute function public.set_updated_at();
create trigger trg_campsites_updated   before update on public.campsites        for each row execute function public.set_updated_at();
create trigger trg_tents_updated       before update on public.tents            for each row execute function public.set_updated_at();
create trigger trg_vehicles_updated    before update on public.vehicles         for each row execute function public.set_updated_at();
create trigger trg_shared_gear_updated before update on public.trip_shared_gear for each row execute function public.set_updated_at();
create trigger trg_shopping_updated    before update on public.shopping_items   for each row execute function public.set_updated_at();
create trigger trg_expenses_updated    before update on public.expenses         for each row execute function public.set_updated_at();
create trigger trg_board_posts_updated before update on public.board_posts      for each row execute function public.set_updated_at();

-- ============ profile auto-creation on signup ============
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email,
          coalesce(nullif(new.raw_user_meta_data ->> 'name',''), split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ owner becomes director member on trip creation ============
create or replace function public.handle_new_trip() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'director')
  on conflict (trip_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- ============ shopping: purchased derived from actual_cost ============
create or replace function public.sync_shopping_purchased() returns trigger
language plpgsql as $$
begin
  new.purchased = (new.actual_cost is not null);
  return new;
end;
$$;

create trigger trg_shopping_sync before insert or update on public.shopping_items
  for each row execute function public.sync_shopping_purchased();

-- ============ membership helpers (SECURITY DEFINER -> no RLS recursion) ============
create or replace function public.is_trip_member(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trip_members where trip_id = p_trip and user_id = (select auth.uid()));
$$;

create or replace function public.trip_role(p_trip uuid) returns public.trip_role
language sql stable security definer set search_path = public as $$
  select role from public.trip_members where trip_id = p_trip and user_id = (select auth.uid()) limit 1;
$$;

create or replace function public.can_collaborate(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.trip_role(p_trip) in ('director','counselor','cit');
$$;

create or replace function public.can_write_trip(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.trip_role(p_trip) in ('director','counselor');
$$;

create or replace function public.is_trip_director(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.trip_role(p_trip) = 'director';
$$;

create or replace function public.my_member_id(p_trip uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.trip_members where trip_id = p_trip and user_id = (select auth.uid()) limit 1;
$$;

create or replace function public.shares_any_trip(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trip_members m1
    join public.trip_members m2 on m1.trip_id = m2.trip_id
    where m1.user_id = (select auth.uid()) and m2.user_id = p_other
  );
$$;

-- ============ accept_invite RPC (atomic, idempotent, email-verified) ============
create or replace function public.accept_invite(p_token uuid)
returns public.trip_members
language plpgsql security definer set search_path = public as $$
declare
  v_invite public.trip_invites;
  v_email  text;
  v_member public.trip_members;
begin
  select * into v_invite from public.trip_invites where token = p_token;
  if not found then
    raise exception 'Invite not found';
  end if;

  v_email := lower(coalesce((select auth.jwt()) ->> 'email', ''));
  if v_email = '' then
    raise exception 'No authenticated email on session';
  end if;
  if lower(v_invite.email) <> v_email then
    raise exception 'This invite was issued to a different email address';
  end if;

  select * into v_member from public.trip_members
    where trip_id = v_invite.trip_id and user_id = (select auth.uid());
  if found then
    update public.trip_invites set status = 'accepted', accepted_at = now()
      where id = v_invite.id and status = 'pending';
    return v_member;
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Invite is no longer pending';
  end if;

  insert into public.trip_members (trip_id, user_id, role, party_id)
  values (v_invite.trip_id, (select auth.uid()), v_invite.role, v_invite.party_id)
  returning * into v_member;

  update public.trip_invites set status = 'accepted', accepted_at = now()
    where id = v_invite.id;

  return v_member;
end;
$$;

-- ============ trip_settlement RPC (party-based, member fallback) ============
-- (re-created in 0006 to call private.is_trip_member after the helper relocation)
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
  if not public.is_trip_member(p_trip) then
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

-- ============ settlement convenience view (respects RLS) ============
create view public.trip_party_totals with (security_invoker = true) as
select pa.trip_id, pa.id as party_id, pa.name,
  coalesce((select sum(amount) from public.expenses e where e.paid_by_party_id = pa.id), 0)
  + coalesce((select sum(actual_cost) from public.shopping_items si where si.paid_by_party_id = pa.id and si.purchased), 0) as paid
from public.trip_parties pa;

revoke execute on function public.accept_invite(uuid)   from anon;
revoke execute on function public.trip_settlement(uuid) from anon;
grant  execute on function public.accept_invite(uuid)   to authenticated;
grant  execute on function public.trip_settlement(uuid) to authenticated;
