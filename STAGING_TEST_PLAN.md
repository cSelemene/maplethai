# MapleThai Staging and Acceptance Checklist (NOT deployed yet)

## Current deployment
GitHub Pages production serves `main/index.html`. The `feature/supabase-auth` branch is isolated; its `home.html`, `auth.html`, `guide-preview.html` and `premium-guide.html` are NOT reachable through the normal production URL. Do not change production Pages deployment to this branch until the launch gates below pass.

## Preview this branch locally
1. In GitHub Desktop switch to branch `feature/supabase-auth` and pull.
2. From repository root run `python -m http.server 8000`.
3. Open `http://localhost:8000/home.html`. The guide preview is `http://localhost:8000/guide-preview.html?guide=bandit` (or assassin/mage).
4. OAuth/email-confirmation links require corresponding Supabase redirect allow-list configuration. Do not casually add localhost to production Auth redirect URLs without review.
5. For publicly reachable staging, use a **separate** GitHub Pages site or independent static host on a staging domain and allow-list the exact staging URL in Supabase; keep production Pages untouched.

## Acceptance scenarios (must complete before merge)
- Logged out: free Bandit/Assassin/Mage steps are <= Lv10, Next after Lv10 shows unlock modal.
- Logged in, no entitlement: same boundary, cannot call `get_guide` or get premium HTML.
- Logged in with guide_bandit only: Bandit reader works, Assassin and Mage remain locked.
- Guide_assassin only, guide_mage only: analogous behavior.
- Existing premium owner: can open paid reader through `get_guide`; JS navigation and asset loading should work.
- Malformed guide identifier / direct RPC call: cannot bypass entitlement.
- Password reset and signup email redirects: verified end to end (staging redirect allow-list).
- Accessibility and mobile: Next/Back and modal keyboard handling, image paths, responsive layout.
- Main website source `index.html` and any public deployment must no longer contain or link to full paid guide before paid launch.
- Payment RPC `claim_payment` must not be used for live sales until validated proof of payment exists.
- Verify separate public images/content do not contain routes beyond the boundary; checks on `free-routes.js` alone cannot guarantee all HTML or history is private.

## Known restrictions
- GitHub Actions static test does NOT run a browser, authenticate a real test user, or prove database policies secure.
- Supabase `get_guide` tests require dedicated seeded test identities/entitlements, with no real-money purchase.
- Fully public git history cannot be treated as a secure store of secrets or paid content. Removing from HEAD does not revoke previous public access; plan cleanup for existing exposed Bandit material.
