# MapleThai — ทดลองเพิ่มแรงจูงใจซื้อ (reversible experiment)

Status: DEVELOPMENT BRANCH ONLY. User approval: experiment with conversion UI, but undo or modify if disliked.

## Strict rule
**Free or unpaid users must never receive or view any guide route past Lv.10.** This rule overrides any UI experiment. Every profession's paid guide is protected by server-side Supabase `get_guide(p_guide)` entitlement verification. No paid route text should be embedded in `guide-preview.html`, `free-routes.js`, or other public files.

## Current experiment
- Nonintrusive value banner visible on the free route page; button shows the existing unlock dialog.
- Unlock dialog lists what the full guide includes, price THB 99 per profession, one-time purchase.
- No fabricated discount, countdown, scarcity, or claims of completed payment integration.
- Owners of the guide see a link directly to the authenticated full reader instead of upsell.

## Reversion
Remove the `value-banner` and `learn-more` elements/styles, remove popup benefit list, and restore the previous preview file content. These changes are isolated to `guide-preview.html` and were committed separately as `2169a69e06d0f2564a2cebfa71f4146b961f3535`.

## Critical launch blockers
- As long as the existing public `main/index.html` contains the original *complete* Bandit guide, users can still read beyond Lv.10 by accessing that URL. The new preview gate does NOT protect that existing public page. Move/delete any full paid guide from all public assets and deployment history as appropriate before claiming strict protection.
- Validate that the data in `free-routes.js` contains no routes that pass Lv.10, and confirm all paid content is loaded only via `get_guide` RPC after entitlement checks.
- Premium page and auth flows are not yet end-to-end tested on a deployed staging site. Do not merge until tested.
- `claim_payment` is not safe for real purchases until independently verified payment confirmation is implemented; keep payment disabled.
