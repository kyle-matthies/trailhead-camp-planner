-- ============================================================================
-- RLS verification harness for Trailhead Camp Planner. Runs in one explicit transaction and
-- rolls back at the end. Safe to run repeatedly against the live project via
-- `execute_sql` or `psql`. Asserts cross-tenant isolation + the full role ladder.
--
-- Users: A(director/owner) B(role-escalation subject) C(invitee) D(non-member)
-- Expected result row: 'ALL 33 RLS ASSERTIONS PASSED'
-- ============================================================================
begin;

delete from auth.users where id in (
  'a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002',
  'c0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000004');

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('a0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls_a@test.dev','{}','{}',now(),now()),
 ('b0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls_b@test.dev','{}','{}',now(),now()),
 ('c0000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls_c@test.dev','{}','{}',now(),now()),
 ('d0000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls_d@test.dev','{}','{}',now(),now());

set local role authenticated;

-- A creates a trip; owner auto-becomes director (trigger)
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","email":"rls_a@test.dev","role":"authenticated"}', true);
insert into public.trips (id, owner_id, name, start_date, end_date)
  values ('70000000-0000-4000-8000-000000000010','a0000000-0000-4000-8000-000000000001','RLS Trip', current_date, current_date + 2);
do $$ begin
  if (select role from public.trip_members where trip_id='70000000-0000-4000-8000-000000000010' and user_id='a0000000-0000-4000-8000-000000000001') is distinct from 'director'::public.trip_role then
    raise exception 'FAIL 1: trip owner not auto-director'; end if;
end $$;
insert into public.shopping_items (id, trip_id, name, estimated_cost, created_by)
  values ('70000000-0000-4000-8000-000000000011','70000000-0000-4000-8000-000000000010','Buns', 4.00, 'a0000000-0000-4000-8000-000000000001');

-- B (non-member): cannot see or insert
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000002","email":"rls_b@test.dev","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.trips where id='70000000-0000-4000-8000-000000000010') <> 0 then raise exception 'FAIL 2: non-member can SEE trip'; end if;
  if (select count(*) from public.shopping_items where trip_id='70000000-0000-4000-8000-000000000010') <> 0 then raise exception 'FAIL 3: non-member can SEE shopping'; end if;
  begin
    insert into public.shopping_items (trip_id, name, created_by) values ('70000000-0000-4000-8000-000000000010','hack','b0000000-0000-4000-8000-000000000002');
    raise exception 'FAIL 4: non-member INSERTED shopping';
  exception when insufficient_privilege then null; end;
end $$;

-- A adds B as camper (read-only)
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","email":"rls_a@test.dev","role":"authenticated"}', true);
insert into public.trip_members (trip_id, user_id, role) values ('70000000-0000-4000-8000-000000000010','b0000000-0000-4000-8000-000000000002','camper');

-- B (camper): read yes, write no
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000002","email":"rls_b@test.dev","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.trips where id='70000000-0000-4000-8000-000000000010') <> 1 then raise exception 'FAIL 5: camper cannot see trip'; end if;
  begin
    insert into public.shopping_items (trip_id, name, created_by) values ('70000000-0000-4000-8000-000000000010','camper-item','b0000000-0000-4000-8000-000000000002');
    raise exception 'FAIL 6: camper INSERTED shopping';
  exception when insufficient_privilege then null; end;
end $$;

-- A promotes B to CIT
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","email":"rls_a@test.dev","role":"authenticated"}', true);
update public.trip_members set role='cit' where trip_id='70000000-0000-4000-8000-000000000010' and user_id='b0000000-0000-4000-8000-000000000002';

-- B (CIT): insert + claim yes, delete no
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000002","email":"rls_b@test.dev","role":"authenticated"}', true);
do $$ begin
  insert into public.shopping_items (trip_id, name, created_by) values ('70000000-0000-4000-8000-000000000010','cit-item','b0000000-0000-4000-8000-000000000002');
  update public.shopping_items set claimed_by = private.my_member_id('70000000-0000-4000-8000-000000000010') where id='70000000-0000-4000-8000-000000000011';
  if (select claimed_by from public.shopping_items where id='70000000-0000-4000-8000-000000000011') is null then raise exception 'FAIL 7: CIT could not claim'; end if;
  delete from public.shopping_items where id='70000000-0000-4000-8000-000000000011';
  if (select count(*) from public.shopping_items where id='70000000-0000-4000-8000-000000000011') <> 1 then raise exception 'FAIL 8: CIT DELETED item'; end if;
end $$;

-- A promotes B to counselor; counselor can delete but not manage members
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","email":"rls_a@test.dev","role":"authenticated"}', true);
update public.trip_members set role='counselor' where trip_id='70000000-0000-4000-8000-000000000010' and user_id='b0000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000002","email":"rls_b@test.dev","role":"authenticated"}', true);
do $$ begin
  begin
    insert into public.trip_members (trip_id, user_id, role) values ('70000000-0000-4000-8000-000000000010','d0000000-0000-4000-8000-000000000004','camper');
    raise exception 'FAIL 9: counselor added member (director-only)';
  exception when insufficient_privilege then null; end;
  delete from public.shopping_items where id='70000000-0000-4000-8000-000000000011';
  if (select count(*) from public.shopping_items where id='70000000-0000-4000-8000-000000000011') <> 0 then raise exception 'FAIL 10: counselor could not delete'; end if;
end $$;

-- accept_invite: wrong email rejected, correct email accepted
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","email":"rls_a@test.dev","role":"authenticated"}', true);
insert into public.trip_invites (id, trip_id, email, role, invited_by, token)
  values ('70000000-0000-4000-8000-000000000012','70000000-0000-4000-8000-000000000010','rls_c@test.dev','cit','a0000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000013');
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000002","email":"rls_b@test.dev","role":"authenticated"}', true);
do $$ begin
  begin
    perform public.accept_invite('70000000-0000-4000-8000-000000000013');
    raise exception 'FAIL 11: wrong-email accept succeeded';
  exception when others then if SQLERRM like '%different email%' then null; else raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000003","email":"rls_c@test.dev","role":"authenticated"}', true);
do $$ begin
  perform public.accept_invite('70000000-0000-4000-8000-000000000013');
  if (select count(*) from public.trip_members where trip_id='70000000-0000-4000-8000-000000000010' and user_id='c0000000-0000-4000-8000-000000000003') <> 1 then raise exception 'FAIL 12: accept_invite no membership'; end if;
  if (select status from public.trip_invites where id='70000000-0000-4000-8000-000000000012') <> 'accepted' then raise exception 'FAIL 13: invite not accepted'; end if;
end $$;

-- settlement: non-member blocked; custom split party math correct
select set_config('request.jwt.claims','{"sub":"d0000000-0000-4000-8000-000000000004","email":"rls_d@test.dev","role":"authenticated"}', true);
do $$ begin
  begin
    perform public.trip_settlement('70000000-0000-4000-8000-000000000010');
    raise exception 'FAIL 14: non-member ran settlement';
  exception when others then if SQLERRM like '%Not a member%' then null; else raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","email":"rls_a@test.dev","role":"authenticated"}', true);
insert into public.trip_parties (id, trip_id, name) values ('70000000-0000-4000-8000-000000000014','70000000-0000-4000-8000-000000000010','The As');
insert into public.trip_parties (id, trip_id, name) values ('70000000-0000-4000-8000-000000000015','70000000-0000-4000-8000-000000000010','The Bs');
update public.trip_members
  set party_id = '70000000-0000-4000-8000-000000000014'
  where trip_id='70000000-0000-4000-8000-000000000010'
    and user_id='a0000000-0000-4000-8000-000000000001';
update public.trip_members
  set party_id = '70000000-0000-4000-8000-000000000015'
  where trip_id='70000000-0000-4000-8000-000000000010'
    and user_id='b0000000-0000-4000-8000-000000000002';
insert into public.expenses (id, trip_id, description, amount, paid_by_party_id, created_by)
  values ('70000000-0000-4000-8000-000000000016','70000000-0000-4000-8000-000000000010','Firewood', 20.00, '70000000-0000-4000-8000-000000000014','a0000000-0000-4000-8000-000000000001');
insert into public.cost_splits (trip_id, expense_id, party_id, amount, created_by)
  values
    ('70000000-0000-4000-8000-000000000010','70000000-0000-4000-8000-000000000016','70000000-0000-4000-8000-000000000014',15.00,'a0000000-0000-4000-8000-000000000001'),
    ('70000000-0000-4000-8000-000000000010','70000000-0000-4000-8000-000000000016','70000000-0000-4000-8000-000000000015',5.00,'a0000000-0000-4000-8000-000000000001');
do $$ declare r jsonb; a jsonb; b jsonb; begin
  r := public.trip_settlement('70000000-0000-4000-8000-000000000010');
  if (r->>'total_spent')::numeric <> 20.00 then raise exception 'FAIL 15: settlement total wrong: %', r->>'total_spent'; end if;
  if (r->>'settle_unit') <> 'party' then raise exception 'FAIL 16: settle_unit not party'; end if;
  select value into a from jsonb_array_elements(r->'breakdown') value where value->>'party_id' = '70000000-0000-4000-8000-000000000014';
  select value into b from jsonb_array_elements(r->'breakdown') value where value->>'party_id' = '70000000-0000-4000-8000-000000000015';
  if (a->>'fair_share')::numeric <> 15.00 then raise exception 'FAIL 17: custom A share wrong: %', a->>'fair_share'; end if;
  if (a->>'net')::numeric <> 5.00 then raise exception 'FAIL 18: custom A net wrong: %', a->>'net'; end if;
  if (b->>'fair_share')::numeric <> 5.00 then raise exception 'FAIL 19: custom B share wrong: %', b->>'fair_share'; end if;
  if (b->>'net')::numeric <> -5.00 then raise exception 'FAIL 20: custom B net wrong: %', b->>'net'; end if;
end $$;
insert into public.shopping_items (id, trip_id, name, actual_cost, claimed_by, created_by)
  values (
    '70000000-0000-4000-8000-000000000018',
    '70000000-0000-4000-8000-000000000010',
    'Breakfast',
    10.00,
    (select id from public.trip_members where trip_id='70000000-0000-4000-8000-000000000010' and user_id='b0000000-0000-4000-8000-000000000002'),
    'a0000000-0000-4000-8000-000000000001'
  );
insert into public.cost_splits (trip_id, shopping_item_id, party_id, amount, created_by)
  values
    ('70000000-0000-4000-8000-000000000010','70000000-0000-4000-8000-000000000018','70000000-0000-4000-8000-000000000014',2.00,'a0000000-0000-4000-8000-000000000001'),
    ('70000000-0000-4000-8000-000000000010','70000000-0000-4000-8000-000000000018','70000000-0000-4000-8000-000000000015',8.00,'a0000000-0000-4000-8000-000000000001');
do $$ declare r jsonb; a jsonb; b jsonb; begin
  r := public.trip_settlement('70000000-0000-4000-8000-000000000010');
  select value into a from jsonb_array_elements(r->'breakdown') value where value->>'party_id' = '70000000-0000-4000-8000-000000000014';
  select value into b from jsonb_array_elements(r->'breakdown') value where value->>'party_id' = '70000000-0000-4000-8000-000000000015';
  if (r->>'total_spent')::numeric <> 30.00 then raise exception 'FAIL 21: shopping settlement total wrong: %', r->>'total_spent'; end if;
  if (b->>'fair_share')::numeric <> 13.00 then raise exception 'FAIL 22: custom shopping B share wrong: %', b->>'fair_share'; end if;
end $$;
insert into public.trip_parties (id, trip_id, name) values ('70000000-0000-4000-8000-000000000017','70000000-0000-4000-8000-000000000010','The Cs');
select set_config('request.jwt.claims','{"sub":"d0000000-0000-4000-8000-000000000004","email":"rls_d@test.dev","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.cost_splits where trip_id='70000000-0000-4000-8000-000000000010') <> 0 then raise exception 'FAIL 23: non-member can SEE cost splits'; end if;
  begin
    insert into public.cost_splits (trip_id, expense_id, party_id, amount, created_by)
      values ('70000000-0000-4000-8000-000000000010','70000000-0000-4000-8000-000000000016','70000000-0000-4000-8000-000000000017',20.00,'d0000000-0000-4000-8000-000000000004');
    raise exception 'FAIL 24: non-member INSERTED cost split';
  exception when insufficient_privilege then null; end;
end $$;

-- board photo DB + storage policy coverage
select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000003","email":"rls_c@test.dev","role":"authenticated"}', true);
do $$ begin
  insert into storage.objects (bucket_id, name, metadata)
    values (
      'trip-photos',
      'trips/70000000-0000-4000-8000-000000000010/board/c0000000-0000-4000-8000-000000000003/70000000-0000-4000-8000-000000000020/original.jpg',
      '{}'::jsonb
    );
  if (
    select count(*) from storage.objects
    where bucket_id='trip-photos'
      and name='trips/70000000-0000-4000-8000-000000000010/board/c0000000-0000-4000-8000-000000000003/70000000-0000-4000-8000-000000000020/original.jpg'
  ) <> 1 then
    raise exception 'FAIL 28: trip member cannot insert/read owned photo object';
  end if;
  begin
    insert into storage.objects (bucket_id, name, metadata)
      values (
        'trip-photos',
        'trips/70000000-0000-4000-8000-000000000010/board/a0000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000020/original.jpg',
        '{}'::jsonb
      );
    raise exception 'FAIL 29: member inserted photo object under another owner path';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"d0000000-0000-4000-8000-000000000004","email":"rls_d@test.dev","role":"authenticated"}', true);
do $$ begin
  begin
    insert into storage.objects (bucket_id, name, metadata)
      values (
        'trip-photos',
        'trips/70000000-0000-4000-8000-000000000010/board/d0000000-0000-4000-8000-000000000004/70000000-0000-4000-8000-000000000020/original.jpg',
        '{}'::jsonb
      );
    raise exception 'FAIL 30: non-member inserted photo object';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","email":"rls_a@test.dev","role":"authenticated"}', true);
insert into public.board_posts (id, trip_id, author_id, body)
  values ('70000000-0000-4000-8000-000000000019','70000000-0000-4000-8000-000000000010','a0000000-0000-4000-8000-000000000001','Photo post');
insert into public.board_photos (
  id, trip_id, post_id, storage_path, thumbnail_path, uploaded_by, original_name,
  mime_type, size_bytes, width, height, caption
) values (
  '70000000-0000-4000-8000-000000000020',
  '70000000-0000-4000-8000-000000000010',
  '70000000-0000-4000-8000-000000000019',
  'trips/70000000-0000-4000-8000-000000000010/board/a0000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000020/original.jpg',
  'trips/70000000-0000-4000-8000-000000000010/board/a0000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000020/thumb.webp',
  'a0000000-0000-4000-8000-000000000001',
  'campfire.jpg',
  'image/jpeg',
  1200,
  1600,
  1200,
  'Campfire'
);

select set_config('request.jwt.claims','{"sub":"d0000000-0000-4000-8000-000000000004","email":"rls_d@test.dev","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.board_photos where trip_id='70000000-0000-4000-8000-000000000010') <> 0 then
    raise exception 'FAIL 31: non-member can SEE board photos';
  end if;
end $$;

select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000003","email":"rls_c@test.dev","role":"authenticated"}', true);
do $$ begin
  delete from public.board_photos where id='70000000-0000-4000-8000-000000000020';
  if (select count(*) from public.board_photos where id='70000000-0000-4000-8000-000000000020') <> 1 then
    raise exception 'FAIL 32: CIT deleted another camper photo';
  end if;
end $$;

select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000002","email":"rls_b@test.dev","role":"authenticated"}', true);
do $$ begin
  delete from public.board_photos where id='70000000-0000-4000-8000-000000000020';
  if (select count(*) from public.board_photos where id='70000000-0000-4000-8000-000000000020') <> 0 then
    raise exception 'FAIL 33: counselor could not delete board photo';
  end if;
end $$;

-- private Realtime Presence: trip member can publish/read; non-member cannot
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","email":"rls_a@test.dev","role":"authenticated"}', true);
select set_config('realtime.topic','trip:70000000-0000-4000-8000-000000000010:board-presence', true);
do $$ begin
  insert into realtime.messages (topic, extension, payload, private)
    values ('trip:70000000-0000-4000-8000-000000000010:board-presence','presence','{}'::jsonb,true);
  if (select count(*) from realtime.messages where topic='trip:70000000-0000-4000-8000-000000000010:board-presence') <> 1 then
    raise exception 'FAIL 25: member cannot read private presence';
  end if;
end $$;

select set_config('request.jwt.claims','{"sub":"d0000000-0000-4000-8000-000000000004","email":"rls_d@test.dev","role":"authenticated"}', true);
select set_config('realtime.topic','trip:70000000-0000-4000-8000-000000000010:board-presence', true);
do $$ begin
  if (select count(*) from realtime.messages where topic='trip:70000000-0000-4000-8000-000000000010:board-presence') <> 0 then
    raise exception 'FAIL 26: non-member can read private presence';
  end if;
  begin
    insert into realtime.messages (topic, extension, payload, private)
      values ('trip:70000000-0000-4000-8000-000000000010:board-presence','presence','{}'::jsonb,true);
    raise exception 'FAIL 27: non-member published private presence';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
delete from realtime.messages where topic='trip:70000000-0000-4000-8000-000000000010:board-presence';
delete from auth.users where id in (
  'a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002',
  'c0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000004');
select 'ALL 33 RLS ASSERTIONS PASSED' as result;

rollback;
