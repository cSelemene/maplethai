# MapleThai: notes for Claude

Paid MapleStory Classic World guides (Thai), a player marketplace and PromptPay checkout. Plain static site on GitHub Pages (`https://cselemene.github.io/maplethai/`), Supabase for login, data and payments. See `README.md` for layout and test commands.

**This repo is public.** Never commit paid guide content, keys, tokens, slips or customer data. Paid guide HTML lives only in Supabase (`public.guide_files`).

## Owner's standing rules

- **Thai wording:** the owner polishes Thai text with ChatGPT. Always `git pull` the latest `main` before editing a page, and never overwrite the owner's wording unless asked. Match the owner's tone (see "Thai writing style" below).
- **Homepage:** every guide that is finished and on sale goes on the homepage right away, no need to ask.
- **Grouping:** guides are grouped by class family everywhere (homepage, checkout menu): Thief (Bandit, Sindit, Assassin), Magician (I/L, F/P, Cleric), Warrior (Fighter, Page, Spearman), Bowman (Hunter, Crossbowman). Thief on top.
- **Keep it lean:** do only what the task needs; ask before optional extras (hardening, refactors, new features).
- **Merging:** work on a branch and open a PR. Merge only after the owner says so in chat for that PR, and only when every check on my own commit is green.
- **Usage:** keep sessions focused; split big jobs into small steps and leave a short handoff note in the PR or here if work stops halfway.

## Thai writing style

- Neutral, informative, professional. No slang or hype (avoid ชิล, ฟิน, สไนป์, เท่มาก, คุ้มทุกนาที, รวยข้ามคืน).
- Address readers as "ผู้เล่น" / "ผู้เล่นที่...".
- Use "ข้อจำกัด" (not "ข้อเสียใหญ่"). Bold lead phrases state facts scoped to the source ("DPS ต่ำที่สุดในตารางเปรียบเทียบ"), not absolute claims.
- Standard terms: มอนกระจายตัว / ไม่หนาแน่น, สกิลโจมตีหมู่, แต้มสกิล, งบอุปกรณ์ / ค่าอุปกรณ์, ทำดาเมจคริติคอล.
- Full sentences with clear connectors (เนื่องจาก, จึง, แม้...แต่, หาก). Keep skill, item, monster and map names in English as in-game.

## Products and pricing

- 11 guides, 99 THB each: `guide_bandit`, `guide_sindit`, `guide_assassin`, `guide_mage` (I/L), `guide_fp`, `guide_cleric`, `guide_fighter`, `guide_page`, `guide_spearman`, `guide_hunter`, `guide_crossbowman`.
- Sindit is sold on its own and is also free for Bandit owners.
- `market`: 50 THB / 30 days.
- `pack_all` (launch promotion only): 259 THB, unlocks every guide in `private.pack_covers()` + permanent market. 99 THB off per guide already owned (market does not count), 3+ guides = free. Guides added later are not in the pack until the owner decides; ask when adding a guide, then update `pack_covers()`, the pack card in `index.html` and `#pack-features` in `checkout.html`.

## Adding a new guide (checklist)

products + guide_files rows (migration); id lists in DB functions and constraints; `supabase-client.js` GUIDES; `my-guides.js` PUBLISHED_GUIDES; `checkout.js` allowed + FAMILIES; `admin.html` option; `guide-progress.js` KEY regex; `class-quiz-data.js`; free preview (`guide-preview.html`); equipment widget (`equipment-plan.js`, `equipment-data.js`); homepage card + art in `assets/classes/<id>.webp`; tests (`test-guide-progress`, `test-class-quiz-browser`, `smoke-immersive`, `test-payments`); the pack decision above.

## Free articles

- Registry `articles.js` (newest first), pages `articles/<slug>.html` (copy an existing one, links use `../`), covers in `assets/articles/` (cover .webp + 1200x630 og .jpg). Point the static fallback card in `index.html` `[data-articles]` at the newest article.
- Write directly to the reader; never mention "the video". Illustrate with real data (native charts with a source line); screenshots from the owner's vetted creators only as a fallback. Article insights may also feed the class quiz and guides.
- Any item price needs the "prices change" warning box, a "ตอนเขียน" reference price, a live price via `article-prices.js` (`[data-price-item="<exact market_prices key>"]`) and a link to `marketplace.html?q=<item>`.
- Don't use the CSS class `.bar` (taken by `maple-theme.css`); charts use `.crow`.

## Code and CI

- No build step; ES modules load straight in the browser.
- `?v=` cache-busting and Prettier run automatically on every push (`.github/workflows/auto-fix.yml`). Never hand-edit `?v=`; if you stamp locally to test, undo it before committing.
- Judge a PR by the pull_request runs on my own commit (bot commits can show "action required"). The push-event browser-auth job is occasionally flaky (Puppeteer launch timeout).
- Database: `supabase/migrations/20261016000000_baseline.sql` is the full schema; each change is a new migration file, also applied to the live project. Check the live migration list for changes that never reached the repo.
- SQL tests: every `scripts/test-*.sql` runs in CI on Postgres 17.
- Hardcoded github.io URLs (only matter if hosting moves): `supabase/functions/verify-payment/index.ts`, `navigation/guide-renderer.mjs`, `GOOGLE_LOGIN_SETUP.md`, plus Supabase Auth redirect settings and Google OAuth origin.
