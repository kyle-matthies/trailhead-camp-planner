-- Trailhead Camp Planner — 0008 flexible cost splitting
-- Adds per-expense/per-shopping split rows while keeping `trip_id` denormalized
-- for one-hop RLS and composite FK integrity.

alter table public.expenses
  add constraint expenses_id_trip_id_key unique (id, trip_id);

alter table public.shopping_items
  add constraint shopping_items_id_trip_id_key unique (id, trip_id);

create table public.cost_splits (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  expense_id       uuid,
  shopping_item_id uuid,
  party_id         uuid,
  member_id        uuid,
  amount           numeric(10,2) not null,
  created_by       uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  constraint cost_splits_one_subject check (
    num_nonnulls(expense_id, shopping_item_id) = 1
  ),
  constraint cost_splits_one_target check (
    num_nonnulls(party_id, member_id) = 1
  ),
  constraint cost_splits_amount_nonnegative check (amount >= 0),
  constraint cost_splits_expense_fk foreign key (expense_id, trip_id)
    references public.expenses(id, trip_id) on delete cascade,
  constraint cost_splits_shopping_fk foreign key (shopping_item_id, trip_id)
    references public.shopping_items(id, trip_id) on delete cascade,
  constraint cost_splits_party_fk foreign key (party_id, trip_id)
    references public.trip_parties(id, trip_id) on delete cascade,
  constraint cost_splits_member_fk foreign key (member_id, trip_id)
    references public.trip_members(id, trip_id) on delete cascade
);

create index cost_splits_trip_id_idx on public.cost_splits(trip_id);
create index cost_splits_expense_id_idx on public.cost_splits(expense_id);
create index cost_splits_shopping_item_id_idx on public.cost_splits(shopping_item_id);
create index cost_splits_party_id_idx on public.cost_splits(party_id);
create index cost_splits_member_id_idx on public.cost_splits(member_id);

create unique index cost_splits_expense_party_idx
  on public.cost_splits(expense_id, party_id)
  where expense_id is not null and party_id is not null;
create unique index cost_splits_expense_member_idx
  on public.cost_splits(expense_id, member_id)
  where expense_id is not null and member_id is not null;
create unique index cost_splits_shopping_party_idx
  on public.cost_splits(shopping_item_id, party_id)
  where shopping_item_id is not null and party_id is not null;
create unique index cost_splits_shopping_member_idx
  on public.cost_splits(shopping_item_id, member_id)
  where shopping_item_id is not null and member_id is not null;

create trigger trg_cost_splits_updated
  before update on public.cost_splits
  for each row execute function public.set_updated_at();

-- Custom splits must fully allocate the source cost. This catches API clients
-- that bypass the frontend validation.
create or replace function private.assert_cost_split_total(
  p_trip uuid,
  p_expense uuid,
  p_shopping_item uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_target numeric(10,2);
  v_total  numeric(10,2);
  v_count  int;
begin
  if p_expense is not null then
    select amount into v_target
    from public.expenses
    where id = p_expense and trip_id = p_trip;

    if not found then
      return;
    end if;

    select count(*), coalesce(sum(amount), 0)
      into v_count, v_total
    from public.cost_splits
    where trip_id = p_trip and expense_id = p_expense;

    if v_count > 0 and v_total <> v_target then
      raise exception 'Custom expense splits must add up to the expense amount';
    end if;
  elsif p_shopping_item is not null then
    select actual_cost into v_target
    from public.shopping_items
    where id = p_shopping_item and trip_id = p_trip and purchased;

    if not found or v_target is null then
      return;
    end if;

    select count(*), coalesce(sum(amount), 0)
      into v_count, v_total
    from public.cost_splits
    where trip_id = p_trip and shopping_item_id = p_shopping_item;

    if v_count > 0 and v_total <> v_target then
      raise exception 'Custom shopping splits must add up to the purchased amount';
    end if;
  end if;
end;
$$;

create or replace function private.validate_cost_split_row_total() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.assert_cost_split_total(
    coalesce(new.trip_id, old.trip_id),
    coalesce(new.expense_id, old.expense_id),
    coalesce(new.shopping_item_id, old.shopping_item_id)
  );
  return null;
end;
$$;

create or replace function private.validate_expense_split_total() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.assert_cost_split_total(new.trip_id, new.id, null);
  return null;
end;
$$;

create or replace function private.validate_shopping_split_total() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.assert_cost_split_total(new.trip_id, null, new.id);
  return null;
end;
$$;

create constraint trigger cost_splits_validate_total
  after insert or update or delete on public.cost_splits
  deferrable initially deferred
  for each row execute function private.validate_cost_split_row_total();

create constraint trigger expenses_validate_split_total
  after update of amount on public.expenses
  deferrable initially deferred
  for each row execute function private.validate_expense_split_total();

create constraint trigger shopping_validate_split_total
  after update of actual_cost on public.shopping_items
  deferrable initially deferred
  for each row execute function private.validate_shopping_split_total();

revoke all on function private.assert_cost_split_total(uuid, uuid, uuid) from public;
revoke all on function private.validate_cost_split_row_total() from public;
revoke all on function private.validate_expense_split_total() from public;
revoke all on function private.validate_shopping_split_total() from public;

alter table public.cost_splits enable row level security;
create policy cost_splits_select on public.cost_splits for select to authenticated
  using (private.is_trip_member(trip_id));
create policy cost_splits_insert on public.cost_splits for insert to authenticated
  with check (private.can_collaborate(trip_id) and created_by = (select auth.uid()));
create policy cost_splits_update on public.cost_splits for update to authenticated
  using (private.can_write_trip(trip_id) or created_by = (select auth.uid()))
  with check (private.can_write_trip(trip_id) or created_by = (select auth.uid()));
create policy cost_splits_delete on public.cost_splits for delete to authenticated
  using (private.can_write_trip(trip_id) or created_by = (select auth.uid()));

alter publication supabase_realtime add table public.cost_splits;

-- trip_settlement remains the public, membership-checked RPC. Costs with no
-- custom split rows continue to split equally across the active settlement unit;
-- costs with split rows use those rows as the owed allocation.
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
  v_custom_count int;
begin
  if not private.is_trip_member(p_trip) then
    raise exception 'Not a member of this trip';
  end if;

  select coalesce((select sum(actual_cost) from public.shopping_items where trip_id = p_trip and purchased), 0)
       + coalesce((select sum(amount)      from public.expenses      where trip_id = p_trip), 0)
    into v_total;

  select count(*) into v_party_count from public.trip_parties where trip_id = p_trip;

  with cost_subjects as (
    select 'expense'::text as subject_type, e.id as subject_id
    from public.expenses e
    where e.trip_id = p_trip
    union all
    select 'shopping'::text as subject_type, si.id as subject_id
    from public.shopping_items si
    where si.trip_id = p_trip and si.purchased
  )
  select count(*)
    into v_custom_count
  from cost_subjects c
  where exists (
    select 1
    from public.cost_splits cs
    where cs.trip_id = p_trip
      and (
        (c.subject_type = 'expense' and cs.expense_id = c.subject_id) or
        (c.subject_type = 'shopping' and cs.shopping_item_id = c.subject_id)
      )
  );

  if v_party_count > 0 then
    v_unit := 'party';
    v_fair := round(v_total / v_party_count, 2);

    with cost_subjects as (
      select 'expense'::text as subject_type, e.id as subject_id, e.amount::numeric(12,2) as amount
      from public.expenses e
      where e.trip_id = p_trip
      union all
      select 'shopping'::text as subject_type, si.id as subject_id, si.actual_cost::numeric(12,2) as amount
      from public.shopping_items si
      where si.trip_id = p_trip and si.purchased
    ),
    split_subjects as (
      select c.*,
             exists (
               select 1
               from public.cost_splits cs
               where cs.trip_id = p_trip
                 and (
                   (c.subject_type = 'expense' and cs.expense_id = c.subject_id) or
                   (c.subject_type = 'shopping' and cs.shopping_item_id = c.subject_id)
                 )
             ) as has_custom
      from cost_subjects c
    ),
    unsplit as (
      select coalesce(sum(amount), 0)::numeric(12,2) as total
      from split_subjects
      where not has_custom
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'party_id', pa.id,
      'name', pa.name,
      'paid', paid.amt,
      'fair_share', owed.amt,
      'net', round(paid.amt - owed.amt, 2)
    ) order by pa.name), '[]'::jsonb)
    into v_breakdown
    from public.trip_parties pa
    cross join unsplit u
    cross join lateral (
      select coalesce((
        select sum(e.amount)
        from public.expenses e
        left join public.trip_members pm
          on pm.id = e.paid_by_member_id and pm.trip_id = e.trip_id
        where e.trip_id = p_trip
          and (
            e.paid_by_party_id = pa.id or
            (e.paid_by_party_id is null and pm.party_id = pa.id)
          )
      ), 0)
      + coalesce((
        select sum(si.actual_cost)
        from public.shopping_items si
        left join public.trip_members sm
          on sm.id = si.claimed_by and sm.trip_id = si.trip_id
        where si.trip_id = p_trip
          and si.purchased
          and (
            si.paid_by_party_id = pa.id or
            (si.paid_by_party_id is null and sm.party_id = pa.id)
          )
      ), 0) as amt
    ) paid
    cross join lateral (
      select round((u.total / v_party_count) + coalesce((
        select sum(cs.amount)
        from public.cost_splits cs
        join split_subjects ss
          on (
            (ss.subject_type = 'expense' and cs.expense_id = ss.subject_id) or
            (ss.subject_type = 'shopping' and cs.shopping_item_id = ss.subject_id)
          )
        left join public.trip_members tm
          on tm.id = cs.member_id and tm.trip_id = cs.trip_id
        where cs.trip_id = p_trip
          and ss.has_custom
          and (
            cs.party_id = pa.id or
            (cs.party_id is null and tm.party_id = pa.id)
          )
      ), 0), 2) as amt
    ) owed
    where pa.trip_id = p_trip;
  else
    v_unit := 'member';
    select count(*) into v_member_count from public.trip_members where trip_id = p_trip;
    v_fair := case when v_member_count > 0 then round(v_total / v_member_count, 2) else 0 end;

    with cost_subjects as (
      select 'expense'::text as subject_type, e.id as subject_id, e.amount::numeric(12,2) as amount
      from public.expenses e
      where e.trip_id = p_trip
      union all
      select 'shopping'::text as subject_type, si.id as subject_id, si.actual_cost::numeric(12,2) as amount
      from public.shopping_items si
      where si.trip_id = p_trip and si.purchased
    ),
    split_subjects as (
      select c.*,
             exists (
               select 1
               from public.cost_splits cs
               where cs.trip_id = p_trip
                 and (
                   (c.subject_type = 'expense' and cs.expense_id = c.subject_id) or
                   (c.subject_type = 'shopping' and cs.shopping_item_id = c.subject_id)
                 )
             ) as has_custom
      from cost_subjects c
    ),
    unsplit as (
      select coalesce(sum(amount), 0)::numeric(12,2) as total
      from split_subjects
      where not has_custom
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'member_id', m.id,
      'name', coalesce(nullif(m.display_name,''), pr.name, pr.email, 'Camper'),
      'paid', paid.amt,
      'fair_share', owed.amt,
      'net', round(paid.amt - owed.amt, 2)
    ) order by coalesce(nullif(m.display_name,''), pr.name)), '[]'::jsonb)
    into v_breakdown
    from public.trip_members m
    left join public.profiles pr on pr.id = m.user_id
    cross join unsplit u
    cross join lateral (
      select coalesce((
        select sum(amount)
        from public.expenses e
        where e.paid_by_member_id = m.id
      ), 0)
      + coalesce((
        select sum(actual_cost)
        from public.shopping_items si
        where si.claimed_by = m.id and si.purchased
      ), 0) as amt
    ) paid
    cross join lateral (
      select round((case when v_member_count > 0 then u.total / v_member_count else 0 end) + coalesce((
        select sum(cs.amount)
        from public.cost_splits cs
        join split_subjects ss
          on (
            (ss.subject_type = 'expense' and cs.expense_id = ss.subject_id) or
            (ss.subject_type = 'shopping' and cs.shopping_item_id = ss.subject_id)
          )
        where cs.trip_id = p_trip
          and ss.has_custom
          and cs.member_id = m.id
      ), 0), 2) as amt
    ) owed
    where m.trip_id = p_trip;
  end if;

  return jsonb_build_object(
    'trip_id', p_trip,
    'total_spent', v_total,
    'settle_unit', v_unit,
    'fair_share', v_fair,
    'custom_split_count', v_custom_count,
    'breakdown', v_breakdown
  );
end;
$$;
