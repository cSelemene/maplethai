# MapleThai web development

## Current state
- `main/index.html` is the existing fully public Bandit guide. Do not replace it before an access-control migration.
- `home.html` is a new landing page prototype, separate from the production guide.
- `auth.html` and its JS/config are a Supabase auth prototype; not yet end-to-end tested.
- No payment gateway or production purchase flow is enabled.

## Security gates before merging
1. Keep full paid guide HTML out of any public GitHub Pages path. The existing Bandit `main/index.html` is already publicly readable and needs a controlled migration before monetization.
2. Serve premium content only after server-side entitlement checks. Do not rely on CSS or JS-only locks.
3. Audit and fix `claim_payment` (currently awards entitlement without trusted confirmation of payment).
4. Test Supabase registration, redirect, recovery, email delivery, and session behavior.
5. Provide sanitized Level 1–10 preview content for each guide.
6. Keep original images separately within each profession's local asset folder to avoid collision.
7. Do not merge to main until authenticated and unauthenticated flows are tested.

## Marketplace business rules (existing)
Guide-owner: reads/writes listings. Market entitlement: unlocks seller contacts. No real payments until reviewed.
