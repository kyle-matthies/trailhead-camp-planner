-- Trailhead Camp Planner social platform — 0001 core schema (enums, tables, constraints)
-- Conventions: uuid PKs, timestamptz, numeric(10,2) money, denormalized trip_id on
-- child tables for one-hop RLS, composite FKs (col, trip_id)->parent(id, trip_id) so
-- nothing can reference another trip's rows. RLS is enabled in a later migration.

-- ============ Enums ============
create type public.trip_role     as enum ('director','counselor','cit','camper');
create type public.invite_status as enum ('pending','accepted','revoked','expired');
create type public.item_source   as enum ('manual','ai','import');

-- ============ profiles (mirror of auth.users) ============
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text not null default '',
  created_at timestamptz not null default now()
);

-- ============ trips ============
create table public.trips (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  destination  text not null default '',
  latitude     double precision,
  longitude    double precision,
  start_date   date not null,
  end_date     date not null,
  camping_type text not null default 'car',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);
create index trips_owner_id_idx on public.trips(owner_id);

-- ============ trip_parties (household / settlement unit) ============
create table public.trip_parties (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (id, trip_id)
);
create index trip_parties_trip_id_idx on public.trip_parties(trip_id);

-- ============ trip_members ============
create table public.trip_members (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         public.trip_role not null default 'camper',
  party_id     uuid,
  display_name text,
  joined_at    timestamptz not null default now(),
  unique (trip_id, user_id),
  unique (id, trip_id),
  constraint trip_members_party_fk foreign key (party_id, trip_id)
    references public.trip_parties(id, trip_id) on delete set null (party_id)
);
create index trip_members_trip_id_idx on public.trip_members(trip_id);
create index trip_members_user_id_idx on public.trip_members(user_id);
create index trip_members_party_id_idx on public.trip_members(party_id);

-- ============ trip_invites (pending-by-email) ============
create table public.trip_invites (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  email       text not null,
  role        public.trip_role not null default 'camper',
  invited_by  uuid not null references auth.users(id) on delete cascade,
  token       uuid not null default gen_random_uuid(),
  status      public.invite_status not null default 'pending',
  party_id    uuid,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  constraint trip_invites_party_fk foreign key (party_id, trip_id)
    references public.trip_parties(id, trip_id) on delete set null (party_id)
);
create unique index trip_invites_token_idx on public.trip_invites(token);
create unique index trip_invites_unique_pending
  on public.trip_invites (trip_id, lower(email)) where status = 'pending';
create index trip_invites_email_idx on public.trip_invites (lower(email));
create index trip_invites_trip_id_idx on public.trip_invites(trip_id);

-- ============ campgrounds (1:1 per trip) ============
create table public.campgrounds (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips(id) on delete cascade,
  name            text not null,
  address         text,
  latitude        double precision,
  longitude       double precision,
  reservation_ref text,
  check_in_date   date,
  check_out_date  date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  unique (trip_id),
  unique (id, trip_id)
);

-- ============ campsites ============
create table public.campsites (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips(id) on delete cascade,
  campground_id uuid not null,
  site_number   text not null,
  max_tents     int,
  max_vehicles  int,
  nightly_cost  numeric(10,2),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  unique (id, trip_id),
  constraint campsites_campground_fk foreign key (campground_id, trip_id)
    references public.campgrounds(id, trip_id) on delete cascade
);
create index campsites_trip_id_idx on public.campsites(trip_id);
create index campsites_campground_id_idx on public.campsites(campground_id);

-- ============ tents ============
create table public.tents (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  label       text not null,
  capacity    int,
  owned_by    uuid,
  campsite_id uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  constraint tents_owner_fk foreign key (owned_by, trip_id)
    references public.trip_members(id, trip_id) on delete set null (owned_by),
  constraint tents_campsite_fk foreign key (campsite_id, trip_id)
    references public.campsites(id, trip_id) on delete set null (campsite_id)
);
create index tents_trip_id_idx on public.tents(trip_id);
create index tents_campsite_id_idx on public.tents(campsite_id);

-- ============ vehicles ============
create table public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips(id) on delete cascade,
  label         text not null,
  license_plate text,
  owned_by      uuid,
  campsite_id   uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  constraint vehicles_owner_fk foreign key (owned_by, trip_id)
    references public.trip_members(id, trip_id) on delete set null (owned_by),
  constraint vehicles_campsite_fk foreign key (campsite_id, trip_id)
    references public.campsites(id, trip_id) on delete set null (campsite_id)
);
create index vehicles_trip_id_idx on public.vehicles(trip_id);
create index vehicles_campsite_id_idx on public.vehicles(campsite_id);

-- ============ site_camper_assignments ============
create table public.site_camper_assignments (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  campsite_id uuid not null,
  member_id   uuid not null,
  created_at  timestamptz not null default now(),
  unique (campsite_id, member_id),
  constraint sca_campsite_fk foreign key (campsite_id, trip_id)
    references public.campsites(id, trip_id) on delete cascade,
  constraint sca_member_fk foreign key (member_id, trip_id)
    references public.trip_members(id, trip_id) on delete cascade
);
create index sca_trip_id_idx on public.site_camper_assignments(trip_id);
create index sca_campsite_id_idx on public.site_camper_assignments(campsite_id);
create index sca_member_id_idx on public.site_camper_assignments(member_id);

-- ============ trip_shared_gear ============
create table public.trip_shared_gear (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  name       text not null,
  category   text,
  quantity   int not null default 1,
  brought_by uuid,
  notes      text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint shared_gear_brought_fk foreign key (brought_by, trip_id)
    references public.trip_members(id, trip_id) on delete set null (brought_by)
);
create index shared_gear_trip_id_idx on public.trip_shared_gear(trip_id);

-- ============ shopping_items ============
create table public.shopping_items (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  name             text not null,
  category         text,
  quantity         numeric(10,2) not null default 1,
  unit             text,
  estimated_cost   numeric(10,2),
  actual_cost      numeric(10,2),
  purchased        boolean not null default false,
  claimed_by       uuid,
  paid_by_party_id uuid,
  source           public.item_source not null default 'manual',
  created_by       uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  constraint shopping_claimed_fk foreign key (claimed_by, trip_id)
    references public.trip_members(id, trip_id) on delete set null (claimed_by),
  constraint shopping_paid_party_fk foreign key (paid_by_party_id, trip_id)
    references public.trip_parties(id, trip_id) on delete set null (paid_by_party_id)
);
create index shopping_trip_id_idx on public.shopping_items(trip_id);
create index shopping_trip_purchased_idx on public.shopping_items(trip_id, purchased);
create index shopping_claimed_by_idx on public.shopping_items(claimed_by);

-- ============ expenses (non-shopping costs) ============
create table public.expenses (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips(id) on delete cascade,
  description       text not null,
  amount            numeric(10,2) not null,
  paid_by_party_id  uuid,
  paid_by_member_id uuid,
  category          text,
  shopping_item_id  uuid references public.shopping_items(id) on delete set null,
  incurred_on       date,
  created_by        uuid not null references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  constraint expenses_paid_party_fk foreign key (paid_by_party_id, trip_id)
    references public.trip_parties(id, trip_id) on delete set null (paid_by_party_id),
  constraint expenses_paid_member_fk foreign key (paid_by_member_id, trip_id)
    references public.trip_members(id, trip_id) on delete set null (paid_by_member_id)
);
create index expenses_trip_id_idx on public.expenses(trip_id);

-- ============ board_posts ============
create table public.board_posts (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  edited     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index board_posts_trip_created_idx on public.board_posts(trip_id, created_at desc);

-- ============ board_replies (trip_id denormalized for one-hop RLS) ============
create table public.board_replies (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.board_posts(id) on delete cascade,
  trip_id    uuid not null references public.trips(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index board_replies_post_idx on public.board_replies(post_id, created_at);
create index board_replies_trip_idx on public.board_replies(trip_id);

-- ============ board_photos (scaffold — no UI in Phase 1) ============
create table public.board_photos (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  post_id      uuid references public.board_posts(id) on delete cascade,
  storage_path text not null,
  uploaded_by  uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index board_photos_trip_idx on public.board_photos(trip_id);

-- ============ ai_actions (write-safety audit) ============
create table public.ai_actions (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid references public.trips(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  utterance  text,
  tool_calls jsonb,
  committed  boolean not null default false,
  result     jsonb,
  created_at timestamptz not null default now()
);
create index ai_actions_trip_idx on public.ai_actions(trip_id);
create index ai_actions_user_idx on public.ai_actions(user_id);

-- ============ gear_items (personal inventory, single-user) ============
create table public.gear_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  category   text not null default 'misc',
  weight_oz  double precision,
  condition  text not null default 'good',
  notes      text,
  created_at timestamptz not null default now()
);
create index gear_items_user_id_idx on public.gear_items(user_id);

-- ============ trip_packing_items (personal per-trip checklist) ============
create table public.trip_packing_items (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips(id) on delete cascade,
  owner_id          uuid not null references auth.users(id) on delete cascade,
  gear_item_id      uuid references public.gear_items(id) on delete set null,
  name              text not null,
  category          text not null default 'misc',
  packed            boolean not null default false,
  is_recommendation boolean not null default false,
  created_at        timestamptz not null default now()
);
create index packing_trip_idx on public.trip_packing_items(trip_id);
create index packing_owner_idx on public.trip_packing_items(owner_id);
