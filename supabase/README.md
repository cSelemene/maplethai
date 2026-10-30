# Database (Supabase project `njbxgclpgefugdtypxag`)

## Where the schema lives

- `migrations/20261016000000_baseline.sql` is the whole schema as it runs in production on 2026-10-16: tables, constraints, indexes, functions, triggers, RLS policies, grants and the `slips` storage bucket. It was generated from the live database and checked by rebuilding a fresh database from it and comparing the result line by line.
- `seed.sql` holds the reference rows the app needs (products, an empty payment-settings row). No customer data.
- `functions/verify-payment/` is the slip-checking Edge Function.
- `../database/archive/` keeps the old hand-run SQL files (phase2 ... phase10, gift/referral, the two early migrations). They are history only. Do not run them; the baseline already contains their final result.

## Changing the schema from now on

1. Add a new file in `migrations/` named `YYYYMMDDHHMMSS_short_name.sql` with only the change.
2. Apply the same file to the live project (Supabase dashboard SQL editor, `supabase db push`, or Claude via the Supabase connector's apply_migration so it is recorded).
3. Push to GitHub. The **Database schema** workflow builds a new database from all migrations and runs every `scripts/test-*.sql` test.

Never edit the baseline after it has been applied; add a new migration instead.

## Running the SQL tests yourself

Needs a Postgres 17 server and `psql`:

```
PGHOST=localhost PGUSER=postgres PGPASSWORD=... node scripts/test-schema.mjs
```

`tests/supabase-stubs.sql` stands in for the Supabase-only parts (roles, `auth`, `storage`, `vault`), and `tests/fixtures.sql` turns checkout on with the public receiver details so the tests can create orders. Every test runs inside a transaction and rolls back.

## Live migration history

The live project's migration list still shows 12 older entries (`init_schema` ... `register_warrior_guide_access`), and several phases were applied without being recorded. If you start using the Supabase CLI against the live project, align its history once so it treats the baseline as already applied:

```
supabase migration repair --status reverted 20261010153058 20261011044110 20261011105028 20261011105300 20261011113027 20261011121431 20261011121742 20261011121926 20261011152314 20261011152422 20261011154103 20261011175538
supabase migration repair --status applied 20261016000000
```

This only edits the history table; it does not touch tables or data.

## Things the baseline makes visible

- `guide_files`, `items`, `market_prices` and `profiles` carry full table grants for `anon`/`authenticated` (Supabase defaults). They are protected by RLS: `guide_files` has no policy at all (only `get_guide` reads it), and the others only allow reading or owner-only access.
- `private.admins`, `codes`, `grandfather`, `free_domains` and `secrets` have RLS off but no grants to `anon`/`authenticated`, so the API cannot reach them.
- Vault secret `maplethai_easyslip_api_key` must exist for automatic slip checks; its value is set from `admin-payments.html` and is not in this repo.
