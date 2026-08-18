-- Explicit Data API exposure for new Supabase projects.
-- Grants make objects reachable; RLS policies in earlier migrations still decide
-- which rows and operations each authenticated member may use.

revoke all on all tables in schema public from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table
  public.trips,
  public.trip_parties,
  public.trip_members,
  public.trip_invites,
  public.campgrounds,
  public.campsites,
  public.tents,
  public.vehicles,
  public.site_camper_assignments,
  public.trip_shared_gear,
  public.shopping_items,
  public.expenses,
  public.cost_splits,
  public.board_posts,
  public.board_replies,
  public.board_photos,
  public.gear_items,
  public.trip_packing_items
to authenticated;
grant select, insert on table public.ai_actions to authenticated;
grant select on table public.trip_party_totals to authenticated;

revoke all on all functions in schema public from public, anon;
grant execute on function public.accept_invite(uuid) to authenticated;
grant execute on function public.trip_settlement(uuid) to authenticated;
grant execute on function public.storage_trip_id(text) to authenticated;
grant execute on function public.storage_photo_owner_id(text) to authenticated;
