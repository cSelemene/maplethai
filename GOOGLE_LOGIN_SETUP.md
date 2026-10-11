# MapleThai Google Login — setup and acceptance

## Already implemented in GitHub
- The static `auth.html` offers Google sign-in, Email + Password login, registration, recovery, and account signout.
- `auth.js` calls `supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:'https://cselemene.github.io/maplethai/auth.html'}})`.
- Email signup and reset-password confirmations also return to `auth.html`.
- Existing entitlements stay tied to Supabase's authenticated user ID. OAuth credentials must NEVER appear in GitHub Pages or front-end code.
- A login attempted from `premium-guide.html?guide=bandit` (or assassin/mage) returns to the requested guide after authentication. The return target is restricted to approved same-site pages.

## Required owner setup: Google Cloud

1. Open https://console.cloud.google.com/ and choose the appropriate project.
2. Under Google Auth Platform configure app name, branding, support email, authorized audience and test users (if app is still in Testing).
3. Create an **OAuth client ID** of type **Web application**.
4. Authorized JavaScript origin (if requested): `https://cselemene.github.io`.
5. Authorized redirect URI (not the GitHub Pages URL): **`https://njbxgclpgefugdtypxag.supabase.co/auth/v1/callback`**.
6. Copy the generated Client ID and Client Secret directly into Supabase Dashboard. Do **not** put either Google client secret or Supabase secret/API admin credentials in this repository or share them in chat.

## Required owner setup: Supabase

1. Open https://supabase.com/dashboard/project/njbxgclpgefugdtypxag/auth/providers and open **Google**.
2. Enable Google and enter the OAuth Client ID and Client Secret from Google Cloud. Save changes.
3. Open https://supabase.com/dashboard/project/njbxgclpgefugdtypxag/auth/url-configuration.
4. Keep Site URL as `https://cselemene.github.io/maplethai/` and add the exact redirect allowlist entry **`https://cselemene.github.io/maplethai/auth.html`**.
5. Test email sign-in, sign-up confirmation, password reset, and Google sign-in using a test Google account (listed as a test user in Google Cloud if in Testing).

## What the code tests cover
The GitHub Actions browser check uses mocked Supabase responses. It validates visible controls, Google OAuth initiation and callback URL, sign-up and password recovery API calls, mobile layout, and safe/unsafe post-login redirects. It is **not** a real test of Google's production OAuth credentials, or of server-side Supabase configuration.

## Verify real OAuth and guide entitlements before declaring launch-ready
- Google callback returns to `auth.html` and stays authenticated after a reload.
- Same verified email identity attaches to the existing Supabase account where permitted; check existing guide access, and never assume accounts with different emails merge.
- Free accounts cannot use `get_guide` for unpurchased classes.
- Purchased Bandit, Assassin, Mage rights are preserved and checked server-side.
- Keep payments disabled until independent transaction verification is in place.

Reference: https://supabase.com/docs/guides/auth/social-login/auth-google
