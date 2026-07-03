create extension if not exists pgcrypto;

create sequence if not exists public.lottery_token_number_seq
  as bigint
  start with 100000
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

create sequence if not exists public.lottery_draw_number_seq
  as bigint
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_payment_id text not null unique,
  amount integer not null check (amount >= 0),
  tokens_purchased integer not null check (tokens_purchased between 1 and 100),
  status text not null default 'completed' check (status in ('completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.lottery_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_number bigint not null unique default nextval('public.lottery_token_number_seq'),
  status text not null default 'active' check (status in ('active', 'redeemed', 'void')),
  created_at timestamptz not null default now()
);

alter sequence public.lottery_token_number_seq owned by public.lottery_tokens.token_number;

do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.lottery_tokens'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%'
    and pg_get_constraintdef(oid) like '%active%';

  if v_constraint_name is not null then
    execute format('alter table public.lottery_tokens drop constraint %I', v_constraint_name);
  end if;

  alter table public.lottery_tokens
    add constraint lottery_tokens_status_check
    check (status in ('active', 'used', 'inactive', 'redeemed', 'void'));
end;
$$;

create table if not exists public.lottery_draws (
  id uuid primary key default gen_random_uuid(),
  draw_number bigint not null unique default nextval('public.lottery_draw_number_seq'),
  winner_token_id uuid not null references public.lottery_tokens(id),
  token_count integer not null check (token_count > 0),
  total_pool integer not null check (total_pool >= 0),
  ari_share integer not null check (ari_share >= 0),
  winner_share integer not null check (winner_share >= 0),
  platform_share integer not null check (platform_share >= 0),
  status text not null default 'completed' check (status in ('completed')),
  created_at timestamptz not null default now()
);

alter sequence public.lottery_draw_number_seq owned by public.lottery_draws.draw_number;

create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_id uuid not null references public.lottery_tokens(id),
  draw_id uuid not null references public.lottery_draws(id) on delete cascade,
  prize_amount integer not null check (prize_amount >= 0),
  created_at timestamptz not null default now(),
  unique (draw_id),
  unique (token_id)
);

create index if not exists transactions_user_id_created_at_idx
  on public.transactions (user_id, created_at desc);

create index if not exists lottery_tokens_user_id_created_at_idx
  on public.lottery_tokens (user_id, created_at desc);

create index if not exists lottery_draws_created_at_idx
  on public.lottery_draws (created_at desc);

create index if not exists winners_user_id_created_at_idx
  on public.winners (user_id, created_at desc);

alter table public.transactions enable row level security;
alter table public.lottery_tokens enable row level security;
alter table public.lottery_draws enable row level security;
alter table public.winners enable row level security;

drop policy if exists "Users can read own transactions" on public.transactions;
create policy "Users can read own transactions"
  on public.transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own lottery tokens" on public.lottery_tokens;
create policy "Users can read own lottery tokens"
  on public.lottery_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read lottery draws" on public.lottery_draws;
create policy "Authenticated users can read lottery draws"
  on public.lottery_draws
  for select
  to authenticated
  using (true);

drop policy if exists "Users can read own winner records" on public.winners;
create policy "Users can read own winner records"
  on public.winners
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.process_completed_checkout(
  p_user_id uuid,
  p_stripe_payment_id text,
  p_amount integer,
  p_tokens_purchased integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_tokens_minted integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('ari_lottery_draw_lock'));

  if p_stripe_payment_id is null or length(trim(p_stripe_payment_id)) = 0 then
    raise exception 'stripe payment id is required';
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'amount must be zero or greater';
  end if;

  if p_tokens_purchased is null or p_tokens_purchased < 1 or p_tokens_purchased > 100 then
    raise exception 'tokens purchased must be between 1 and 100';
  end if;

  insert into public.transactions (
    user_id,
    stripe_payment_id,
    amount,
    tokens_purchased,
    status,
    created_at
  )
  values (
    p_user_id,
    p_stripe_payment_id,
    p_amount,
    p_tokens_purchased,
    'completed',
    now()
  )
  on conflict (stripe_payment_id) do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    return jsonb_build_object(
      'processed', false,
      'duplicate', true,
      'tokens_minted', 0
    );
  end if;

  insert into public.lottery_tokens (
    user_id,
    token_number,
    status,
    created_at
  )
  select
    p_user_id,
    nextval('public.lottery_token_number_seq'),
    'active',
    now()
  from generate_series(1, p_tokens_purchased);

  get diagnostics v_tokens_minted = row_count;

  return jsonb_build_object(
    'processed', true,
    'duplicate', false,
    'transaction_id', v_transaction_id,
    'tokens_minted', v_tokens_minted
  );
end;
$$;

grant select on public.transactions to authenticated;
grant select on public.lottery_tokens to authenticated;
grant select on public.lottery_draws to authenticated;
grant select on public.winners to authenticated;
grant execute on function public.process_completed_checkout(uuid, text, integer, integer) to service_role;

create or replace function public.finalize_lottery_draw(
  p_winner_token_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner_token public.lottery_tokens%rowtype;
  v_draw_id uuid;
  v_draw_number bigint;
  v_active_count integer;
  v_total_pool integer;
  v_ari_share integer;
  v_winner_share integer;
  v_platform_share integer;
begin
  perform pg_advisory_xact_lock(hashtext('ari_lottery_draw_lock'));

  select count(*) into v_active_count
  from public.lottery_tokens
  where status = 'active';

  if v_active_count = 0 then
    return jsonb_build_object(
      'processed', false,
      'reason', 'no_active_tokens',
      'active_token_count', 0
    );
  end if;

  select * into v_winner_token
  from public.lottery_tokens
  where id = p_winner_token_id
    and status = 'active'
  for update;

  if not found then
    return jsonb_build_object(
      'processed', false,
      'reason', 'winner_token_not_active',
      'active_token_count', v_active_count
    );
  end if;

  v_total_pool := v_active_count * 100;
  v_ari_share := (v_total_pool * 50) / 100;
  v_winner_share := (v_total_pool * 35) / 100;
  v_platform_share := v_total_pool - v_ari_share - v_winner_share;

  insert into public.lottery_draws (
    winner_token_id,
    token_count,
    total_pool,
    ari_share,
    winner_share,
    platform_share,
    status,
    created_at
  )
  values (
    v_winner_token.id,
    v_active_count,
    v_total_pool,
    v_ari_share,
    v_winner_share,
    v_platform_share,
    'completed',
    now()
  )
  returning id, draw_number into v_draw_id, v_draw_number;

  insert into public.winners (
    user_id,
    token_id,
    draw_id,
    prize_amount,
    created_at
  )
  values (
    v_winner_token.user_id,
    v_winner_token.id,
    v_draw_id,
    v_winner_share,
    now()
  );

  update public.lottery_tokens
  set status = 'used'
  where status = 'active';

  return jsonb_build_object(
    'processed', true,
    'draw_id', v_draw_id,
    'draw_number', v_draw_number,
    'winner_user_id', v_winner_token.user_id,
    'winner_token_id', v_winner_token.id,
    'winner_token_number', v_winner_token.token_number,
    'token_count', v_active_count,
    'total_pool', v_total_pool,
    'ari_share', v_ari_share,
    'winner_share', v_winner_share,
    'platform_share', v_platform_share
  );
end;
$$;

grant execute on function public.finalize_lottery_draw(uuid) to service_role;

do $$
declare
  v_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table in array array[
      'public.lottery_tokens',
      'public.lottery_draws',
      'public.winners'
    ]
    loop
      begin
        execute format('alter publication supabase_realtime add table %s', v_table);
      exception
        when duplicate_object then
          null;
      end;
    end loop;
  end if;
end;
$$;
