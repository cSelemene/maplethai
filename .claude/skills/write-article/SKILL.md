---
name: write-article
description: Write or update a free MapleThai article (articles/<slug>.html). Use when the owner asks for a new article, a blog post, or changes to an existing one.
---

# Write a free article

Everything needed is here and in `template.html` (same folder). Do not read the existing
articles in full: `articles/rich-drops.html` is ~75 KB of inline item icons. Grep them for a
single component if the template lacks it (see "Other components").

## Steps

1. `git pull origin main`, then work on a branch. Never rewrite the owner's Thai wording in
   existing articles unless asked.
2. Pick a short English kebab-case `slug`.
3. Copy `template.html` to `articles/<slug>.html` and fill it. Links use `../`. Leave `?v=`
   off new references; the auto-fix workflow adds them on push.
4. Covers in `assets/articles/`:
   - `<slug>-cover.webp`, 1600x720 (hero and card, cropped to 16:8, keep the subject low)
   - `<slug>-og.jpg`, 1200x630 (social preview, absolute URL in `og:image`)
   - Extra article images go in `assets/articles/<slug>/` or a shared folder like `mobs/`.
   - If you cannot make the art, ask the owner for it; do not ship without a cover.
5. Add the entry at the **top** of `ARTICLES` in `articles.js` (newest first):
   `slug, title, excerpt, category, date (YYYY-MM-DD), minutes, cover: './assets/articles/<slug>-cover.webp', coverAlt`.
   Existing categories: `เลือกอาชีพ`, `ฟาร์มของ`.
6. Point the static fallback card in `index.html` (`#home-article-rail` `[data-articles]`, one
   long line) at the new article: href, `article-tag`, `h3`.
7. Check locally: `python3 -m http.server 8765 --bind 127.0.0.1`, open
   `/articles/<slug>.html`, `/articles.html` and `/` at desktop and ~375px width. No horizontal
   scroll; charts and tables fit.
8. Commit, push, open a PR. The owner polishes the Thai afterwards.

## Content rules

- Thai style from CLAUDE.md: neutral, professional, "ผู้เล่น", full sentences, no hype words.
  Skill, item, monster and map names stay in English.
- Write to the reader. Never mention "the video" or that the content came from one.
- Back claims with real data: native charts (`.figure` + `.crow`) with a `figure-source`
  line. Screenshots only from the owner's vetted creators, and only as a fallback.
- Never use the CSS class `.bar` (taken by `maple-theme.css`); charts use `.crow`.
- End with the `reader-end` CTA and a `reader-sources` line naming every source.
- Insights may also feed the class quiz (`class-quiz-data.js`) or guides; mention it in the
  PR, do not change them unasked.

## Item prices

Any article that names a price needs all of:

- the `price-warn` box at the top of `reader-body`;
- a live price: `<span class="live" data-price-item="<exact key>">กำลังโหลดราคาล่าสุด…</span>`
  plus `<script type="module" src="../article-prices.js"></script>` before `</body>`;
- the `price-legend` line with `<span data-price-updated>` under the table;
- a link to `../marketplace.html?q=<item name, URL-encoded>`.

Tables and item rows show the live price only (as in `rich-drops`). A price typed into the
text does not update, so tag it with the date: "ราว 2M (ตอนเขียน ต.ค. 2569)".

Exact keys: the item `name` in `assets/market/items.json` (same names as
`public.market_prices` `data.prices`). The same row gives `id` for the MeowDB link
(`https://meowdb.com/msclassic/item-db/<id>`) and `icon` (a `../i/<n>.png` style path or a
data URI; empty means no icon, so leave the `<img>` out). Look items up with:

```
python3 -c "import json,sys;[print(i) for i in json.load(open('assets/market/items.json')) if sys.argv[1].lower() in i['name'].lower()]" "Pan Lid"
```

To check the key exists in the live snapshot, query Supabase (read-only):
`select data->'prices'->'<name>' from public.market_prices where id = 1;`

## Other components (in `articles.css`)

`template.html` covers: header/nav, crumbs, dek, byline, hero, `price-warn`, `lede`, `toc`,
`figure` + `crow` (`hl` highlights, `dim` mutes), `callout`, `pull`, `overview` table,
`drops`/`drop`, `how`, `verdict` (pro/con/who), `reader-end`, `reader-sources`, footer.

For the rest, grep one example instead of reading whole files:

- `meter` / `meter-dots` (1-5 rating rows), `range` / `range-row`: `articles/class-pros-cons.html`
- `class-block` / `class-block-head` / `class-family`, `quickpick`: `articles/class-pros-cons.html`
- `mob-block` / `mob-head` / `mob-num` / `mob-note`: `articles/rich-drops.html`

e.g. `grep -n 'class="meter' articles/class-pros-cons.html | cut -c1-300`.
New visual pieces go in `articles.css`; ask before adding a large new component.
