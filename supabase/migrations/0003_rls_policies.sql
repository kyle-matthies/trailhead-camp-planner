-- Trailhead Camp Planner — 0003 RLS policies (default-deny; gated by membership/role helpers)
-- Role ladder: director > counselor > cit > camper.
--   camper      = read-only + RSVP
--   cit         = read + collaborate (post, claim, add gear/expenses they create)
--   counselor   = full content read/write
--   director    = everything incl. trip delete + member/role management

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_any_trip(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter table public.trips enable row level security;
create policy trips_select on public.trips for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_trip_member(id));
create policy trips_insert on public.trips for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy trips_update on public.trips for update to authenticated
  using (public.can_write_trip(id)) with check (public.can_write_trip(id));
create policy trips_delete on public.trips for delete to authenticated
  using (public.is_trip_director(id));

alter table public.trip_parties enable row level security;
create policy parties_select on public.trip_parties for select to authenticated
  using (public.is_trip_member(trip_id));
create policy parties_insert on public.trip_parties for insert to authenticated
  with check (public.can_write_trip(trip_id));
create policy parties_update on public.trip_parties for update to authenticated
  using (public.can_write_trip(trip_id)) with check (public.can_write_trip(trip_id));
create policy parties_delete on public.trip_parties for delete to authenticated
  using (public.can_write_trip(trip_id));

alter table public.trip_members enable row level security;
create policy members_select on public.trip_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_trip_member(trip_id));
create policy members_insert on public.trip_members for insert to authenticated
  with check (public.is_trip_director(trip_id));
create policy members_update on public.trip_members for update to authenticated
  using (public.is_trip_director(trip_id)) with check (public.is_trip_director(trip_id));
create policy members_delete on public.trip_members for delete to authenticated
  using (public.is_trip_director(trip_id) or user_id = (select auth.uid()));

alter table public.trip_invites enable row level security;
create policy invites_select on public.trip_invites for select to authenticated
  using (public.is_trip_director(trip_id) or lower(email) = lower(coalesce((select auth.jwt()) ->> 'email','')));
create policy invites_insert on public.trip_invites for insert to authenticated
  with check (public.is_trip_director(trip_id) and invited_by = (select auth.uid()));
create policy invites_update on public.trip_invites for update to authenticated
  using (public.is_trip_director(trip_id)) with check (public.is_trip_director(trip_id));
create policy invites_delete on public.trip_invites for delete to authenticated
  using (public.is_trip_director(trip_id));

alter table public.campgrounds enable row level security;
create policy campgrounds_select on public.campgrounds for select to authenticated
  using (public.is_trip_member(trip_id));
create policy campgrounds_insert on public.campgrounds for insert to authenticated
  with check (public.can_write_trip(trip_id));
create policy campgrounds_update on public.campgrounds for update to authenticated
  using (public.can_write_trip(trip_id)) with check (public.can_write_trip(trip_id));
create policy campgrounds_delete on public.campgrounds for delete to authenticated
  using (public.can_write_trip(trip_id));

alter table public.campsites enable row level security;
create policy campsites_select on public.campsites for select to authenticated
  using (public.is_trip_member(trip_id));
create policy campsites_insert on public.campsites for insert to authenticated
  with check (public.can_write_trip(trip_id));
create policy campsites_update on public.campsites for update to authenticated
  using (public.can_write_trip(trip_id)) with check (public.can_write_trip(trip_id));
create policy campsites_delete on public.campsites for delete to authenticated
  using (public.can_write_trip(trip_id));

alter table public.tents enable row level security;
create policy tents_select on public.tents for select to authenticated
  using (public.is_trip_member(trip_id));
create policy tents_insert on public.tents for insert to authenticated
  with check (public.can_collaborate(trip_id));
create policy tents_update on public.tents for update to authenticated
  using (public.can_write_trip(trip_id)) with check (public.can_write_trip(trip_id));
create policy tents_delete on public.tents for delete to authenticated
  using (public.can_write_trip(trip_id));

alter table public.vehicles enable row level security;
create policy vehicles_select on public.vehicles for select to authenticated
  using (public.is_trip_member(trip_id));
create policy vehicles_insert on public.vehicles for insert to authenticated
  with check (public.can_collaborate(trip_id));
create policy vehicles_update on public.vehicles for update to authenticated
  using (public.can_write_trip(trip_id)) with check (public.can_write_trip(trip_id));
create policy vehicles_delete on public.vehicles for delete to authenticated
  using (public.can_write_trip(trip_id));

alter table public.site_camper_assignments enable row level security;
create policy sca_select on public.site_camper_assignments for select to authenticated
  using (public.is_trip_member(trip_id));
create policy sca_insert on public.site_camper_assignments for insert to authenticated
  with check (public.can_write_trip(trip_id));
create policy sca_update on public.site_camper_assignments for update to authenticated
  using (public.can_write_trip(trip_id)) with check (public.can_write_trip(trip_id));
create policy sca_delete on public.site_camper_assignments for delete to authenticated
  using (public.can_write_trip(trip_id));

alter table public.trip_shared_gear enable row level security;
create policy gear_select on public.trip_shared_gear for select to authenticated
  using (public.is_trip_member(trip_id));
create policy gear_insert on public.trip_shared_gear for insert to authenticated
  with check (public.can_collaborate(trip_id) and created_by = (select auth.uid()));
create policy gear_update on public.trip_shared_gear for update to authenticated
  using (public.can_write_trip(trip_id) or created_by = (select auth.uid()))
  with check (public.can_write_trip(trip_id) or created_by = (select auth.uid()));
create policy gear_delete on public.trip_shared_gear for delete to authenticated
  using (public.can_write_trip(trip_id) or created_by = (select auth.uid()));

alter table public.shopping_items enable row level security;
create policy shopping_select on public.shopping_items for select to authenticated
  using (public.is_trip_member(trip_id));
create policy shopping_insert on public.shopping_items for insert to authenticated
  with check (public.can_collaborate(trip_id) and created_by = (select auth.uid()));
create policy shopping_update on public.shopping_items for update to authenticated
  using (public.can_write_trip(trip_id) or public.can_collaborate(trip_id))
  with check (
    public.can_write_trip(trip_id)
    or (public.can_collaborate(trip_id) and claimed_by = public.my_member_id(trip_id))
  );
create policy shopping_delete on public.shopping_items for delete to authenticated
  using (public.can_write_trip(trip_id));

alter table public.expenses enable row level security;
create policy expenses_select on public.expenses for select to authenticated
  using (public.is_trip_member(trip_id));
create policy expenses_insert on public.expenses for insert to authenticated
  with check (public.can_collaborate(trip_id) and created_by = (select auth.uid()));
create policy expenses_update on public.expenses for update to authenticated
  using (public.can_write_trip(trip_id) or created_by = (select auth.uid()))
  with check (public.can_write_trip(trip_id) or created_by = (select auth.uid()));
create policy expenses_delete on public.expenses for delete to authenticated
  using (public.can_write_trip(trip_id) or created_by = (select auth.uid()));

alter table public.board_posts enable row level security;
create policy posts_select on public.board_posts for select to authenticated
  using (public.is_trip_member(trip_id));
create policy posts_insert on public.board_posts for insert to authenticated
  with check (public.can_collaborate(trip_id) and author_id = (select auth.uid()));
create policy posts_update on public.board_posts for update to authenticated
  using (author_id = (select auth.uid()) or public.can_write_trip(trip_id))
  with check (author_id = (select auth.uid()) or public.can_write_trip(trip_id));
create policy posts_delete on public.board_posts for delete to authenticated
  using (author_id = (select auth.uid()) or public.can_write_trip(trip_id));

alter table public.board_replies enable row level security;
create policy replies_select on public.board_replies for select to authenticated
  using (public.is_trip_member(trip_id));
create policy replies_insert on public.board_replies for insert to authenticated
  with check (public.can_collaborate(trip_id) and author_id = (select auth.uid()));
create policy replies_update on public.board_replies for update to authenticated
  using (author_id = (select auth.uid()) or public.can_write_trip(trip_id))
  with check (author_id = (select auth.uid()) or public.can_write_trip(trip_id));
create policy replies_delete on public.board_replies for delete to authenticated
  using (author_id = (select auth.uid()) or public.can_write_trip(trip_id));

alter table public.board_photos enable row level security;
create policy photos_select on public.board_photos for select to authenticated
  using (public.is_trip_member(trip_id));
create policy photos_insert on public.board_photos for insert to authenticated
  with check (public.can_collaborate(trip_id) and uploaded_by = (select auth.uid()));
create policy photos_delete on public.board_photos for delete to authenticated
  using (uploaded_by = (select auth.uid()) or public.can_write_trip(trip_id));

alter table public.ai_actions enable row level security;
create policy ai_actions_select on public.ai_actions for select to authenticated
  using (user_id = (select auth.uid()));
create policy ai_actions_insert on public.ai_actions for insert to authenticated
  with check (user_id = (select auth.uid()));

alter table public.gear_items enable row level security;
create policy gear_items_all on public.gear_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.trip_packing_items enable row level security;
create policy packing_select on public.trip_packing_items for select to authenticated
  using (owner_id = (select auth.uid()));
create policy packing_insert on public.trip_packing_items for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_trip_member(trip_id));
create policy packing_update on public.trip_packing_items for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy packing_delete on public.trip_packing_items for delete to authenticated
  using (owner_id = (select auth.uid()));
