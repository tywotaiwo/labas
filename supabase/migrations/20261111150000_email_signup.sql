-- Email sign-up creates a profile and a 90-day program.
-- A later invitation attaches the coach to that program instead of failing.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  if display_name is null then
    display_name := split_part(coalesce(new.email, 'there'), '@', 1);
  end if;

  insert into public.profiles (id, full_name, email)
  values (new.id, display_name, lower(new.email))
  on conflict (id) do nothing;

  insert into public.enrollments (client_id, started_on, status)
  select new.id, current_date, 'active'
  where not exists (
    select 1 from public.enrollments
    where client_id = new.id and status = 'active'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

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
  existing_coach uuid;
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

  insert into public.profiles (id, full_name, email)
  values (auth.uid(), inv.full_name, lower(inv.email))
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;

  select id, coach_id into eid, existing_coach
  from public.enrollments
  where client_id = auth.uid() and status = 'active';

  if eid is not null then
    if existing_coach is not null and existing_coach is distinct from inv.coach_id then
      raise exception 'You already have an active program';
    end if;
    update public.enrollments
    set coach_id = coalesce(inv.coach_id, coach_id),
        started_on = inv.started_on
    where id = eid;
  else
    insert into public.enrollments (client_id, coach_id, started_on, status)
    values (auth.uid(), inv.coach_id, inv.started_on, 'active')
    returning id into eid;
  end if;

  update public.invitations
  set accepted_at = now(), enrollment_id = eid
  where id = inv.id;

  return eid;
end;
$$;
