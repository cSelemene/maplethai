# MapleThai

Paid MapleStory Classic World guides, a player marketplace and PromptPay checkout. Plain static site (no build step) on GitHub Pages: https://cselemene.github.io/maplethai/ , with Supabase for login, data and payments.

## Layout

- `index.html` is the homepage (`home.html` only redirects to it). Other pages sit next to it: `auth.html`, `checkout.html`, `premium-guide.html`, `my-guides.html`, `marketplace.html`, `admin.html`, `admin-payments.html`, the `*-preview.html` free previews, and `navigation/`.
- Page scripts are ES modules loaded directly by the browser (`supabase-client.js` is the shared Supabase client).
- `supabase/` holds the database schema, seed, tests and the `verify-payment` Edge Function. See `supabase/README.md`.
- `scripts/` holds the browser and SQL tests that GitHub Actions runs.

## After editing any page, script or stylesheet

```
node scripts/stamp-assets.mjs                 # refresh ?v= cache-busting versions
npx prettier@3 --write "*.js" "navigation/*.mjs" "scripts/*.mjs"
```

`stamp-assets.mjs` gives every local `.js/.css/image` reference a version taken from the file's contents (and what it imports), so browsers never mix old and new files and never load one module twice. Do not edit `?v=` values by hand. The **Code checks** workflow fails if either step was skipped.

Large data files (`free-routes.js`, `warrior-*.js`, `equipment-data.js`, `class-quiz-data.js`) are kept compact and are excluded from formatting (`.prettierignore`).

## Tests

GitHub Actions runs them on every push. Locally, with Chrome and `npm install --no-save puppeteer-core@24`:

```
python3 -m http.server 8765 --bind 127.0.0.1 &
CHROME_BIN=/path/to/chrome node scripts/test-auth-ui.mjs   # and the other scripts/test-*.mjs
PGHOST=... PGUSER=postgres node scripts/test-schema.mjs    # SQL tests, needs Postgres 17
```

Setup notes for payments and Google login: `AUTOMATIC_PAYMENTS_SETUP.md`, `PAYMENT_CREDIT_SETUP.md`, `GOOGLE_LOGIN_SETUP.md`.
