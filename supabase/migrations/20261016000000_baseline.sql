-- Baseline schema for MapleThai (generated from the live database, project njbxgclpgefugdtypxag)
-- Recreates schemas public/private: tables, constraints, indexes, functions, triggers, RLS policies, grants, storage buckets.
-- It does NOT contain data (except product seed in seed.sql) and is NOT meant to be re-run on the live project.

set check_function_bodies = false;
set client_min_messages = warning;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists supabase_vault with schema vault;

create schema if not exists private;
grant USAGE on schema private to authenticated;
revoke all on schema private from public;

-- Sequences

-- Tables
create table public.credit_ledger (
  id bigint generated always as identity,
  user_id uuid not null,
  payment_id bigint not null,
  kind text not null,
  delta_cents bigint not null,
  balance_after_cents bigint not null,
  created_at timestamp with time zone default now() not null,
  constraint credit_ledger_pkey PRIMARY KEY (id),
  constraint credit_ledger_balance_after_cents_check CHECK ((balance_after_cents >= 0)),
  constraint credit_ledger_delta_cents_check CHECK ((delta_cents <> 0)),
  constraint credit_ledger_kind_check CHECK ((kind = ANY (ARRAY['reserve'::text, 'release'::text, 'transfer'::text, 'purchase'::text]))),
  constraint credit_ledger_payment_id_kind_key UNIQUE (payment_id, kind)
);
create table public.entitlements (
  user_id uuid not null,
  product text not null,
  expires_at timestamp with time zone,
  source text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint entitlements_pkey PRIMARY KEY (user_id, product)
);
create table public.guide_files (
  guide text not null,
  html text not null,
  updated_at timestamp with time zone default now() not null,
  constraint guide_files_pkey PRIMARY KEY (guide)
);
create table public.guide_progress (
  user_id uuid not null,
  guide text not null,
  state jsonb not null,
  step_label text default ''::text not null,
  completed integer default 0 not null,
  total integer not null,
  version integer default 1 not null,
  updated_at timestamp with time zone default now() not null,
  constraint guide_progress_pkey PRIMARY KEY (user_id, guide),
  constraint guide_progress_check CHECK ((((total >= 1) AND (total <= 2000)) AND (completed <= total))),
  constraint guide_progress_completed_check CHECK ((completed >= 0)),
  constraint guide_progress_guide_check CHECK ((guide = ANY (ARRAY['bandit'::text, 'assassin'::text, 'mage'::text, 'spearman'::text, 'page'::text, 'fighter'::text]))),
  constraint guide_progress_state_check CHECK (((jsonb_typeof(state) = 'object'::text) AND (octet_length((state)::text) <= 65536))),
  constraint guide_progress_step_label_check CHECK ((length(step_label) <= 160)),
  constraint guide_progress_version_check CHECK ((version > 0))
);
create table public.items (
  id integer not null,
  name text not null,
  type text,
  subtype text,
  lv integer,
  constraint items_pkey PRIMARY KEY (id)
);
create table public.listings (
  id bigint generated always as identity,
  user_id uuid default auth.uid() not null,
  kind text not null,
  item_id integer,
  qty integer default 1 not null,
  price bigint not null,
  atk integer,
  slots integer,
  status text default 'open'::text not null,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone default (now() + '14 days'::interval) not null,
  item_name text default ''::text not null,
  category text default 'other'::text not null,
  description text default ''::text not null,
  price_unit text default 'meso'::text not null,
  updated_at timestamp with time zone default now() not null,
  item_stats jsonb default '{}'::jsonb not null,
  price_reference_eligible boolean default true not null,
  constraint listings_pkey PRIMARY KEY (id),
  constraint listings_atk_check CHECK (((atk >= 0) AND (atk <= 999))),
  constraint listings_category_check CHECK ((category = ANY (ARRAY['weapon'::text, 'armor'::text, 'scroll'::text, 'material'::text, 'consumable'::text, 'other'::text]))),
  constraint listings_description_check CHECK ((length(description) <= 1500)),
  constraint listings_item_name_check CHECK ((length(item_name) <= 120)),
  constraint listings_item_stats_check CHECK ((jsonb_typeof(item_stats) = 'object'::text)),
  constraint listings_kind_check CHECK ((kind = ANY (ARRAY['buy'::text, 'sell'::text]))),
  constraint listings_meso_only CHECK (((price_unit = 'meso'::text) OR (status <> 'open'::text))),
  constraint listings_price_check CHECK (((price >= 1) AND (price <= '9999999999'::bigint))),
  constraint listings_price_unit_check CHECK ((price_unit = ANY (ARRAY['meso'::text, 'thb'::text]))),
  constraint listings_qty_check CHECK (((qty >= 1) AND (qty <= 9999))),
  constraint listings_slots_check CHECK (((slots >= 0) AND (slots <= 20))),
  constraint listings_status_check CHECK ((status = ANY (ARRAY['open'::text, 'done'::text])))
);
create table public.market_prices (
  id integer default 1 not null,
  data jsonb not null,
  fetched_at timestamp with time zone,
  constraint market_prices_pkey PRIMARY KEY (id),
  constraint market_prices_id_check CHECK ((id = 1))
);
create table public.payments (
  id bigint generated always as identity,
  user_id uuid,
  email text,
  product text not null,
  amount integer not null,
  trans_ref text not null,
  slip_path text,
  status text default 'ok'::text not null,
  created_at timestamp with time zone default now() not null,
  recipient jsonb,
  review_note text,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  verification_attempts integer default 0 not null,
  verification_lease uuid,
  verification_started_at timestamp with time zone,
  verification_code text,
  verified_automatically boolean default false not null,
  credit_applied_cents bigint default 0 not null,
  amount_due_cents bigint not null,
  received_cents bigint,
  processing_fee_cents integer default 0 not null,
  gift_email text,
  referral_email text,
  constraint payments_pkey PRIMARY KEY (id),
  constraint payments_check CHECK (((amount_due_cents >= 0) AND ((amount_due_cents + credit_applied_cents) = (((amount)::bigint * 100) + processing_fee_cents)))),
  constraint payments_credit_applied_cents_check CHECK ((credit_applied_cents >= 0)),
  constraint payments_gift_email_valid CHECK (((gift_email IS NULL) OR ((gift_email = lower(btrim(gift_email))) AND (length(gift_email) <= 254) AND (gift_email ~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$'::text) AND (product = ANY (ARRAY['guide_bandit'::text, 'guide_assassin'::text, 'guide_mage'::text, 'guide_spearman'::text, 'guide_page'::text, 'guide_fighter'::text]))))),
  constraint payments_processing_fee_cents_check CHECK (((processing_fee_cents = 0) OR ((processing_fee_cents >= 11) AND (processing_fee_cents <= 49)))),
  constraint payments_referral_valid CHECK (((referral_email IS NULL) OR ((gift_email IS NULL) AND (product = ANY (ARRAY['guide_bandit'::text, 'guide_assassin'::text, 'guide_mage'::text, 'guide_spearman'::text, 'guide_page'::text, 'guide_fighter'::text])) AND (referral_email = lower(btrim(referral_email))) AND (length(referral_email) <= 254) AND (referral_email ~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$'::text)))),
  constraint payments_status_check CHECK ((status = ANY (ARRAY['awaiting_slip'::text, 'pending'::text, 'ok'::text, 'credited'::text, 'rejected'::text, 'cancelled'::text, 'revoked'::text]))),
  constraint payments_trans_ref_key UNIQUE (trans_ref)
);
create table public.products (
  id text not null,
  name text not null,
  price integer not null,
  kind text not null,
  days integer,
  sort integer default 0 not null,
  active boolean default true not null,
  constraint products_pkey PRIMARY KEY (id),
  constraint products_kind_check CHECK ((kind = ANY (ARRAY['once'::text, 'monthly'::text]))),
  constraint products_price_check CHECK ((price > 0))
);
create table public.profiles (
  id uuid not null,
  ign text,
  contact text,
  created_at timestamp with time zone default now() not null,
  constraint profiles_pkey PRIMARY KEY (id),
  constraint profiles_contact_check CHECK ((char_length(contact) <= 80)),
  constraint profiles_ign_check CHECK ((char_length(ign) <= 30))
);
create table private.admins (
  user_id uuid not null,
  constraint admins_pkey PRIMARY KEY (user_id)
);
create table private.codes (
  code text not null,
  product text not null,
  used_by uuid,
  used_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint codes_pkey PRIMARY KEY (code)
);
create table private.credit_accounts (
  user_id uuid not null,
  balance_cents bigint default 0 not null,
  constraint credit_accounts_pkey PRIMARY KEY (user_id),
  constraint credit_accounts_balance_cents_check CHECK ((balance_cents >= 0))
);
create table private.grandfather (
  email text not null,
  product text not null,
  constraint grandfather_pkey PRIMARY KEY (email, product)
);
create table private.market_contact_rewards (
  id bigint generated always as identity,
  payment_id bigint not null,
  recipient_email text not null,
  intended_user uuid,
  claimed_by uuid,
  remaining integer default 10 not null,
  revoked boolean default false not null,
  created_at timestamp with time zone default now() not null,
  constraint market_contact_rewards_pkey PRIMARY KEY (id),
  constraint market_contact_rewards_payment_id_recipient_email_key UNIQUE (payment_id, recipient_email),
  constraint market_contact_rewards_remaining_check CHECK (((remaining >= 0) AND (remaining <= 10)))
);
create table private.market_contact_unlocks (
  user_id uuid not null,
  month_key date not null,
  listing_id bigint not null,
  opened_at timestamp with time zone default now() not null,
  bonus_reward_id bigint,
  constraint market_contact_unlocks_pkey PRIMARY KEY (user_id, month_key, listing_id)
);
create table private.marketplace_contacts (
  listing_id bigint not null,
  contacts jsonb not null,
  constraint marketplace_contacts_pkey PRIMARY KEY (listing_id),
  constraint marketplace_contacts_contacts_check CHECK ((jsonb_typeof(contacts) = 'object'::text))
);
create table private.navigation_content (
  key text not null,
  payload jsonb not null,
  constraint navigation_content_pkey PRIMARY KEY (key)
);
create table private.payment_gifts (
  payment_id bigint not null,
  recipient_email text not null,
  claimed_by uuid,
  claimed_at timestamp with time zone,
  constraint payment_gifts_pkey PRIMARY KEY (payment_id)
);
create table private.payment_settings (
  id boolean default true not null,
  enabled boolean default false not null,
  bank text default ''::text not null,
  account_number text default ''::text not null,
  recipient_name text default ''::text not null,
  qr_path text default ''::text not null,
  auto_verify boolean default false not null,
  qr_payload text default ''::text not null,
  constraint payment_settings_pkey PRIMARY KEY (id),
  constraint payment_settings_id_check CHECK (id)
);
create table private.secrets (
  k text not null,
  v text not null,
  constraint secrets_pkey PRIMARY KEY (k)
);
create table private.transfer_receipts (
  trans_ref text not null,
  user_id uuid not null,
  payment_id bigint not null,
  amount_cents bigint not null,
  verified_at timestamp with time zone default now() not null,
  method text not null,
  constraint transfer_receipts_pkey PRIMARY KEY (trans_ref),
  constraint transfer_receipts_amount_cents_check CHECK ((amount_cents > 0)),
  constraint transfer_receipts_method_check CHECK ((method = ANY (ARRAY['provider'::text, 'admin'::text]))),
  constraint transfer_receipts_payment_id_key UNIQUE (payment_id)
);

-- Foreign keys
alter table private.codes add constraint codes_product_fkey FOREIGN KEY (product) REFERENCES public.products(id);
alter table private.credit_accounts add constraint credit_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table private.grandfather add constraint grandfather_product_fkey FOREIGN KEY (product) REFERENCES public.products(id);
alter table private.market_contact_rewards add constraint market_contact_rewards_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES auth.users(id);
alter table private.market_contact_rewards add constraint market_contact_rewards_intended_user_fkey FOREIGN KEY (intended_user) REFERENCES auth.users(id);
alter table private.market_contact_rewards add constraint market_contact_rewards_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);
alter table private.market_contact_unlocks add constraint market_contact_unlocks_bonus_reward_id_fkey FOREIGN KEY (bonus_reward_id) REFERENCES private.market_contact_rewards(id);
alter table private.market_contact_unlocks add constraint market_contact_unlocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table private.marketplace_contacts add constraint marketplace_contacts_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
alter table private.payment_gifts add constraint payment_gifts_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES auth.users(id);
alter table private.payment_gifts add constraint payment_gifts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);
alter table private.transfer_receipts add constraint transfer_receipts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);
alter table private.transfer_receipts add constraint transfer_receipts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.credit_ledger add constraint credit_ledger_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);
alter table public.credit_ledger add constraint credit_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.entitlements add constraint entitlements_product_fkey FOREIGN KEY (product) REFERENCES public.products(id);
alter table public.entitlements add constraint entitlements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.guide_progress add constraint guide_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.listings add constraint listings_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);
alter table public.listings add constraint listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.payments add constraint payments_product_fkey FOREIGN KEY (product) REFERENCES public.products(id);
alter table public.payments add constraint payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX credit_ledger_owner_time ON public.credit_ledger USING btree (user_id, created_at DESC);
CREATE INDEX listings_item_idx ON public.listings USING btree (item_id);
CREATE INDEX listings_market_open ON public.listings USING btree (created_at DESC) WHERE (status = 'open'::text);
CREATE INDEX listings_owner ON public.listings USING btree (user_id, created_at DESC);
CREATE INDEX listings_price_reference ON public.listings USING btree (item_id, created_at DESC) WHERE ((kind = 'sell'::text) AND (status = 'open'::text) AND (price_unit = 'meso'::text) AND price_reference_eligible);
CREATE INDEX listings_user_idx ON public.listings USING btree (user_id);
CREATE INDEX market_contact_rewards_available ON private.market_contact_rewards USING btree (claimed_by, id) WHERE ((remaining > 0) AND (NOT revoked));
CREATE INDEX market_contact_rewards_pending ON private.market_contact_rewards USING btree (recipient_email) WHERE ((claimed_by IS NULL) AND (NOT revoked));
CREATE INDEX payment_gifts_unclaimed_email ON private.payment_gifts USING btree (recipient_email) WHERE (claimed_by IS NULL);
CREATE INDEX payments_due_lookup ON public.payments USING btree (amount_due_cents, created_at DESC) WHERE (amount_due_cents > 0);
CREATE INDEX payments_user_idx ON public.payments USING btree (user_id);
CREATE UNIQUE INDEX payments_one_open_order ON public.payments USING btree (user_id, product, COALESCE(gift_email, ''::text)) WHERE (status = ANY (ARRAY['awaiting_slip'::text, 'pending'::text]));
CREATE UNIQUE INDEX payments_unique_slip ON public.payments USING btree (slip_path) WHERE ((slip_path IS NOT NULL) AND (slip_path <> ''::text));

-- Functions
CREATE OR REPLACE FUNCTION private.change_credit(uid uuid, p_payment bigint, p_kind text, p_delta bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE balance bigint;
BEGIN
 IF p_delta=0 THEN RETURN; END IF;
 INSERT INTO private.credit_accounts(user_id) VALUES(uid) ON CONFLICT DO NOTHING;
 UPDATE private.credit_accounts SET balance_cents=balance_cents+p_delta WHERE user_id=uid AND balance_cents+p_delta>=0 RETURNING balance_cents INTO balance;
 IF balance IS NULL THEN RAISE EXCEPTION 'เครดิตไม่เพียงพอ'; END IF;
 INSERT INTO public.credit_ledger(user_id,payment_id,kind,delta_cents,balance_after_cents) VALUES(uid,p_payment,p_kind,p_delta,balance);
END $function$
;

CREATE OR REPLACE FUNCTION private.claim_gifts(uid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE em text; r record;
BEGIN
 SELECT lower(email) INTO em FROM auth.users WHERE id=uid AND email_confirmed_at IS NOT NULL;
 IF em IS NULL THEN RETURN; END IF;
 FOR r IN SELECT g.payment_id,p.product FROM private.payment_gifts g JOIN public.payments p ON p.id=g.payment_id WHERE g.recipient_email=em AND g.claimed_by IS NULL AND p.status='ok' ORDER BY g.payment_id FOR UPDATE OF g LOOP
  IF NOT private.has_product(uid,r.product) THEN PERFORM private.grant_product(uid,r.product,'gift'); END IF;
  UPDATE private.payment_gifts SET claimed_by=uid,claimed_at=now() WHERE payment_id=r.payment_id;
 END LOOP;
END $function$
;

CREATE OR REPLACE FUNCTION private.claim_market_rewards(uid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE em text;
BEGIN
 SELECT lower(email) INTO em FROM auth.users WHERE id=uid AND email_confirmed_at IS NOT NULL AND NOT is_anonymous;
 IF em IS NULL THEN RETURN; END IF;
 UPDATE private.market_contact_rewards r SET claimed_by=uid
 WHERE r.claimed_by IS NULL AND NOT r.revoked
 AND (r.intended_user=uid OR (r.intended_user IS NULL AND r.recipient_email=em))
 AND EXISTS(SELECT 1 FROM public.payments p WHERE p.id=r.payment_id AND p.status='ok');
END $function$
;

CREATE OR REPLACE FUNCTION private.deliver_payment(p_payment bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE pay public.payments%rowtype; receiver uuid;
BEGIN
 SELECT * INTO pay FROM public.payments WHERE id=p_payment;
 IF pay.status IS DISTINCT FROM 'ok' THEN RETURN; END IF;
 IF pay.gift_email IS NULL THEN PERFORM private.grant_product(pay.user_id,pay.product,'payment'); RETURN; END IF;
 INSERT INTO private.payment_gifts(payment_id,recipient_email) VALUES(pay.id,pay.gift_email) ON CONFLICT DO NOTHING;
 SELECT id INTO receiver FROM auth.users WHERE lower(email)=pay.gift_email AND email_confirmed_at IS NOT NULL;
 IF receiver IS NOT NULL THEN PERFORM private.claim_gifts(receiver); END IF;
END $function$
;

CREATE OR REPLACE FUNCTION private.grant_product(uid uuid, p text, src text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k text; d int; cur timestamptz;
begin
  select kind, days into k, d from public.products where id = p;
  if k is null then raise exception 'ไม่พบสินค้า'; end if;
  if k = 'once' then
    insert into public.entitlements(user_id, product, expires_at, source) values (uid, p, null, src)
    on conflict (user_id, product) do update set expires_at = null, source = excluded.source, updated_at = now();
  else
    select expires_at into cur from public.entitlements where user_id = uid and product = p;
    insert into public.entitlements(user_id, product, expires_at, source)
      values (uid, p, greatest(coalesce(cur, now()), now()) + make_interval(days => d), src)
    on conflict (user_id, product) do update set expires_at = greatest(coalesce(public.entitlements.expires_at, now()), now()) + make_interval(days => d), source = excluded.source, updated_at = now();
  end if;
end $function$
;

CREATE OR REPLACE FUNCTION private.has_any_guide(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists(select 1 from public.entitlements e where e.user_id = uid and e.product like 'guide\_%' and (e.expires_at is null or e.expires_at > now())) or private.is_admin(uid) $function$
;

CREATE OR REPLACE FUNCTION private.has_product(uid uuid, p text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists(select 1 from public.entitlements e where e.user_id = uid and e.product = p and (e.expires_at is null or e.expires_at > now())) $function$
;

CREATE OR REPLACE FUNCTION private.is_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists(select 1 from private.admins a where a.user_id = uid) $function$
;

CREATE OR REPLACE FUNCTION private.market_item_category(t text, sub text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ SELECT CASE WHEN t='Equip' THEN CASE WHEN sub IN ('Bow','Crossbow','Claw','Dagger','One-Handed Axe','One-Handed Blunt Weapon','One-Handed Sword','Polearm','Spear','Staff','Two-Handed Axe','Two-Handed Blunt Weapon','Two-Handed Sword','Wand') THEN 'weapon' ELSE 'armor' END WHEN sub='Scroll' THEN 'scroll' WHEN t='Etc' THEN 'material' WHEN t='Use' THEN 'consumable' ELSE 'other' END $function$
;

CREATE OR REPLACE FUNCTION private.market_item_fields(t text, sub text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ SELECT CASE WHEN t<>'Equip' THEN ARRAY[]::text[] WHEN sub IN ('Staff','Wand') THEN ARRAY['matk','atk','int','luk','mdef','hp','mp'] WHEN private.market_item_category(t,sub)='weapon' THEN ARRAY['atk','str','dex','int','luk','acc','speed'] WHEN sub='Shield' THEN ARRAY['def','mdef','str','dex','int','luk','hp','mp','acc','avoid'] WHEN sub='Gloves' THEN ARRAY['def','atk','matk','str','dex','int','luk','acc','avoid','hp','mp'] ELSE ARRAY['def','mdef','str','dex','int','luk','hp','mp','acc','avoid','speed','jump'] END $function$
;

CREATE OR REPLACE FUNCTION private.marketplace_close(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 UPDATE public.listings SET status='done',updated_at=now() WHERE id=p_id AND (user_id=auth.uid() OR private.is_admin(auth.uid()));
 IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบประกาศที่คุณจัดการได้'; END IF;
END $function$
;

CREATE OR REPLACE FUNCTION private.marketplace_contact(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); l public.listings%rowtype; c jsonb; m date:=date_trunc('month',now() AT TIME ZONE 'Asia/Bangkok')::date; unrestricted boolean; reward_id bigint;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND NOT is_anonymous) THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 unrestricted:=private.is_admin(uid) OR private.has_product(uid,'market');
 SELECT * INTO l FROM public.listings WHERE id=p_id;
 IF l.id IS NULL OR l.price_unit<>'meso' OR (l.user_id<>uid AND NOT private.is_admin(uid) AND (l.status<>'open' OR l.expires_at<=now())) THEN RAISE EXCEPTION 'ประกาศนี้ปิดหรือหมดอายุแล้ว'; END IF;
 SELECT contacts INTO c FROM private.marketplace_contacts WHERE listing_id=p_id;
 IF c IS NULL THEN SELECT jsonb_build_object('other',contact) INTO c FROM public.profiles WHERE id=l.user_id AND length(btrim(contact))>0; END IF;
 c:=coalesce(c,'{}'::jsonb);
 IF c='{}'::jsonb OR l.user_id=uid OR unrestricted THEN RETURN c; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('market-contact:'||uid::text||':'||m::text,0));
 IF NOT EXISTS(SELECT 1 FROM private.market_contact_unlocks WHERE user_id=uid AND month_key=m AND listing_id=p_id) THEN
  IF (SELECT count(*) FROM private.market_contact_unlocks WHERE user_id=uid AND month_key=m AND bonus_reward_id IS NULL)>=10 THEN
   SELECT r.id INTO reward_id FROM private.market_contact_rewards r JOIN public.payments p ON p.id=r.payment_id WHERE r.claimed_by=uid AND r.remaining>0 AND NOT r.revoked AND p.status='ok' ORDER BY r.id LIMIT 1 FOR UPDATE OF r;
   IF reward_id IS NULL THEN RAISE EXCEPTION 'LOCKED'; END IF;
   UPDATE private.market_contact_rewards SET remaining=remaining-1 WHERE id=reward_id;
  END IF;
  INSERT INTO private.market_contact_unlocks(user_id,month_key,listing_id,bonus_reward_id) VALUES(uid,m,p_id,reward_id);
 END IF;
 RETURN c;
END $function$
;

CREATE OR REPLACE FUNCTION private.marketplace_contact_quota()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); m date:=date_trunc('month',now() AT TIME ZONE 'Asia/Bangkok')::date; used integer; unlimited boolean; bonus integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 unlimited:=private.is_admin(uid) OR private.has_product(uid,'market');
 SELECT count(*) INTO used FROM private.market_contact_unlocks WHERE user_id=uid AND month_key=m AND bonus_reward_id IS NULL;
 SELECT coalesce(sum(r.remaining),0)::integer INTO bonus FROM private.market_contact_rewards r JOIN public.payments p ON p.id=r.payment_id WHERE r.claimed_by=uid AND NOT r.revoked AND p.status='ok';
 RETURN jsonb_build_object('limit',10,'used',used,'remaining',greatest(0,10-used)+bonus,'free_remaining',greatest(0,10-used),'bonus_remaining',bonus,'unlimited',unlimited,'resets_at',(m+interval '1 month') AT TIME ZONE 'Asia/Bangkok');
END $function$
;

CREATE OR REPLACE FUNCTION private.marketplace_save(p_id bigint, p_data jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE item public.items%rowtype; result_id bigint; stats jsonb; k text; v jsonb; d jsonb:=p_data;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 IF p_data->>'price_unit' IS DISTINCT FROM 'meso' THEN RAISE EXCEPTION 'ตลาดนี้ลงราคาได้เฉพาะ Meso'; END IF;
 IF p_data ? 'item_id' THEN
  IF coalesce(p_data->>'item_id','') !~ '^[0-9]{1,9}$' THEN RAISE EXCEPTION 'เลือกไอเทมจากรายการค้นหา'; END IF;
  SELECT * INTO item FROM public.items WHERE id=(p_data->>'item_id')::int;
  IF item.id IS NULL THEN RAISE EXCEPTION 'ไม่พบไอเทมในฐานข้อมูล'; END IF;
 ELSE
  SELECT * INTO item FROM public.items WHERE lower(name)=lower(btrim(p_data->>'item_name')) LIMIT 1;
 END IF;
 stats:=coalesce(p_data->'item_stats','{}'::jsonb);
 IF jsonb_typeof(stats) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'สเตตัสไม่ถูกต้อง'; END IF;
 FOR k,v IN SELECT key,value FROM jsonb_each(stats) LOOP
  IF item.id IS NULL OR NOT k=ANY(private.market_item_fields(item.type,item.subtype)) OR jsonb_typeof(v)<>'number' OR v::text !~ '^[0-9]{1,5}$' OR (v::text)::int>(CASE WHEN k IN ('hp','mp') THEN 99999 ELSE 999 END) THEN RAISE EXCEPTION 'สเตตัสไม่ตรงกับชนิดไอเทม'; END IF;
 END LOOP;
 IF item.id IS NOT NULL THEN
  d:=d||jsonb_build_object('item_name',item.name,'category',private.market_item_category(item.type,item.subtype),'atk',coalesce(stats->>'atk',''));
  IF item.type<>'Equip' THEN d:=d||jsonb_build_object('slots',''); END IF;
 END IF;
 result_id:=private.marketplace_save_legacy(p_id,d);
 UPDATE public.listings SET item_id=item.id,item_stats=stats WHERE id=result_id;
 RETURN result_id;
END $function$
;

CREATE OR REPLACE FUNCTION private.marketplace_save_legacy(p_id bigint, p_data jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); lid bigint; c jsonb; k text; v text; n text; cat text; unit text;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND NOT is_anonymous) THEN RAISE EXCEPTION 'เข้าสู่ระบบเพื่อโพสต์ประกาศ'; END IF;
 IF p_data IS NULL OR jsonb_typeof(p_data)<>'object' THEN RAISE EXCEPTION 'ข้อมูลประกาศไม่ถูกต้อง'; END IF;
 n:=btrim(p_data->>'item_name'); cat:=p_data->>'category'; unit:=p_data->>'price_unit'; c:=p_data->'contacts';
 IF n IS NULL OR length(n)<2 OR length(n)>120 OR cat IS NULL OR cat NOT IN ('weapon','armor','scroll','material','consumable','other') OR unit IS NULL OR unit NOT IN ('meso','thb') OR p_data->>'kind' IS NULL OR p_data->>'kind' NOT IN ('buy','sell') OR coalesce(p_data->>'qty','') !~ '^[0-9]{1,4}$' OR coalesce(p_data->>'price','') !~ '^[0-9]{1,10}$' OR length(coalesce(p_data->>'description',''))>1500 THEN RAISE EXCEPTION 'กรอกชื่อสินค้า จำนวน และราคาให้ถูกต้อง'; END IF;
 IF c IS NULL OR jsonb_typeof(c)<>'object' OR c='{}'::jsonb THEN RAISE EXCEPTION 'ระบุช่องทางติดต่ออย่างน้อยหนึ่งช่องทาง'; END IF;
 FOR k,v IN SELECT key,value FROM jsonb_each_text(c) LOOP
  IF k NOT IN ('discord','line','facebook','other') OR v IS NULL OR length(btrim(v))<2 OR length(v)>300 THEN RAISE EXCEPTION 'ช่องทางติดต่อไม่ถูกต้อง'; END IF;
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended('market:'||uid::text,0));
 IF p_id IS NULL THEN
  IF (SELECT count(*) FROM public.listings WHERE user_id=uid AND status='open' AND expires_at>now())>=20 THEN RAISE EXCEPTION 'มีประกาศเปิดอยู่ครบ 20 โพสต์แล้ว ปิดโพสต์เดิมก่อนลงใหม่'; END IF;
  IF (SELECT count(*) FROM public.listings WHERE user_id=uid AND created_at>now()-interval '1 day')>=50 THEN RAISE EXCEPTION 'ลงประกาศบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้'; END IF;
  INSERT INTO public.listings(user_id,kind,item_name,category,description,qty,price,price_unit,atk,slots) VALUES(uid,p_data->>'kind',n,cat,btrim(coalesce(p_data->>'description','')),(p_data->>'qty')::int,(p_data->>'price')::bigint,unit,nullif(p_data->>'atk','')::int,nullif(p_data->>'slots','')::int) RETURNING id INTO lid;
 ELSE
  SELECT id INTO lid FROM public.listings WHERE id=p_id AND user_id=uid AND status='open' AND expires_at>now() FOR UPDATE;
  IF lid IS NULL THEN RAISE EXCEPTION 'แก้ไขได้เฉพาะประกาศของคุณที่ยังเปิดอยู่'; END IF;
  UPDATE public.listings SET kind=p_data->>'kind',item_name=n,category=cat,description=btrim(coalesce(p_data->>'description','')),qty=(p_data->>'qty')::int,price=(p_data->>'price')::bigint,price_unit=unit,atk=nullif(p_data->>'atk','')::int,slots=nullif(p_data->>'slots','')::int,updated_at=now() WHERE id=lid;
 END IF;
 INSERT INTO private.marketplace_contacts(listing_id,contacts) VALUES(lid,c) ON CONFLICT(listing_id) DO UPDATE SET contacts=excluded.contacts;
 RETURN lid;
END $function$
;

CREATE OR REPLACE FUNCTION private.payment_due_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ BEGIN NEW.amount_due_cents:=coalesce(NEW.amount_due_cents,NEW.amount::bigint*100); RETURN NEW; END $function$
;

CREATE OR REPLACE FUNCTION private.payment_market_promotion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE friend_email text; receiver uuid; buyer_email text;
BEGIN
 IF NEW.status='revoked' THEN UPDATE private.market_contact_rewards SET revoked=true,remaining=0 WHERE payment_id=NEW.id;RETURN NEW;END IF;
 IF NEW.status<>'ok' OR NEW.product NOT IN ('guide_bandit','guide_assassin','guide_mage','guide_spearman','guide_page','guide_fighter') THEN RETURN NEW;END IF;
 friend_email:=coalesce(NEW.gift_email,NEW.referral_email);
 IF friend_email IS NULL THEN RETURN NEW;END IF;
 buyer_email:=lower(NEW.email);
 IF buyer_email IS NULL OR buyer_email=friend_email OR NEW.user_id IS NULL THEN RETURN NEW;END IF;
 INSERT INTO private.market_contact_rewards(payment_id,recipient_email,intended_user)
 VALUES(NEW.id,buyer_email,NEW.user_id),(NEW.id,friend_email,NULL) ON CONFLICT DO NOTHING;
 PERFORM private.claim_market_rewards(NEW.user_id);
 SELECT id INTO receiver FROM auth.users WHERE lower(email)=friend_email AND email_confirmed_at IS NOT NULL AND NOT is_anonymous;
 IF receiver IS NOT NULL THEN PERFORM private.claim_market_rewards(receiver);END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION private.promptpay_receiver(p_payload text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
DECLARE fields jsonb:='{}'; nested jsonb:='{}'; text_part text; tag text; size integer; pos integer; crc integer:=65535; i integer; j integer;
BEGIN
 IF p_payload IS NULL OR length(p_payload)>512 OR length(p_payload)<12 THEN RETURN NULL; END IF;
 pos:=1;
 WHILE pos<=length(p_payload) LOOP
  IF substring(p_payload,pos,4)!~'^[0-9]{4}$' THEN RETURN NULL; END IF;
  tag:=substring(p_payload,pos,2);size:=substring(p_payload,pos+2,2)::integer;
  IF fields?tag OR pos+3+size>length(p_payload) THEN RETURN NULL; END IF;
  fields:=fields||jsonb_build_object(tag,substring(p_payload,pos+4,size));pos:=pos+4+size;
 END LOOP;
 IF tag<>'63' OR size<>4 THEN RETURN NULL; END IF;
 FOR i IN 1..length(p_payload)-4 LOOP
  crc:=crc # (ascii(substring(p_payload,i,1))<<8);
  FOR j IN 1..8 LOOP
   IF crc&32768<>0 THEN crc:=((crc<<1)#4129)&65535; ELSE crc:=(crc<<1)&65535; END IF;
  END LOOP;
 END LOOP;
 IF fields->>'63'<>upper(lpad(to_hex(crc),4,'0')) THEN RETURN NULL; END IF;
 text_part:=fields->>'29';IF text_part IS NULL THEN RETURN NULL;END IF;pos:=1;
 WHILE pos<=length(text_part) LOOP
  IF substring(text_part,pos,4)!~'^[0-9]{4}$' THEN RETURN NULL; END IF;
  tag:=substring(text_part,pos,2);size:=substring(text_part,pos+2,2)::integer;
  IF nested?tag OR pos+3+size>length(text_part) THEN RETURN NULL; END IF;
  nested:=nested||jsonb_build_object(tag,substring(text_part,pos+4,size));pos:=pos+4+size;
 END LOOP;
 IF nested->>'00'<>'A000000677010111' OR nested ?| ARRAY['01','02','04'] OR coalesce(nested->>'03','')!~'^[0-9]{15}$' THEN RETURN NULL; END IF;
 RETURN nested->>'03';
END $function$
;

CREATE OR REPLACE FUNCTION private.read_navigation(p_guide text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); result jsonb;
BEGIN
 IF uid IS NULL OR p_guide IS NULL OR p_guide NOT IN ('bandit','assassin','mage','spearman','page','fighter') THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบและเลือกไกด์'; END IF;
 IF NOT coalesce(private.has_product(uid,'guide_'||p_guide) OR private.is_admin(uid),false) THEN RAISE EXCEPTION 'ยังไม่มีสิทธิ์ใช้ระบบนำทาง'; END IF;
 SELECT payload INTO result FROM private.navigation_content WHERE key='v1';
 IF result IS NULL THEN RAISE EXCEPTION 'ระบบนำทางยังไม่พร้อม'; END IF;
 RETURN result;
END $function$
;

CREATE OR REPLACE FUNCTION private.settle_transfer(p_payment bigint, p_cents bigint, p_ref text, p_method text, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE pay public.payments%rowtype; receipt private.transfer_receipts%rowtype;
BEGIN
 SELECT * INTO pay FROM public.payments WHERE id=p_payment;
 IF pay.user_id IS NULL THEN RAISE EXCEPTION 'ไม่พบบัญชีลูกค้า'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(pay.user_id::text,0));
 SELECT * INTO pay FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF pay.status<>'pending' THEN RETURN jsonb_build_object('status',pay.status,'code','ALREADY_HANDLED'); END IF;
 IF p_cents IS NULL OR p_cents NOT BETWEEN 1 AND 100000000 OR p_ref IS NULL OR length(btrim(p_ref)) NOT BETWEEN 6 AND 200 OR p_method NOT IN ('admin','provider') THEN RAISE EXCEPTION 'ข้อมูลยอดเงินจริงไม่ถูกต้อง'; END IF;
 p_ref:=btrim(p_ref);
 -- Consumption is defined by our ledger, not by whether the provider has seen a slip before.
 IF EXISTS(SELECT 1 FROM public.payments WHERE trans_ref=p_ref AND id<>p_payment) OR EXISTS(SELECT 1 FROM private.transfer_receipts WHERE trans_ref=p_ref) THEN
  IF EXISTS(SELECT 1 FROM public.payments WHERE trans_ref=p_ref AND user_id=pay.user_id AND id<>p_payment) THEN
   PERFORM private.change_credit(pay.user_id,p_payment,'release',pay.credit_applied_cents);
   UPDATE public.payments SET status='rejected',verification_lease=NULL,verification_code='DUPLICATE_REFERENCE',reviewed_at=now(),review_note='สลิปนี้ถูกบันทึกในบัญชีนี้แล้ว เลือกใช้เครดิตคงเหลือหรือดูรายการที่ชำระสำเร็จเดิมได้' WHERE id=p_payment;
   RETURN jsonb_build_object('status','rejected','code','DUPLICATE_REFERENCE');
  END IF;
  RETURN jsonb_build_object('status','pending','code','DUPLICATE_REFERENCE');
 END IF;
 BEGIN
  INSERT INTO private.transfer_receipts(trans_ref,user_id,payment_id,amount_cents,method) VALUES(p_ref,pay.user_id,p_payment,p_cents,p_method);
  UPDATE public.payments SET trans_ref=p_ref,received_cents=p_cents,verified_automatically=(p_method='provider'),verification_lease=NULL,reviewed_at=now(),reviewed_by=CASE WHEN p_method='admin' THEN auth.uid() ELSE NULL END WHERE id=p_payment;
  PERFORM private.change_credit(pay.user_id,p_payment,'transfer',p_cents);
  IF p_cents>=pay.amount_due_cents THEN
   PERFORM private.change_credit(pay.user_id,p_payment,'purchase',-pay.amount_due_cents);
   UPDATE public.payments SET status='ok',verification_code='VERIFIED',review_note=CASE WHEN p_cents>pay.amount_due_cents THEN 'ชำระสำเร็จ ยอดส่วนเกินเก็บเป็นเครดิตคงเหลือ' ELSE 'ตรวจสอบการชำระเงินสำเร็จ' END||CASE WHEN coalesce(p_note,'')<>'' THEN ' · '||left(p_note,250) ELSE '' END WHERE id=p_payment;
   PERFORM private.deliver_payment(pay.id);
   RETURN jsonb_build_object('status','ok','code','VERIFIED','excess_cents',p_cents-pay.amount_due_cents);
  ELSE
   PERFORM private.change_credit(pay.user_id,p_payment,'release',pay.credit_applied_cents);
   UPDATE public.payments SET status='credited',verification_code='UNDERPAID_CREDITED',review_note='ยอดโอนต่ำกว่ายอดชำระ เก็บเงินที่ได้รับเป็นเครดิตคงเหลือแล้ว เลือกซื้อแพ็กใหม่ได้'||CASE WHEN coalesce(p_note,'')<>'' THEN ' · '||left(p_note,250) ELSE '' END WHERE id=p_payment;
   RETURN jsonb_build_object('status','credited','code','UNDERPAID_CREDITED','credited_cents',p_cents);
  END IF;
 EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('status','pending','code','DUPLICATE_REFERENCE');
 END;
END $function$
;

CREATE OR REPLACE FUNCTION public.admin_add_grandfather(p_emails text[], p_product text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n int;
begin
  if not private.is_admin(auth.uid()) then raise exception 'สำหรับแอดมินเท่านั้น'; end if;
  insert into private.grandfather(email, product) select distinct lower(btrim(e)), p_product from unnest(p_emails) e where btrim(e) <> '' on conflict do nothing;
  get diagnostics n = row_count; return n;
end $function$
;

CREATE OR REPLACE FUNCTION public.admin_grant(p_email text, p_product text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid;
begin
  if not private.is_admin(auth.uid()) then raise exception 'สำหรับแอดมินเท่านั้น'; end if;
  select id into uid from auth.users where lower(email) = lower(btrim(p_email));
  if uid is null then raise exception 'ไม่พบผู้ใช้อีเมลนี้'; end if;
  perform private.grant_product(uid, p_product, 'admin');
end $function$
;

CREATE OR REPLACE FUNCTION public.admin_make_codes(p_product text, p_n integer)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare out text[] := '{}'; c text; i int;
begin
  if not private.is_admin(auth.uid()) then raise exception 'สำหรับแอดมินเท่านั้น'; end if;
  for i in 1..least(greatest(p_n,1),50) loop
    c := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));
    insert into private.codes(code, product) values (c, p_product);
    out := out || c;
  end loop;
  return out;
end $function$
;

CREATE OR REPLACE FUNCTION public.admin_payment_orders()
 RETURNS SETOF public.payments
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 RETURN QUERY SELECT * FROM public.payments ORDER BY (status='pending') DESC,id DESC LIMIT 200;
END $function$
;

CREATE OR REPLACE FUNCTION public.admin_payment_settings(p_enabled boolean, p_bank text, p_account text, p_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 IF p_enabled IS NULL OR p_bank IS NULL OR p_account IS NULL OR p_name IS NULL OR length(p_bank)>100 OR length(p_account)>40 OR length(p_name)>160 THEN RAISE EXCEPTION 'ข้อมูลบัญชีไม่ถูกต้อง'; END IF;
 IF p_enabled AND (length(btrim(p_bank))<2 OR length(btrim(p_account))<6 OR length(btrim(p_name))<2) THEN RAISE EXCEPTION 'กรอกข้อมูลผู้รับก่อนเปิดรับเงิน'; END IF;
 UPDATE private.payment_settings SET qr_payload=CASE WHEN bank=btrim(p_bank) AND account_number=btrim(p_account) AND recipient_name=btrim(p_name) THEN qr_payload ELSE '' END,qr_path=CASE WHEN bank=btrim(p_bank) AND account_number=btrim(p_account) AND recipient_name=btrim(p_name) THEN qr_path ELSE '' END,enabled=p_enabled,bank=btrim(p_bank),account_number=btrim(p_account),recipient_name=btrim(p_name) WHERE id;
END $function$
;

CREATE OR REPLACE FUNCTION public.admin_payments(p_limit integer DEFAULT 200)
 RETURNS TABLE(id bigint, email text, product text, amount integer, trans_ref text, slip_path text, status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not private.is_admin(auth.uid()) then raise exception 'สำหรับแอดมินเท่านั้น'; end if;
  return query select p.id, p.email, p.product, p.amount, p.trans_ref, p.slip_path, p.status, p.created_at from public.payments p order by p.id desc limit p_limit;
end $function$
;

CREATE OR REPLACE FUNCTION public.admin_record_transfer(p_payment bigint, p_amount numeric, p_bank_ref text, p_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 IF p_amount IS NULL OR p_amount<=0 OR p_amount>1000000 OR p_amount*100<>trunc(p_amount*100) THEN RAISE EXCEPTION 'ระบุยอดเงินจริงไม่เกินสองตำแหน่งทศนิยม'; END IF;
 RETURN private.settle_transfer(p_payment,(p_amount*100)::bigint,p_bank_ref,'admin',p_note);
END $function$
;

CREATE OR REPLACE FUNCTION public.admin_review_payment(p_payment bigint, p_approve boolean, p_amount integer, p_bank_ref text, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE pay public.payments%rowtype; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 SELECT * INTO pay FROM public.payments WHERE id=p_payment;
 IF p_approve IS NULL OR pay.id IS NULL OR pay.user_id IS NULL THEN RAISE EXCEPTION 'รายการไม่ถูกต้อง'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(pay.user_id::text,0));
 SELECT * INTO pay FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF pay.status<>'pending' THEN RAISE EXCEPTION 'รายการนี้ได้รับการจัดการแล้ว'; END IF;
 IF p_approve THEN
  result:=private.settle_transfer(p_payment,p_amount::bigint*100,p_bank_ref,'admin',p_note);
  IF result->>'code'='DUPLICATE_REFERENCE' THEN RAISE EXCEPTION 'เลขอ้างอิงธนาคารนี้ถูกใช้แล้ว'; END IF;
 ELSE
  IF p_note IS NULL OR length(btrim(p_note))<3 THEN RAISE EXCEPTION 'ระบุเหตุผลที่ไม่อนุมัติ'; END IF;
  PERFORM private.change_credit(pay.user_id,p_payment,'release',pay.credit_applied_cents);
  UPDATE public.payments SET status='rejected',verification_lease=NULL,reviewed_by=auth.uid(),reviewed_at=now(),review_note=left(btrim(p_note),500) WHERE id=p_payment;
 END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.admin_revoke(p_payment bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE pay public.payments%rowtype; k text; d int; receiver uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 SELECT * INTO pay FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF pay.id IS NULL OR pay.status='revoked' THEN RETURN; END IF;
 IF pay.status<>'ok' THEN RAISE EXCEPTION 'เพิกถอนได้เฉพาะรายการที่อนุมัติแล้ว'; END IF;
 UPDATE public.payments SET status='revoked' WHERE id=p_payment;
 IF pay.gift_email IS NOT NULL THEN
  SELECT claimed_by INTO receiver FROM private.payment_gifts WHERE payment_id=p_payment;
  DELETE FROM public.entitlements e WHERE e.user_id=receiver AND e.product=pay.product AND e.source='gift'
   AND NOT EXISTS(SELECT 1 FROM private.payment_gifts g JOIN public.payments p ON p.id=g.payment_id WHERE g.claimed_by=receiver AND p.product=pay.product AND p.status='ok')
   AND NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.user_id=receiver AND p.gift_email IS NULL AND p.product=pay.product AND p.status='ok');
  RETURN;
 END IF;
 SELECT kind,days INTO k,d FROM public.products WHERE id=pay.product;
 IF k='once' THEN
  DELETE FROM public.entitlements WHERE user_id=pay.user_id AND product=pay.product AND source='payment'
   AND NOT EXISTS(SELECT 1 FROM public.payments WHERE user_id=pay.user_id AND gift_email IS NULL AND product=pay.product AND status='ok')
   AND NOT EXISTS(SELECT 1 FROM private.payment_gifts g JOIN public.payments p ON p.id=g.payment_id WHERE g.claimed_by=pay.user_id AND p.product=pay.product AND p.status='ok');
 ELSE
  UPDATE public.entitlements SET expires_at=expires_at-make_interval(days=>d),updated_at=now() WHERE user_id=pay.user_id AND product=pay.product;
 END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.admin_save_verification_settings(p_enabled boolean, p_key text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE sid uuid; k text:=btrim(coalesce(p_key,''));
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'ระบุสถานะการตรวจสลิป'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('maplethai.easyslip.config',0));
 SELECT id INTO sid FROM vault.secrets WHERE name='maplethai_easyslip_api_key';
 IF k<>'' THEN
  IF k !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'API Key ของ EasySlip ต้องเป็น UUID v4'; END IF;
  IF sid IS NULL THEN PERFORM vault.create_secret(k,'maplethai_easyslip_api_key','MapleThai bank slip verification');
  ELSE PERFORM vault.update_secret(sid,k); END IF;
 END IF;
 IF p_enabled AND NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='maplethai_easyslip_api_key') THEN RAISE EXCEPTION 'ใส่ API Key ก่อนเปิดตรวจอัตโนมัติ'; END IF;
 UPDATE private.payment_settings SET auto_verify=p_enabled WHERE id;
END $function$
;

CREATE OR REPLACE FUNCTION public.admin_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not private.is_admin(auth.uid()) then raise exception 'สำหรับแอดมินเท่านั้น'; end if;
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'payments', (select count(*) from public.payments where status = 'ok'),
    'revenue', (select coalesce(sum(amount),0) from public.payments where status = 'ok'),
    'grandfather', (select count(*) from private.grandfather),
    'listings', (select count(*) from public.listings where status = 'open' and expires_at > now()));
end $function$
;

CREATE OR REPLACE FUNCTION public.admin_verification_settings()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 RETURN jsonb_build_object('enabled',(SELECT auto_verify FROM private.payment_settings WHERE id),'has_key',EXISTS(SELECT 1 FROM vault.secrets WHERE name='maplethai_easyslip_api_key'));
END $function$
;

CREATE OR REPLACE FUNCTION public.auto_verification_status()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT auto_verify AND EXISTS(SELECT 1 FROM vault.secrets WHERE name='maplethai_easyslip_api_key') FROM private.payment_settings WHERE id
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_payment_order(p_payment bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); pay public.payments%rowtype;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO pay FROM public.payments WHERE id=p_payment AND user_id=uid FOR UPDATE;
 IF pay.id IS NULL OR pay.status<>'awaiting_slip' THEN RAISE EXCEPTION 'ยกเลิกรายการนี้ไม่ได้'; END IF;
 PERFORM private.change_credit(uid,p_payment,'release',pay.credit_applied_cents);
 UPDATE public.payments SET status='cancelled' WHERE id=p_payment;
END $function$
;

CREATE OR REPLACE FUNCTION public.claim_payment(p_product text, p_qr text, p_slip_path text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); pr record; em text; recent int; q text := btrim(p_qr);
begin
  if uid is null then raise exception 'ต้องล็อกอินก่อน'; end if;
  select * into pr from public.products where id = p_product and active;
  if pr.id is null then raise exception 'ไม่พบสินค้า'; end if;
  if pr.kind = 'once' and private.has_product(uid, p_product) then raise exception 'คุณมีสิทธิ์นี้อยู่แล้ว'; end if;
  if q is null or char_length(q) < 30 or char_length(q) > 200 or q !~ '^0041000600000101' or position('5102TH' in q) = 0 then
    raise exception 'QR บนสลิปไม่ถูกต้อง ลองถ่ายหรือแคปสลิปใหม่ให้เห็น QR ชัดๆ';
  end if;
  if p_slip_path is null or split_part(p_slip_path, '/', 1) <> uid::text then raise exception 'ไฟล์สลิปไม่ถูกต้อง'; end if;
  select count(*) into recent from public.payments where user_id = uid and created_at > now() - interval '1 day';
  if recent >= 10 then raise exception 'ส่งสลิปบ่อยเกินไป ลองใหม่พรุ่งนี้'; end if;
  select email into em from auth.users where id = uid;
  begin
    insert into public.payments(user_id, email, product, amount, trans_ref, slip_path) values (uid, em, p_product, pr.price, q, p_slip_path);
  exception when unique_violation then
    raise exception 'สลิปนี้เคยถูกใช้แล้ว';
  end;
  perform private.grant_product(uid, p_product, 'payment');
  return public.sync_account();
end $function$
;

CREATE OR REPLACE FUNCTION public.create_gift_payment_order(p_product text, p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); pr public.products%rowtype; pay public.payments%rowtype; cfg jsonb; credit bigint; fee integer:=0; due bigint; target_email text:=lower(btrim(p_email)); target_uid uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 IF target_email IS NULL OR length(target_email)>254 OR target_email !~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'กรอกอีเมลผู้รับให้ถูกต้อง'; END IF;
 IF target_email=(SELECT lower(email) FROM auth.users WHERE id=uid) THEN RAISE EXCEPTION 'อีเมลนี้เป็นของคุณ กรุณาเอาติ๊กซื้อให้เพื่อนออก'; END IF;
 SELECT id INTO target_uid FROM auth.users WHERE lower(email)=target_email AND email_confirmed_at IS NOT NULL;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO pr FROM public.products WHERE id=p_product AND active AND id IN ('guide_bandit','guide_assassin','guide_mage','guide_spearman','guide_page','guide_fighter');
 IF pr.id IS NULL THEN RAISE EXCEPTION 'สินค้านี้ยังไม่เปิดขาย'; END IF;
 IF target_uid IS NOT NULL AND private.has_product(target_uid,p_product) THEN RAISE EXCEPTION 'ผู้รับมีไกด์นี้แล้ว'; END IF;
 SELECT * INTO pay FROM public.payments WHERE user_id=uid AND product=p_product AND gift_email=target_email AND status IN ('awaiting_slip','pending');
 IF pay.id IS NOT NULL THEN RETURN to_jsonb(pay); END IF;
 cfg:=public.payment_settings();
 IF NOT coalesce((cfg->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'ยังไม่เปิดรับชำระเงิน'; END IF;
 IF (SELECT count(*) FROM public.payments WHERE user_id=uid AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'สร้างรายการบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้'; END IF;
 credit:=least(coalesce((SELECT balance_cents FROM private.credit_accounts WHERE user_id=uid),0),pr.price::bigint*100);
 -- Full credit purchases have no bank transfer or processing fee. For partial
 -- purchases retain fractional credit so every QR ends in .11 through .49.
 IF credit<pr.price::bigint*100 THEN
  credit:=(credit/100)*100;
  due:=pr.price::bigint*100-credit;
  PERFORM pg_advisory_xact_lock(hashtextextended('payment-amount-allocation',0));
  SELECT s INTO fee FROM generate_series(11,49) s
  WHERE NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.amount_due_cents=due+s
    AND (p.status IN ('awaiting_slip','pending') OR p.created_at>now()-interval '24 hours'))
  ORDER BY random() LIMIT 1;
  IF fee IS NULL THEN RAISE EXCEPTION 'ยอดชำระช่วงนี้ถูกจองครบแล้ว กรุณาลองใหม่ภายหลัง'; END IF;
 END IF;
 INSERT INTO public.payments(user_id,email,product,amount,trans_ref,slip_path,status,recipient,credit_applied_cents,amount_due_cents,processing_fee_cents,gift_email) VALUES(uid,(SELECT email FROM auth.users WHERE id=uid),p_product,pr.price,'ORDER-'||gen_random_uuid()::text,'',CASE WHEN credit=pr.price::bigint*100 THEN 'ok' ELSE 'awaiting_slip' END,cfg,credit,pr.price::bigint*100-credit+fee,fee,target_email) RETURNING * INTO pay;
 PERFORM private.change_credit(uid,pay.id,'reserve',-credit);
 IF pay.status='ok' THEN
  PERFORM private.deliver_payment(pay.id);
  UPDATE public.payments SET verification_code='PAID_WITH_CREDIT',reviewed_at=now(),review_note='ชำระด้วยเครดิตคงเหลือ' WHERE id=pay.id RETURNING * INTO pay;
 END IF;
 RETURN to_jsonb(pay);
END $function$
;

CREATE OR REPLACE FUNCTION public.create_payment_order(p_product text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); pr public.products%rowtype; pay public.payments%rowtype; cfg jsonb; credit bigint; fee integer:=0; due bigint;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO pr FROM public.products WHERE id=p_product AND active AND id IN ('guide_bandit','guide_assassin','guide_mage','guide_spearman','guide_page','guide_fighter','market');
 IF pr.id IS NULL THEN RAISE EXCEPTION 'สินค้านี้ยังไม่เปิดขาย'; END IF;
 IF private.has_product(uid,p_product) THEN RAISE EXCEPTION 'คุณมีสิทธิ์นี้แล้ว'; END IF;
 SELECT * INTO pay FROM public.payments WHERE user_id=uid AND product=p_product AND gift_email IS NULL AND status IN ('awaiting_slip','pending');
 IF pay.id IS NOT NULL THEN RETURN to_jsonb(pay); END IF;
 cfg:=public.payment_settings();
 IF NOT coalesce((cfg->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'ยังไม่เปิดรับชำระเงิน'; END IF;
 IF (SELECT count(*) FROM public.payments WHERE user_id=uid AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'สร้างรายการบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้'; END IF;
 credit:=least(coalesce((SELECT balance_cents FROM private.credit_accounts WHERE user_id=uid),0),pr.price::bigint*100);
 -- Full credit purchases have no bank transfer or processing fee. For partial
 -- purchases retain fractional credit so every QR ends in .11 through .49.
 IF credit<pr.price::bigint*100 THEN
  credit:=(credit/100)*100;
  due:=pr.price::bigint*100-credit;
  PERFORM pg_advisory_xact_lock(hashtextextended('payment-amount-allocation',0));
  SELECT s INTO fee FROM generate_series(11,49) s
  WHERE NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.amount_due_cents=due+s
    AND (p.status IN ('awaiting_slip','pending') OR p.created_at>now()-interval '24 hours'))
  ORDER BY random() LIMIT 1;
  IF fee IS NULL THEN RAISE EXCEPTION 'ยอดชำระช่วงนี้ถูกจองครบแล้ว กรุณาลองใหม่ภายหลัง'; END IF;
 END IF;
 INSERT INTO public.payments(user_id,email,product,amount,trans_ref,slip_path,status,recipient,credit_applied_cents,amount_due_cents,processing_fee_cents) VALUES(uid,(SELECT email FROM auth.users WHERE id=uid),p_product,pr.price,'ORDER-'||gen_random_uuid()::text,'',CASE WHEN credit=pr.price::bigint*100 THEN 'ok' ELSE 'awaiting_slip' END,cfg,credit,pr.price::bigint*100-credit+fee,fee) RETURNING * INTO pay;
 PERFORM private.change_credit(uid,pay.id,'reserve',-credit);
 IF pay.status='ok' THEN
  PERFORM private.grant_product(uid,p_product,'credit');
  UPDATE public.payments SET verification_code='PAID_WITH_CREDIT',reviewed_at=now(),review_note='ชำระด้วยเครดิตคงเหลือ' WHERE id=pay.id RETURNING * INTO pay;
 END IF;
 RETURN to_jsonb(pay);
END $function$
;

CREATE OR REPLACE FUNCTION public.create_referred_payment_order(p_product text, p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); pr public.products%rowtype; pay public.payments%rowtype; cfg jsonb; credit bigint; fee integer:=0; due bigint; target_email text:=lower(btrim(p_email));
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 IF target_email IS NULL OR length(target_email)>254 OR target_email !~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'กรอกอีเมลผู้แนะนำให้ถูกต้อง'; END IF;
 IF target_email=(SELECT lower(email) FROM auth.users WHERE id=uid) THEN RAISE EXCEPTION 'ใช้อีเมลตัวเองเป็นผู้แนะนำไม่ได้'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO pr FROM public.products WHERE id=p_product AND active AND id IN ('guide_bandit','guide_assassin','guide_mage','guide_spearman','guide_page','guide_fighter');
 IF pr.id IS NULL THEN RAISE EXCEPTION 'สินค้านี้ยังไม่เปิดขาย'; END IF;
 IF private.has_product(uid,p_product) THEN RAISE EXCEPTION 'คุณมีสิทธิ์นี้แล้ว'; END IF;
 SELECT * INTO pay FROM public.payments WHERE user_id=uid AND product=p_product AND gift_email IS NULL AND status IN ('awaiting_slip','pending');
 IF pay.id IS NOT NULL THEN
 IF pay.referral_email IS DISTINCT FROM target_email THEN RAISE EXCEPTION 'มีรายการรอชำระอยู่แล้ว ยกเลิกรายการเดิมก่อนเปลี่ยนผู้แนะนำ'; END IF;
 RETURN to_jsonb(pay); END IF;
 cfg:=public.payment_settings();
 IF NOT coalesce((cfg->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'ยังไม่เปิดรับชำระเงิน'; END IF;
 IF (SELECT count(*) FROM public.payments WHERE user_id=uid AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'สร้างรายการบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้'; END IF;
 credit:=least(coalesce((SELECT balance_cents FROM private.credit_accounts WHERE user_id=uid),0),pr.price::bigint*100);
 -- Full credit purchases have no bank transfer or processing fee. For partial
 -- purchases retain fractional credit so every QR ends in .11 through .49.
 IF credit<pr.price::bigint*100 THEN
  credit:=(credit/100)*100;
  due:=pr.price::bigint*100-credit;
  PERFORM pg_advisory_xact_lock(hashtextextended('payment-amount-allocation',0));
  SELECT s INTO fee FROM generate_series(11,49) s
  WHERE NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.amount_due_cents=due+s
    AND (p.status IN ('awaiting_slip','pending') OR p.created_at>now()-interval '24 hours'))
  ORDER BY random() LIMIT 1;
  IF fee IS NULL THEN RAISE EXCEPTION 'ยอดชำระช่วงนี้ถูกจองครบแล้ว กรุณาลองใหม่ภายหลัง'; END IF;
 END IF;
 INSERT INTO public.payments(user_id,email,product,amount,trans_ref,slip_path,status,recipient,credit_applied_cents,amount_due_cents,processing_fee_cents,referral_email) VALUES(uid,(SELECT email FROM auth.users WHERE id=uid),p_product,pr.price,'ORDER-'||gen_random_uuid()::text,'',CASE WHEN credit=pr.price::bigint*100 THEN 'ok' ELSE 'awaiting_slip' END,cfg,credit,pr.price::bigint*100-credit+fee,fee,target_email) RETURNING * INTO pay;
 PERFORM private.change_credit(uid,pay.id,'reserve',-credit);
 IF pay.status='ok' THEN
  PERFORM private.grant_product(uid,p_product,'credit');
  UPDATE public.payments SET verification_code='PAID_WITH_CREDIT',reviewed_at=now(),review_note='ชำระด้วยเครดิตคงเหลือ' WHERE id=pay.id RETURNING * INTO pay;
 END IF;
 RETURN to_jsonb(pay);
END $function$
;

CREATE OR REPLACE FUNCTION public.credit_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 RETURN jsonb_build_object('available_cents',coalesce((SELECT balance_cents FROM private.credit_accounts WHERE user_id=uid),0),'reserved_cents',coalesce((SELECT sum(credit_applied_cents) FROM public.payments WHERE user_id=uid AND status IN ('awaiting_slip','pending')),0));
END $function$
;

CREATE OR REPLACE FUNCTION public.get_guide(p_guide text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); h text;
begin
  if uid is null then raise exception 'ต้องล็อกอินก่อน'; end if;
  if not (private.has_product(uid, 'guide_' || p_guide) or private.is_admin(uid)) then raise exception 'ยังไม่ได้ซื้อไกด์นี้'; end if;
  select html into h from public.guide_files where guide = p_guide;
  return h;
end $function$
;

CREATE OR REPLACE FUNCTION public.get_navigation(p_guide text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ SELECT private.read_navigation(p_guide) $function$
;

CREATE OR REPLACE FUNCTION public.listing_contact(p_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT private.marketplace_contact(p_id) $function$
;

CREATE OR REPLACE FUNCTION public.marketplace_close(p_id bigint)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT private.marketplace_close(p_id) $function$
;

CREATE OR REPLACE FUNCTION public.marketplace_contact_quota()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ SELECT private.marketplace_contact_quota() $function$
;

CREATE OR REPLACE FUNCTION public.marketplace_price_reference(p_item_id bigint, p_stats jsonb DEFAULT '{}'::jsonb, p_slots integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
WITH candidates AS (
 SELECT l.user_id,l.price FROM public.listings l JOIN public.items i ON i.id=l.item_id
 WHERE l.item_id=p_item_id AND l.kind='sell' AND l.status='open' AND l.price_unit='meso' AND l.price_reference_eligible
 AND l.expires_at>now() AND l.user_id IS DISTINCT FROM (SELECT auth.uid())
 AND (i.type<>'Equip' OR ((coalesce(p_stats,'{}'::jsonb)='{}'::jsonb OR l.item_stats=p_stats) AND (p_slots IS NULL OR l.slots=p_slots)))
 ORDER BY l.created_at DESC,l.id DESC LIMIT 500
), sellers AS (
 SELECT percentile_cont(0.5) WITHIN GROUP(ORDER BY price) AS price FROM candidates GROUP BY user_id
), summary AS (
 SELECT count(*) AS sellers,percentile_cont(0.25) WITHIN GROUP(ORDER BY price) AS low,percentile_cont(0.75) WITHIN GROUP(ORDER BY price) AS high,percentile_cont(0.5) WITHIN GROUP(ORDER BY price) AS median FROM sellers
)
SELECT jsonb_build_object('seller_count',sellers,'low',CASE WHEN sellers>=3 THEN floor(low)::bigint END,'high',CASE WHEN sellers>=3 THEN ceil(high)::bigint END,'median',CASE WHEN sellers>=3 THEN round(median)::bigint END,'source','maplethai_asking_prices','checked_at',now()) FROM summary
$function$
;

CREATE OR REPLACE FUNCTION public.marketplace_save(p_id bigint, p_data jsonb)
 RETURNS bigint
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT private.marketplace_save(p_id,p_data) $function$
;

CREATE OR REPLACE FUNCTION public.my_guide_progress()
 RETURNS SETOF public.guide_progress
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 SELECT * FROM public.guide_progress WHERE user_id=(SELECT auth.uid()) ORDER BY updated_at DESC
$function$
;

CREATE OR REPLACE FUNCTION public.payment_settings()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT jsonb_build_object('enabled',enabled,'bank',bank,'account_number',account_number,'recipient_name',recipient_name,'qr_path',qr_path,'qr_payload',qr_payload) FROM private.payment_settings WHERE id
$function$
;

CREATE OR REPLACE FUNCTION public.redeem_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); c record;
begin
  if uid is null then raise exception 'ต้องล็อกอินก่อน'; end if;
  select * into c from private.codes where code = upper(btrim(p_code)) for update;
  if c.code is null then raise exception 'ไม่พบโค้ดนี้'; end if;
  if c.used_by is not null then raise exception 'โค้ดนี้ถูกใช้แล้ว'; end if;
  update private.codes set used_by = uid, used_at = now() where code = c.code;
  perform private.grant_product(uid, c.product, 'code');
  return public.sync_account();
end $function$
;

CREATE OR REPLACE FUNCTION public.save_guide_progress(p_guide text, p_state jsonb, p_label text, p_completed integer, p_total integer, p_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); result public.guide_progress%rowtype;
BEGIN
 IF uid IS NULL OR NOT coalesce(private.has_product(uid,'guide_'||p_guide) OR private.is_admin(uid),false) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์บันทึกไกด์นี้'; END IF;
 IF p_guide NOT IN ('bandit','assassin','mage','spearman','page','fighter') OR p_state IS NULL OR jsonb_typeof(p_state)<>'object' OR octet_length(p_state::text)>65536 OR p_total IS NULL OR p_total NOT BETWEEN 1 AND 2000 OR p_completed IS NULL OR p_completed NOT BETWEEN 0 AND p_total OR p_version IS NULL OR p_version<0 OR p_label IS NULL OR length(p_label)>160 THEN RAISE EXCEPTION 'ข้อมูลความคืบหน้าไม่ถูกต้อง'; END IF;
 IF jsonb_typeof(p_state->'i') IS DISTINCT FROM 'number' OR (p_state->>'i')!~'^[0-9]+$' OR (p_state->>'i')::numeric>=p_total OR jsonb_typeof(p_state->'done') IS DISTINCT FROM 'object' OR coalesce(p_state->>'tab','') NOT IN ('route','intro','opt','money','builds') THEN RAISE EXCEPTION 'รูปแบบจุดอ่านไม่ถูกต้อง'; END IF;
 IF p_version=0 THEN
  INSERT INTO public.guide_progress(user_id,guide,state,step_label,completed,total) VALUES(uid,p_guide,p_state,p_label,p_completed,p_total) ON CONFLICT DO NOTHING RETURNING * INTO result;
 ELSE
  UPDATE public.guide_progress SET state=p_state,step_label=p_label,completed=p_completed,total=p_total,version=version+1,updated_at=now() WHERE user_id=uid AND guide=p_guide AND version=p_version RETURNING * INTO result;
 END IF;
 IF result.user_id IS NULL THEN RETURN jsonb_build_object('conflict',true); END IF;
 RETURN jsonb_build_object('version',result.version,'updated_at',result.updated_at);
END $function$
;

CREATE OR REPLACE FUNCTION public.submit_payment_slip(p_payment bigint, p_path text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE pay public.payments%rowtype; uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 SELECT * INTO pay FROM public.payments WHERE id=p_payment AND user_id=uid FOR UPDATE;
 IF pay.id IS NULL OR pay.status<>'awaiting_slip' THEN RAISE EXCEPTION 'รายการนี้ไม่สามารถส่งสลิปได้'; END IF;
 IF p_path IS NULL OR p_path NOT LIKE uid::text||'/'||p_payment::text||'/%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='slips' AND name=p_path) THEN RAISE EXCEPTION 'ไม่พบไฟล์สลิปของรายการนี้'; END IF;
 UPDATE public.payments SET slip_path=p_path,status='pending' WHERE id=p_payment;
END $function$
;

CREATE OR REPLACE FUNCTION public.svc_begin_payment_verification(p_payment bigint, p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE p public.payments%rowtype; token uuid; k text;
BEGIN
 SELECT * INTO p FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF p.id IS NULL OR p_user IS NULL OR NOT coalesce(p.user_id=p_user OR private.is_admin(p_user),false) THEN RAISE EXCEPTION 'ไม่พบรายการของบัญชีนี้'; END IF;
 IF p.status='ok' THEN RETURN jsonb_build_object('status','ok'); END IF;
 IF p.status<>'pending' THEN RETURN jsonb_build_object('status',p.status,'code','NOT_PENDING'); END IF;
 IF NOT public.auto_verification_status() THEN RETURN jsonb_build_object('status','pending','code','MANUAL_REVIEW'); END IF;
 IF p.verification_started_at>now()-interval '90 seconds' AND p.verification_lease IS NOT NULL THEN RETURN jsonb_build_object('status','pending','code','IN_PROGRESS'); END IF;
 IF p.verification_attempts>=3 AND NOT private.is_admin(p_user) THEN RETURN jsonb_build_object('status','pending','code','ATTEMPT_LIMIT'); END IF;
 SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name='maplethai_easyslip_api_key';
 IF k IS NULL THEN RETURN jsonb_build_object('status','pending','code','MANUAL_REVIEW'); END IF;
 token:=gen_random_uuid();
 UPDATE public.payments SET verification_attempts=verification_attempts+1,verification_lease=token,verification_started_at=now(),verification_code='VERIFYING' WHERE id=p_payment;
 RETURN jsonb_build_object('status','pending','lease',token,'api_key',k,'payment',jsonb_build_object('id',p.id,'amount',p.amount,'amount_due_cents',p.amount_due_cents,'recipient',p.recipient,'created_at',p.created_at,'slip_path',p.slip_path));
END $function$
;

CREATE OR REPLACE FUNCTION public.svc_finish_payment_verification(p_payment bigint, p_lease uuid, p_result jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE p public.payments%rowtype; code text; ref text; valid boolean; result jsonb;
BEGIN
 SELECT * INTO p FROM public.payments WHERE id=p_payment;
 IF p.id IS NULL OR p.user_id IS NULL THEN RAISE EXCEPTION 'ไม่พบรายการ'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p.user_id::text,0));
 SELECT * INTO p FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF p.status<>'pending' OR p.verification_lease IS DISTINCT FROM p_lease OR p_lease IS NULL THEN RETURN jsonb_build_object('status',p.status,'code','ALREADY_HANDLED'); END IF;
 ref:=p_result->>'trans_ref';code:=left(coalesce(p_result->>'code','MANUAL_REVIEW'),60);
 valid:=coalesce((p_result->>'verified')::boolean,false) AND (p_result->>'amount_cents')::numeric BETWEEN 1 AND 100000000 AND (p_result->>'amount_cents')::numeric=trunc((p_result->>'amount_cents')::numeric) AND ((p_result->>'bank_code'='004' AND regexp_replace(p_result->>'recipient_account','[^0-9]','','g')=regexp_replace(p.recipient->>'account_number','[^0-9]','','g')) OR (p_result->>'bank_code'='PROMPTPAY' AND p_result->>'recipient_type'='EWALLETID' AND p_result->>'recipient_account'=private.promptpay_receiver(p.recipient->>'qr_payload'))) AND p_result->>'currency'='THB' AND (p_result->>'transferred_at')::timestamptz>=p.created_at-interval '5 minutes' AND (p_result->>'transferred_at')::timestamptz<=now()+interval '5 minutes' AND length(ref) BETWEEN 6 AND 200;
 IF coalesce(valid,false) THEN
  result:=private.settle_transfer(p_payment,(p_result->>'amount_cents')::bigint,ref,'provider','');
  IF result->>'status' IN ('ok','credited','rejected') THEN RETURN result; END IF;
  code:=result->>'code';
 ELSE IF code='VERIFIED' THEN code:='VALIDATION_FAILED'; END IF; END IF;
 UPDATE public.payments SET verification_lease=NULL,verification_code=code WHERE id=p_payment;
 RETURN jsonb_build_object('status','pending','code',code);
END $function$
;

CREATE OR REPLACE FUNCTION public.svc_put_guide(p_key text, p_guide text, p_html text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_key is distinct from (select v from private.secrets where k = 'upload_key') then raise exception 'denied'; end if;
  insert into public.guide_files(guide, html, updated_at) values (p_guide, p_html, now()) on conflict (guide) do update set html = excluded.html, updated_at = now();
end $function$
;

CREATE OR REPLACE FUNCTION public.svc_put_items(p_key text, p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n int;
begin
  if p_key is distinct from (select v from private.secrets where k = 'upload_key') then raise exception 'denied'; end if;
  insert into public.items(id, name, type, subtype, lv)
    select (x->>'id')::int, x->>'name', x->>'type', x->>'subtype', nullif(x->>'lv','')::int from jsonb_array_elements(p_items) x
  on conflict (id) do update set name = excluded.name, type = excluded.type, subtype = excluded.subtype, lv = excluded.lv;
  get diagnostics n = row_count; return n;
end $function$
;

CREATE OR REPLACE FUNCTION public.svc_put_prices(p_key text, p_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_key is distinct from (select v from private.secrets where k = 'upload_key') then raise exception 'denied'; end if;
  insert into public.market_prices(id, data, fetched_at) values (1, p_data, (p_data->>'fetchedAt')::timestamptz)
  on conflict (id) do update set data = excluded.data, fetched_at = excluded.fetched_at;
end $function$
;

CREATE OR REPLACE FUNCTION public.sync_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); em text; confirmed timestamptz; r record;
begin
  if uid is null then raise exception 'ต้องล็อกอินก่อน'; end if;
  insert into public.profiles(id) values (uid) on conflict do nothing;
  select lower(u.email), u.email_confirmed_at into em, confirmed from auth.users u where u.id = uid;
  if confirmed is not null then
    perform private.claim_gifts(uid);
    perform private.claim_market_rewards(uid);
    for r in select g.product from private.grandfather g where g.email = em loop
      if not exists(select 1 from public.entitlements e where e.user_id = uid and e.product = r.product) then
        perform private.grant_product(uid, r.product, 'grandfather');
      end if;
    end loop;
  end if;
  return jsonb_build_object(
    'is_admin', private.is_admin(uid),
    'entitlements', coalesce((select jsonb_agg(jsonb_build_object('product', e.product, 'expires_at', e.expires_at, 'source', e.source)) from public.entitlements e where e.user_id = uid), '[]'::jsonb));
end $function$
;

-- Triggers
CREATE TRIGGER payment_due_defaults BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION private.payment_due_defaults();
CREATE TRIGGER payment_market_promotion AFTER INSERT OR UPDATE OF status, referral_email ON public.payments FOR EACH ROW EXECUTE FUNCTION private.payment_market_promotion();

-- Row level security
alter table private.credit_accounts enable row level security;
alter table private.market_contact_rewards enable row level security;
alter table private.market_contact_unlocks enable row level security;
alter table private.marketplace_contacts enable row level security;
alter table private.navigation_content enable row level security;
alter table private.payment_gifts enable row level security;
alter table private.payment_settings enable row level security;
alter table private.transfer_receipts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.entitlements enable row level security;
alter table public.guide_files enable row level security;
alter table public.guide_progress enable row level security;
alter table public.items enable row level security;
alter table public.listings enable row level security;
alter table public.market_prices enable row level security;
alter table public.payments enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
create policy own_credit_ledger on public.credit_ledger as permissive for select to authenticated using ((( SELECT auth.uid() AS uid) = user_id));
create policy ent_own on public.entitlements as permissive for select to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy own_progress on public.guide_progress as permissive for select to authenticated using ((( SELECT auth.uid() AS uid) = user_id));
create policy items_read on public.items as permissive for select to anon, authenticated using (true);
create policy listings_meso_read on public.listings as restrictive for select to anon, authenticated using ((price_unit = 'meso'::text));
create policy listings_owner_read on public.listings as permissive for select to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR private.is_admin(( SELECT auth.uid() AS uid))));
create policy listings_read on public.listings as permissive for select to anon, authenticated using (((status = 'open'::text) AND (expires_at > now())));
create policy prices_read on public.market_prices as permissive for select to anon, authenticated using (true);
create policy pay_own on public.payments as permissive for select to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy products_read on public.products as permissive for select to anon, authenticated using (true);
create policy profiles_own_insert on public.profiles as permissive for insert to authenticated with check ((id = ( SELECT auth.uid() AS uid)));
create policy profiles_own_select on public.profiles as permissive for select to authenticated using ((id = ( SELECT auth.uid() AS uid)));
create policy profiles_own_update on public.profiles as permissive for update to authenticated using ((id = ( SELECT auth.uid() AS uid))) with check ((id = ( SELECT auth.uid() AS uid)));
create policy slips_insert_own on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'slips'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy slips_read on storage.objects as permissive for select to authenticated using (((bucket_id = 'slips'::text) AND (((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) OR private.is_admin(( SELECT auth.uid() AS uid)))));

-- Table grants (explicit; Supabase defaults revoked first)
revoke all on private.admins from public, anon, authenticated, service_role;
revoke all on private.codes from public, anon, authenticated, service_role;
revoke all on private.credit_accounts from public, anon, authenticated, service_role;
revoke all on private.grandfather from public, anon, authenticated, service_role;
revoke all on private.market_contact_rewards from public, anon, authenticated, service_role;
revoke all on private.market_contact_rewards_id_seq from public, anon, authenticated, service_role;
revoke all on private.market_contact_unlocks from public, anon, authenticated, service_role;
revoke all on private.marketplace_contacts from public, anon, authenticated, service_role;
revoke all on private.navigation_content from public, anon, authenticated, service_role;
revoke all on private.payment_gifts from public, anon, authenticated, service_role;
revoke all on private.payment_settings from public, anon, authenticated, service_role;
revoke all on private.secrets from public, anon, authenticated, service_role;
revoke all on private.transfer_receipts from public, anon, authenticated, service_role;
revoke all on public.credit_ledger from public, anon, authenticated, service_role;
grant SELECT on public.credit_ledger to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.credit_ledger to service_role;
revoke all on public.credit_ledger_id_seq from public, anon, authenticated, service_role;
grant SELECT, UPDATE, USAGE on public.credit_ledger_id_seq to anon;
grant SELECT, UPDATE, USAGE on public.credit_ledger_id_seq to authenticated;
grant SELECT, UPDATE, USAGE on public.credit_ledger_id_seq to service_role;
revoke all on public.entitlements from public, anon, authenticated, service_role;
grant SELECT on public.entitlements to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.entitlements to service_role;
revoke all on public.guide_files from public, anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.guide_files to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.guide_files to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.guide_files to service_role;
revoke all on public.guide_progress from public, anon, authenticated, service_role;
grant SELECT on public.guide_progress to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.guide_progress to service_role;
revoke all on public.items from public, anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.items to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.items to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.items to service_role;
revoke all on public.listings from public, anon, authenticated, service_role;
grant SELECT on public.listings to anon;
grant SELECT on public.listings to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.listings to service_role;
revoke all on public.listings_id_seq from public, anon, authenticated, service_role;
grant SELECT, UPDATE, USAGE on public.listings_id_seq to anon;
grant SELECT, UPDATE, USAGE on public.listings_id_seq to authenticated;
grant SELECT, UPDATE, USAGE on public.listings_id_seq to service_role;
revoke all on public.market_prices from public, anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.market_prices to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.market_prices to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.market_prices to service_role;
revoke all on public.payments from public, anon, authenticated, service_role;
grant SELECT on public.payments to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.payments to service_role;
revoke all on public.payments_id_seq from public, anon, authenticated, service_role;
grant SELECT, UPDATE, USAGE on public.payments_id_seq to anon;
grant SELECT, UPDATE, USAGE on public.payments_id_seq to authenticated;
grant SELECT, UPDATE, USAGE on public.payments_id_seq to service_role;
revoke all on public.products from public, anon, authenticated, service_role;
grant MAINTAIN, SELECT on public.products to anon;
grant MAINTAIN, SELECT on public.products to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.products to service_role;
revoke all on public.profiles from public, anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.profiles to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.profiles to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.profiles to service_role;

-- Function grants
revoke all on function private.change_credit(uid uuid, p_payment bigint, p_kind text, p_delta bigint) from public, anon, authenticated, service_role;
revoke all on function private.claim_gifts(uid uuid) from public, anon, authenticated, service_role;
revoke all on function private.claim_market_rewards(uid uuid) from public, anon, authenticated, service_role;
revoke all on function private.deliver_payment(p_payment bigint) from public, anon, authenticated, service_role;
revoke all on function private.grant_product(uid uuid, p text, src text) from public, anon, authenticated, service_role;
revoke all on function private.has_any_guide(uid uuid) from public, anon, authenticated, service_role;
grant execute on function private.has_any_guide(uid uuid) to authenticated;
revoke all on function private.has_product(uid uuid, p text) from public, anon, authenticated, service_role;
grant execute on function private.has_product(uid uuid, p text) to authenticated;
revoke all on function private.is_admin(uid uuid) from public, anon, authenticated, service_role;
grant execute on function private.is_admin(uid uuid) to authenticated;
revoke all on function private.market_item_category(t text, sub text) from public, anon, authenticated, service_role;
revoke all on function private.market_item_fields(t text, sub text) from public, anon, authenticated, service_role;
revoke all on function private.marketplace_close(p_id bigint) from public, anon, authenticated, service_role;
grant execute on function private.marketplace_close(p_id bigint) to authenticated;
revoke all on function private.marketplace_contact(p_id bigint) from public, anon, authenticated, service_role;
grant execute on function private.marketplace_contact(p_id bigint) to authenticated;
revoke all on function private.marketplace_contact_quota() from public, anon, authenticated, service_role;
grant execute on function private.marketplace_contact_quota() to authenticated;
revoke all on function private.marketplace_save(p_id bigint, p_data jsonb) from public, anon, authenticated, service_role;
grant execute on function private.marketplace_save(p_id bigint, p_data jsonb) to authenticated;
revoke all on function private.marketplace_save_legacy(p_id bigint, p_data jsonb) from public, anon, authenticated, service_role;
revoke all on function private.payment_due_defaults() from public, anon, authenticated, service_role;
revoke all on function private.payment_market_promotion() from public, anon, authenticated, service_role;
revoke all on function private.promptpay_receiver(p_payload text) from public, anon, authenticated, service_role;
revoke all on function private.read_navigation(p_guide text) from public, anon, authenticated, service_role;
grant execute on function private.read_navigation(p_guide text) to authenticated;
revoke all on function private.settle_transfer(p_payment bigint, p_cents bigint, p_ref text, p_method text, p_note text) from public, anon, authenticated, service_role;
revoke all on function public.admin_add_grandfather(p_emails text[], p_product text) from public, anon, authenticated, service_role;
grant execute on function public.admin_add_grandfather(p_emails text[], p_product text) to authenticated;
grant execute on function public.admin_add_grandfather(p_emails text[], p_product text) to service_role;
revoke all on function public.admin_grant(p_email text, p_product text) from public, anon, authenticated, service_role;
grant execute on function public.admin_grant(p_email text, p_product text) to authenticated;
grant execute on function public.admin_grant(p_email text, p_product text) to service_role;
revoke all on function public.admin_make_codes(p_product text, p_n integer) from public, anon, authenticated, service_role;
grant execute on function public.admin_make_codes(p_product text, p_n integer) to authenticated;
grant execute on function public.admin_make_codes(p_product text, p_n integer) to service_role;
revoke all on function public.admin_payment_orders() from public, anon, authenticated, service_role;
grant execute on function public.admin_payment_orders() to authenticated;
grant execute on function public.admin_payment_orders() to service_role;
revoke all on function public.admin_payment_settings(p_enabled boolean, p_bank text, p_account text, p_name text) from public, anon, authenticated, service_role;
grant execute on function public.admin_payment_settings(p_enabled boolean, p_bank text, p_account text, p_name text) to authenticated;
grant execute on function public.admin_payment_settings(p_enabled boolean, p_bank text, p_account text, p_name text) to service_role;
revoke all on function public.admin_payments(p_limit integer) from public, anon, authenticated, service_role;
grant execute on function public.admin_payments(p_limit integer) to authenticated;
grant execute on function public.admin_payments(p_limit integer) to service_role;
revoke all on function public.admin_record_transfer(p_payment bigint, p_amount numeric, p_bank_ref text, p_note text) from public, anon, authenticated, service_role;
grant execute on function public.admin_record_transfer(p_payment bigint, p_amount numeric, p_bank_ref text, p_note text) to authenticated;
grant execute on function public.admin_record_transfer(p_payment bigint, p_amount numeric, p_bank_ref text, p_note text) to service_role;
revoke all on function public.admin_review_payment(p_payment bigint, p_approve boolean, p_amount integer, p_bank_ref text, p_note text) from public, anon, authenticated, service_role;
grant execute on function public.admin_review_payment(p_payment bigint, p_approve boolean, p_amount integer, p_bank_ref text, p_note text) to authenticated;
grant execute on function public.admin_review_payment(p_payment bigint, p_approve boolean, p_amount integer, p_bank_ref text, p_note text) to service_role;
revoke all on function public.admin_revoke(p_payment bigint) from public, anon, authenticated, service_role;
grant execute on function public.admin_revoke(p_payment bigint) to authenticated;
grant execute on function public.admin_revoke(p_payment bigint) to service_role;
revoke all on function public.admin_save_verification_settings(p_enabled boolean, p_key text) from public, anon, authenticated, service_role;
grant execute on function public.admin_save_verification_settings(p_enabled boolean, p_key text) to authenticated;
grant execute on function public.admin_save_verification_settings(p_enabled boolean, p_key text) to service_role;
revoke all on function public.admin_stats() from public, anon, authenticated, service_role;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_stats() to service_role;
revoke all on function public.admin_verification_settings() from public, anon, authenticated, service_role;
grant execute on function public.admin_verification_settings() to authenticated;
grant execute on function public.admin_verification_settings() to service_role;
revoke all on function public.auto_verification_status() from public, anon, authenticated, service_role;
grant execute on function public.auto_verification_status() to authenticated;
grant execute on function public.auto_verification_status() to service_role;
revoke all on function public.cancel_payment_order(p_payment bigint) from public, anon, authenticated, service_role;
grant execute on function public.cancel_payment_order(p_payment bigint) to authenticated;
grant execute on function public.cancel_payment_order(p_payment bigint) to service_role;
revoke all on function public.claim_payment(p_product text, p_qr text, p_slip_path text) from public, anon, authenticated, service_role;
grant execute on function public.claim_payment(p_product text, p_qr text, p_slip_path text) to service_role;
revoke all on function public.create_gift_payment_order(p_product text, p_email text) from public, anon, authenticated, service_role;
grant execute on function public.create_gift_payment_order(p_product text, p_email text) to authenticated;
grant execute on function public.create_gift_payment_order(p_product text, p_email text) to service_role;
revoke all on function public.create_payment_order(p_product text) from public, anon, authenticated, service_role;
grant execute on function public.create_payment_order(p_product text) to authenticated;
grant execute on function public.create_payment_order(p_product text) to service_role;
revoke all on function public.create_referred_payment_order(p_product text, p_email text) from public, anon, authenticated, service_role;
grant execute on function public.create_referred_payment_order(p_product text, p_email text) to authenticated;
grant execute on function public.create_referred_payment_order(p_product text, p_email text) to service_role;
revoke all on function public.credit_summary() from public, anon, authenticated, service_role;
grant execute on function public.credit_summary() to authenticated;
grant execute on function public.credit_summary() to service_role;
revoke all on function public.get_guide(p_guide text) from public, anon, authenticated, service_role;
grant execute on function public.get_guide(p_guide text) to authenticated;
grant execute on function public.get_guide(p_guide text) to service_role;
revoke all on function public.get_navigation(p_guide text) from public, anon, authenticated, service_role;
grant execute on function public.get_navigation(p_guide text) to authenticated;
grant execute on function public.get_navigation(p_guide text) to service_role;
revoke all on function public.listing_contact(p_id bigint) from public, anon, authenticated, service_role;
grant execute on function public.listing_contact(p_id bigint) to authenticated;
grant execute on function public.listing_contact(p_id bigint) to service_role;
revoke all on function public.marketplace_close(p_id bigint) from public, anon, authenticated, service_role;
grant execute on function public.marketplace_close(p_id bigint) to authenticated;
grant execute on function public.marketplace_close(p_id bigint) to service_role;
revoke all on function public.marketplace_contact_quota() from public, anon, authenticated, service_role;
grant execute on function public.marketplace_contact_quota() to authenticated;
grant execute on function public.marketplace_contact_quota() to service_role;
revoke all on function public.marketplace_price_reference(p_item_id bigint, p_stats jsonb, p_slots integer) from public, anon, authenticated, service_role;
grant execute on function public.marketplace_price_reference(p_item_id bigint, p_stats jsonb, p_slots integer) to anon;
grant execute on function public.marketplace_price_reference(p_item_id bigint, p_stats jsonb, p_slots integer) to authenticated;
grant execute on function public.marketplace_price_reference(p_item_id bigint, p_stats jsonb, p_slots integer) to service_role;
revoke all on function public.marketplace_save(p_id bigint, p_data jsonb) from public, anon, authenticated, service_role;
grant execute on function public.marketplace_save(p_id bigint, p_data jsonb) to authenticated;
grant execute on function public.marketplace_save(p_id bigint, p_data jsonb) to service_role;
revoke all on function public.my_guide_progress() from public, anon, authenticated, service_role;
grant execute on function public.my_guide_progress() to authenticated;
grant execute on function public.my_guide_progress() to service_role;
revoke all on function public.payment_settings() from public, anon, authenticated, service_role;
grant execute on function public.payment_settings() to authenticated;
grant execute on function public.payment_settings() to service_role;
revoke all on function public.redeem_code(p_code text) from public, anon, authenticated, service_role;
grant execute on function public.redeem_code(p_code text) to authenticated;
grant execute on function public.redeem_code(p_code text) to service_role;
revoke all on function public.save_guide_progress(p_guide text, p_state jsonb, p_label text, p_completed integer, p_total integer, p_version integer) from public, anon, authenticated, service_role;
grant execute on function public.save_guide_progress(p_guide text, p_state jsonb, p_label text, p_completed integer, p_total integer, p_version integer) to authenticated;
grant execute on function public.save_guide_progress(p_guide text, p_state jsonb, p_label text, p_completed integer, p_total integer, p_version integer) to service_role;
revoke all on function public.submit_payment_slip(p_payment bigint, p_path text) from public, anon, authenticated, service_role;
grant execute on function public.submit_payment_slip(p_payment bigint, p_path text) to authenticated;
grant execute on function public.submit_payment_slip(p_payment bigint, p_path text) to service_role;
revoke all on function public.svc_begin_payment_verification(p_payment bigint, p_user uuid) from public, anon, authenticated, service_role;
grant execute on function public.svc_begin_payment_verification(p_payment bigint, p_user uuid) to service_role;
revoke all on function public.svc_finish_payment_verification(p_payment bigint, p_lease uuid, p_result jsonb) from public, anon, authenticated, service_role;
grant execute on function public.svc_finish_payment_verification(p_payment bigint, p_lease uuid, p_result jsonb) to service_role;
revoke all on function public.svc_put_guide(p_key text, p_guide text, p_html text) from public, anon, authenticated, service_role;
grant execute on function public.svc_put_guide(p_key text, p_guide text, p_html text) to anon;
grant execute on function public.svc_put_guide(p_key text, p_guide text, p_html text) to authenticated;
grant execute on function public.svc_put_guide(p_key text, p_guide text, p_html text) to service_role;
revoke all on function public.svc_put_items(p_key text, p_items jsonb) from public, anon, authenticated, service_role;
grant execute on function public.svc_put_items(p_key text, p_items jsonb) to anon;
grant execute on function public.svc_put_items(p_key text, p_items jsonb) to authenticated;
grant execute on function public.svc_put_items(p_key text, p_items jsonb) to service_role;
revoke all on function public.svc_put_prices(p_key text, p_data jsonb) from public, anon, authenticated, service_role;
grant execute on function public.svc_put_prices(p_key text, p_data jsonb) to anon;
grant execute on function public.svc_put_prices(p_key text, p_data jsonb) to authenticated;
grant execute on function public.svc_put_prices(p_key text, p_data jsonb) to service_role;
revoke all on function public.sync_account() from public, anon, authenticated, service_role;
grant execute on function public.sync_account() to authenticated;
grant execute on function public.sync_account() to service_role;

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('slips', 'slips', false, 5242880, '{image/png,image/jpeg,image/webp}'::text[]) on conflict (id) do nothing;

-- Vault secrets used by functions (values are NOT stored here; set them in the dashboard): maplethai_easyslip_api_key
