-- LABAS Private
-- Daily symptom ratings for a 90-day coaching program.
-- A client can read and write only their own rows.
-- A coach (admins) can read progress. There is no employer role.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'coach' check (role in ('coach', 'admin', 'super_admin')),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  reminder_opt_in boolean not null default false,
  reminder_hour smallint not null default 8 check (reminder_hour between 0 and 23),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  coach_id uuid references public.admins (id) on delete set null,
  started_on date not null,
  duration_days integer not null default 90 check (duration_days between 1 and 366),
  status text not null default 'active' check (status in ('active', 'completed', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index enrollments_one_active_per_client
  on public.enrollments (client_id)
  where status = 'active';

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  token text not null unique,
  coach_id uuid references public.admins (id) on delete set null,
  started_on date not null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  accepted_at timestamptz,
  enrollment_id uuid references public.enrollments (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  entry_date date not null,
  skipped boolean not null default false,
  stress smallint check (stress between 0 and 4),
  fatigue smallint check (fatigue between 0 and 4),
  physical_tension smallint check (physical_tension between 0 and 4),
  difficulty_focusing smallint check (difficulty_focusing between 0 and 4),
  irritability smallint check (irritability between 0 and 4),
  sleep_disturbance smallint check (sleep_disturbance between 0 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, entry_date),
  constraint check_ins_complete_or_skipped check (
    skipped
    or (
      stress is not null
      and fatigue is not null
      and physical_tension is not null
      and difficulty_focusing is not null
      and irritability is not null
      and sleep_disturbance is not null
    )
  )
);

create index check_ins_client_date_idx on public.check_ins (client_id, entry_date desc);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  notice_version text not null,
  accepted_at timestamptz not null default now()
);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  note text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index deletion_one_pending_idx
  on public.deletion_requests (client_id)
  where status = 'pending';

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger enrollments_updated_at
  before update on public.enrollments
  for each row execute function public.set_updated_at();

create trigger check_ins_updated_at
  before update on public.check_ins
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where id = auth.uid()
  );
$$;

create or replace function public.lookup_invitation(invite_token text)
returns table (
  email text,
  full_name text,
  started_on date,
  expired boolean,
  accepted boolean
)
language sql
security definer
set search_path = public
as $$
  select
    i.email,
    i.full_name,
    i.started_on,
    (i.expires_at <= now()) as expired,
    (i.accepted_at is not null) as accepted
  from public.invitations i
  where i.token = invite_token
  limit 1;
$$;

create or replace function public.accept_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
  user_email text;
  eid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select email into user_email from auth.users where id = auth.uid();

  select * into inv from public.invitations where token = invite_token;
  if not found then
    raise exception 'This invitation could not be found';
  end if;
  if inv.accepted_at is not null then
    raise exception 'This invitation has already been used';
  end if;
  if inv.expires_at <= now() then
    raise exception 'This invitation has expired';
  end if;
  if lower(inv.email) <> lower(coalesce(user_email, '')) then
    raise exception 'Use the email address this invitation was sent to';
  end if;
  if exists (
    select 1 from public.enrollments
    where client_id = auth.uid() and status = 'active'
  ) then
    raise exception 'You already have an active program';
  end if;

  insert into public.profiles (id, full_name, email)
  values (auth.uid(), inv.full_name, lower(inv.email))
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;

  insert into public.enrollments (client_id, coach_id, started_on, status)
  values (auth.uid(), inv.coach_id, inv.started_on, 'active')
  returning id into eid;

  update public.invitations
  set accepted_at = now(), enrollment_id = eid
  where id = inv.id;

  return eid;
end;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.lookup_invitation(text) from public;
revoke all on function public.accept_invitation(text) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.lookup_invitation(text) to anon, authenticated;
grant execute on function public.accept_invitation(text) to authenticated;

alter table public.admins enable row level security;
alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.invitations enable row level security;
alter table public.check_ins enable row level security;
alter table public.consents enable row level security;
alter table public.deletion_requests enable row level security;

create policy admins_select_self on public.admins
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy enrollments_select on public.enrollments
  for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy enrollments_update_admin on public.enrollments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy invitations_admin on public.invitations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy check_ins_select on public.check_ins
  for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy check_ins_insert_own on public.check_ins
  for insert to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.enrollments
      where id = enrollment_id and client_id = auth.uid()
    )
  );

create policy check_ins_update_own on public.check_ins
  for update to authenticated
  using (client_id = auth.uid())
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.enrollments
      where id = enrollment_id and client_id = auth.uid()
    )
  );

create policy check_ins_delete_admin on public.check_ins
  for delete to authenticated
  using (public.is_admin());

create policy consents_select on public.consents
  for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy consents_insert_own on public.consents
  for insert to authenticated
  with check (client_id = auth.uid());

create policy deletion_select on public.deletion_requests
  for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy deletion_insert_own on public.deletion_requests
  for insert to authenticated
  with check (client_id = auth.uid());

create policy deletion_update_admin on public.deletion_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.admins from anon;
revoke all on table public.profiles from anon;
revoke all on table public.enrollments from anon;
revoke all on table public.invitations from anon;
revoke all on table public.check_ins from anon;
revoke all on table public.consents from anon;
revoke all on table public.deletion_requests from anon;
