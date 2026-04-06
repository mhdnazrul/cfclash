create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'room_status') then
    create type public.room_status as enum ('waiting', 'active', 'ended');
  end if;
  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type public.request_status as enum ('pending', 'approved', 'declined');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum ('join_request', 'approved', 'declined');
  end if;
end $$;

alter table if exists public.profiles alter column cf_handle drop not null;
alter table if exists public.rooms add column if not exists approved_participants uuid[] not null default '{}', add column if not exists problem_set jsonb not null default '[]'::jsonb;
update public.rooms set problem_set = problem_ids where problem_set = '[]'::jsonb and problem_ids is not null;
alter table if exists public.rooms alter column status type public.room_status using case when status = 'waiting' then 'waiting'::public.room_status when status = 'active' then 'active'::public.room_status else 'ended'::public.room_status end;
alter table if exists public.battle_submissions add constraint battle_submissions_unique_user_room_problem unique (user_id, room_id, problem_id);

create table if not exists public.room_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique(room_id, requester_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  room_id uuid references public.rooms(id) on delete cascade,
  type public.notification_type not null,
  message text not null,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.problems (
  id text primary key,
  contest_id int not null,
  problem_index text not null,
  title text not null,
  rating int not null,
  url text not null,
  tags text[] not null default '{}',
  rating_bucket int generated always as ((rating / 100) * 100) stored,
  last_synced_at timestamptz not null default now(),
  unique(contest_id, problem_index)
);

create or replace function public.has_valid_cf_handle(target_user_id uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.profiles p where p.id = target_user_id and p.cf_handle is not null and length(trim(p.cf_handle)) > 0); $$;

create or replace function public.generate_room_code()
returns text language plpgsql security definer set search_path = public as
$$
declare candidate text;
begin
  loop
    candidate := 'ROOM-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));
    exit when not exists(select 1 from public.rooms where room_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.create_room_with_problems(p_duration_minutes int, p_ratings int[])
returns public.rooms language plpgsql security definer set search_path = public as
$$
declare
  v_user_id uuid := auth.uid();
  v_room public.rooms;
  v_rating int;
  v_problem record;
  v_problem_set jsonb := '[]'::jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not public.has_valid_cf_handle(v_user_id) then raise exception 'Complete your profile with a Codeforces handle first'; end if;
  foreach v_rating in array p_ratings loop
    select p.* into v_problem from public.problems p where p.rating = v_rating order by random() limit 1;
    if not found then raise exception 'No cached problems available for rating %', v_rating; end if;
    v_problem_set := v_problem_set || jsonb_build_object('id', v_problem.id, 'contestId', v_problem.contest_id, 'index', v_problem.problem_index, 'title', v_problem.title, 'rating', v_problem.rating, 'url', v_problem.url);
  end loop;
  insert into public.rooms (room_code, creator_id, duration_minutes, status, problem_set, problem_ids, approved_participants)
  values (public.generate_room_code(), v_user_id, p_duration_minutes, 'waiting', v_problem_set, v_problem_set, array[v_user_id]::uuid[])
  returning * into v_room;
  return v_room;
end;
$$;

create or replace function public.request_join_room(p_room_code text)
returns public.room_requests language plpgsql security definer set search_path = public as
$$
declare
  v_user_id uuid := auth.uid();
  v_room public.rooms;
  v_request public.room_requests;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not public.has_valid_cf_handle(v_user_id) then raise exception 'Complete your profile with a Codeforces handle first'; end if;
  select * into v_room from public.rooms where room_code = upper(trim(p_room_code)) limit 1;
  if not found then raise exception 'Room not found'; end if;
  insert into public.room_requests(room_id, requester_id, status) values (v_room.id, v_user_id, 'pending')
  on conflict (room_id, requester_id) do update set status = 'pending'
  returning * into v_request;
  insert into public.notifications(user_id, sender_id, room_id, type, message, metadata)
  values (v_room.creator_id, v_user_id, v_room.id, 'join_request', 'New join request for room ' || v_room.room_code, jsonb_build_object('room_id', v_room.id, 'requester_id', v_user_id, 'request_id', v_request.id));
  return v_request;
end;
$$;

create or replace function public.handle_room_request(p_request_id uuid, p_approve boolean)
returns public.room_requests language plpgsql security definer set search_path = public as
$$
declare
  v_user_id uuid := auth.uid();
  v_request public.room_requests;
  v_room public.rooms;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select rr.*, r.* into v_request, v_room from public.room_requests rr join public.rooms r on r.id = rr.room_id where rr.id = p_request_id limit 1;
  if v_room.creator_id <> v_user_id then raise exception 'Only room creator can manage requests'; end if;
  update public.room_requests set status = case when p_approve then 'approved'::public.request_status else 'declined'::public.request_status end where id = p_request_id returning * into v_request;
  if p_approve then
    update public.rooms set approved_participants = array(select distinct unnest(approved_participants || v_request.requester_id)) where id = v_request.room_id;
  end if;
  insert into public.notifications(user_id, sender_id, room_id, type, message, metadata)
  values (v_request.requester_id, v_user_id, v_request.room_id, case when p_approve then 'approved'::public.notification_type else 'declined'::public.notification_type end, case when p_approve then 'Your request was approved' else 'Your request was declined' end, jsonb_build_object('room_id', v_request.room_id, 'request_id', v_request.id));
  return v_request;
end;
$$;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.battle_submissions enable row level security;
alter table public.leaderboard enable row level security;
alter table public.room_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.problems enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select using (auth.uid() is not null);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Rooms are viewable by everyone" on public.rooms;
drop policy if exists "Authenticated users can create rooms" on public.rooms;
drop policy if exists "Room creator can update" on public.rooms;
create policy "rooms_select_members" on public.rooms for select using (creator_id = auth.uid() or auth.uid() = any(approved_participants));
create policy "rooms_insert_creator" on public.rooms for insert with check (creator_id = auth.uid() and public.has_valid_cf_handle(auth.uid()));
create policy "rooms_update_creator" on public.rooms for update using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "rooms_delete_creator" on public.rooms for delete using (creator_id = auth.uid());

drop policy if exists "Submissions viewable by everyone" on public.battle_submissions;
drop policy if exists "Authenticated can insert own submissions" on public.battle_submissions;
drop policy if exists "Authenticated can update own submissions" on public.battle_submissions;
create policy "submissions_select_room_members" on public.battle_submissions for select using (exists(select 1 from public.rooms r where r.id = battle_submissions.room_id and (r.creator_id = auth.uid() or auth.uid() = any(r.approved_participants))));
create policy "submissions_insert_participant" on public.battle_submissions for insert with check (auth.uid() = user_id);
create policy "submissions_update_participant" on public.battle_submissions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Leaderboard viewable by everyone" on public.leaderboard;
drop policy if exists "Authenticated can insert own leaderboard" on public.leaderboard;
drop policy if exists "Authenticated can update own leaderboard" on public.leaderboard;
create policy "leaderboard_select_authenticated" on public.leaderboard for select using (auth.uid() is not null);
create policy "leaderboard_insert_own" on public.leaderboard for insert with check (auth.uid() = user_id);
create policy "leaderboard_update_own" on public.leaderboard for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "room_requests_select_requester_or_creator" on public.room_requests for select using (requester_id = auth.uid() or exists(select 1 from public.rooms r where r.id = room_requests.room_id and r.creator_id = auth.uid()));
create policy "room_requests_insert_requester" on public.room_requests for insert with check (requester_id = auth.uid());
create policy "room_requests_update_creator" on public.room_requests for update using (exists(select 1 from public.rooms r where r.id = room_requests.room_id and r.creator_id = auth.uid()));

create policy "notifications_select_receiver" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update_receiver" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_insert_sender_or_system" on public.notifications for insert with check (auth.uid() = sender_id or auth.role() = 'service_role');

create policy "problems_select_authenticated" on public.problems for select using (auth.uid() is not null);

alter publication supabase_realtime add table public.room_requests;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.problems;

revoke execute on function public.create_room_with_problems(int, int[]) from public;
revoke execute on function public.request_join_room(text) from public;
revoke execute on function public.handle_room_request(uuid, boolean) from public;
grant execute on function public.create_room_with_problems(int, int[]) to authenticated;
grant execute on function public.request_join_room(text) to authenticated;
grant execute on function public.handle_room_request(uuid, boolean) to authenticated;
