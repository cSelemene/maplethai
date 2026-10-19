# Guide update handoff: grind tab + consistency pass

## STATUS (2026-10-19, later the same day): LIVE ON THE WEBSITE
- Bandit, Assassin and Mage were uploaded to `public.guide_files` on 2026-10-19 via `svc_put_guide` (sizes 3,339,268 / 3,355,023 / 3,305,750 chars).
- The previous website versions (2026-10-11) are backed up in `private.guide_files_backup_20261019` (guide, html, updated_at). Roll back with:
  `update public.guide_files g set html = b.html, updated_at = now() from private.guide_files_backup_20261019 b where b.guide = g.guide;`
- The site copies had owner edits the artifacts never had. `build/site_merge.py` re-applies them on top of the new content: artifact wrapper removed, market prices via `window.__MKT__`, site price note, owner money section `mkt-profit-tips` (`build/site_money_tips.html`), and for Bandit the owner's skill plan block (`build/site_bandit_block.js`: Sindit option, 2nd-job A/B/C, level plan, route SP overrides) plus Reef Claw "not sold by NPC" fixes. Both blocks were verified byte-identical to the site (md5).
- Pipeline: `assemble.py` -> `out/` -> `site_merge.py` -> `site/` -> `inline.py` (images to data URIs, `i/` from each guide's own artifact files) -> upload. `tools/sitetest.mjs` loads each guide in `premium-guide.html` with Supabase stubbed and checks all tabs, images, overflow, progress saving, the site's equipment-guide mount, desktop + mobile. All pass.
- Owner decisions: upload all three (done); Assassin keeps the current AP plan with early DEX shown as an alternative. The site's equipment-guide.js picker stays as is (it already coexisted with Bandit Builds).
- From now on, edit the website copies as the source of truth, not the artifacts. The artifacts lack the owner's Bandit skill plan and money section.

---


สรุปสั้น: งานอัปเดตไกด์ Bandit / Assassin / Mage เสร็จแล้วในรูป artifact แต่ **ยังไม่ได้ขึ้นเว็บ MapleThai** ไฟล์ทั้งหมดที่ต้องใช้ทำต่ออยู่ในโฟลเดอร์นี้ (branch `feature/guide-grind-builds`, ไม่ได้ merge เข้า main)

## What was done

The user asked (in Thai) to:
1. Make the three guides consistent, with Pure Bandit as the reference.
2. Add an optional grind path for players who don't want to run quests: Green Mushroom > Horny + Zombie Mushroom > Fire Boar > crabs/Lorang, as its own tab.
3. Research more detail.

Result, in `out/{bandit,assassin,mage}.html` (+ `out/g/` images):
- Same tab set in all three: เริ่มต้น | Builds | Route หลัก | สายตีมอน | ล่าของ & คราฟต์ | หาเงิน. Reset button removed.
- Assassin and Mage got Bandit's intro structure and the Builds tab (stat phases, weapon table, SP tables, gear brackets). Assassin also shows an alternative early-DEX AP plan.
- New "สายตีมอน" tab: 5 stages (Green Mushroom 13–20, Horny + Zombie 20–30, Fire Boar 30–38, Lorang 38–45, Clang + Lorang 45–50) with kill estimates (adjustable pace), timeline, maps + walking directions + minimaps, per-class tips, and must-do quests. Route steps with kill tasks at Lv13+ link to it.
- Facts fixed to launch values: mob EXP (17 mobs), claw/wand/robe shop availability and prices, Garnier W.ATK 10, Beginner's Wooden Wand, and others. See `claude/guide-builds-notes.md` in the claude.ai project.
- Tests passed (desktop + mobile, no overflow, no console errors) with `tools/test.mjs`.

These were published to the three claude.ai artifacts (Bandit U3PMCm3cNuf9xdsvekJZ4X, Assassin SY6AMxDtwdgDnEHZj8y3iX, Mage EDpqmo9ckK47tn3jTyccWL). **The owner pointed out that the website is now the real target**, so the artifacts are not the deliverable.

## How the website serves paid guides (checked 2026-10-19)

- `premium-guide.html` calls RPC `get_guide` -> `public.guide_files.html` (one self-contained HTML per guide). Last upload 2026-10-11, so the site still has the OLD guides.
- Images in `guide_files` are inlined as `data:image` URIs (~550 per guide). The artifact HTML in `out/` references `i/<n>.*` (each artifact has its own numbering) and `g/<name>` instead. **Before uploading, inline every `i/` and `g/` image as a data URI.** The `i/` files of each guide must come from its own artifact (Artifact tool `read` with `path`), not from the repo's `i/` folder, because the numbering differs per guide.
- Upload with `svc_put_guide(p_key, p_guide, p_html)`; the key is `private.secrets` row `upload_key`.
- The site injects its own scripts into the guide iframe: `guide-reading.css`, `guide-layout.js`, `equipment-guide.js` (its own "what to wear" gear picker, data in `equipment-data.js` / `equipment-plan.js`), `navigation-entry.js`, and progress tracking via postMessage (`guide-progress.js`). Progress state shape: `{ i, done, tab, w15 }`.

## Open decisions for the owner

1. Builds tab vs the site's `equipment-guide.js` gear picker: keep both, or drop one? They overlap.
2. New tab ids `builds` and `grind` must work with saved progress (`tab` field) and with `guide-layout.js` / reader focus mode. Test in `premium-guide.html` with mocked Supabase (`scripts/test-guide-progress.mjs` style) before uploading.
3. Assassin: switch the default AP plan to early DEX, or keep it as an alternative?
4. Free previews (`bandit-artifact-preview-v3.html`, `guide-preview.html`) may also need the new tabs.
5. English toggle (requested earlier) still not started.

## Suggested next steps

1. Decide 1 and 3 above.
2. Write an inliner: take `out/<guide>.html`, replace `i/...` and `g/...` refs with data URIs.
3. Load the result in `premium-guide.html` locally with mocked `get_guide`, check tabs, progress save/restore, reader layout, mobile.
4. Upload via `svc_put_guide` for bandit, assassin, mage.
5. Optionally retire or freeze the artifacts.

## Folder contents

- `out/` final assembled guides + `g/` (25 grind minimaps, Clang sprite). Source of truth for the new content.
- `orig/` artifact HTML as it was before this work, plus extracted JSON/JS dumps.
- `build/` generators:
  - `assemble.py` builds `out/` from `orig/` + the pieces below (CSS unification, tab bar, word rules, fact fixes, MOB/MAP/NAV additions).
  - `mkbuild.py` -> `build_assassin.json`, `build_mage.json` (Builds data). `builds.js` is the shared Builds renderer.
  - `mkgrind.py` -> `grind_data.json`; `grind.js` + `grind.css` render the grind tab. Minimaps in `build/img`.
  - `intro_tx.py` -> `*_intro_new.js` (Assassin/Mage intro rewritten in Bandit's structure).
- `tools/` MeowDB scrapers and test scripts: `itemfetch.py`, `mob.py`, `mapdata.py`, `navgen.py`, `pathfind.py`, `test.mjs` (puppeteer, `--shots` for screenshots), `q.mjs`, `words.mjs`.
- `dl/` cached MeowDB data (`exp.json` EXP table Lv1–50, `itemcache.json`, `equip.json`, others).

## Restoring the workspace

Scripts use absolute paths under `/home/claude`. To rerun them:

```
mkdir -p /home/claude && cd /home/claude
cp -r maplethai/dev/guide-build/build maplethai/dev/guide-build/tools maplethai/dev/guide-build/dl maplethai/dev/guide-build/out .
mkdir -p g && cp -r maplethai/dev/guide-build/orig/. g/
cd tools && npm install            # puppeteer-core
npx @puppeteer/browsers install chrome-headless-shell@stable   # then point test.mjs at it
```

MeowDB needs a browser User-Agent with curl (plain curl gets a Cloudflare block). Item API ignores the category filter: `/msclassic/api/items?limit=500&page=N`.

This folder is dev material only. Don't merge it to `main` as-is (GitHub Pages would publish it).

## 2026-10-19 review pass (uploaded 02:55 UTC)
- New step `build/site_patch.py`, called from `site_merge.py` after the owner edits. Pipeline is now: `mkgrind.py` -> `assemble.py` -> `site_merge.py bandit assassin mage` (includes site_patch) -> `inline.py bandit assassin mage` -> `tools/sitetest.mjs` (+ `tools/check2.mjs` for the new Bandit sections) -> upload.
- Bandit: AP section has 4 collapsible explainers (`#b-lukdex` LUK vs DEX, `#b-str` STR daggers how-to, `#b-dexless` Korean Fan / Dexless with owner's verdict, `#b-budget` owner's cheap weapon path). STR daggers + Korean Fan have `howto` buttons in the item tables. SP order changed to **Dagger Mastery max first (Lv.33–37), Savage Blow 21 at Lv.44** (user request); edits to the owner block are string replacements in `bandit_patch`, the old SB-first order is described as an option. "Why Mastery first" box (`BUILD.text.spWhy`).
- Gear: NPC thief armor added (Pao Lv.20 alt, Dark Sneak set main Lv.25+, Dark Tiberian alt; items generated by `newitems.py` with MeowDB icons). Reef Claw / Cass / Halfmoon / Blue Knucklevest Pants have no NPC shop at launch (Orbis/El Nath not open).
- Facts fixed in all guides: John quests (Deep Forest of Patience) are Lv.65 in Classic -> removed from SQ/OPT/GRIND, Mage step 43 kept as a "skip" note (indices unchanged). Dark Cleave / Dark Arten = craft or buy. Pansy Earrings has no source. Dark Slain/Steel Slain (Weaponcrafting 10) and Cromi (Arc Forge 10) cannot be crafted (crafting stops at Lv.8). Blue Bamboo Hat is not confirmed as a KPQ reward.
- Backup before upload: `private.guide_files_backup_20261019b`. Upload used a temporary hash-gated RPC `public.svc_put_guide_tmp`; the token was destroyed, but the function drop was cancelled -> drop it: `drop function public.svc_put_guide_tmp(text,text,text);`

## Next tasks (queued 2026-10-19 10:04)
1. New Sindit guide (claw/stars first, then dagger Bandit ~Lv.40-45), Bandit-guide standard. Owner framing and open questions: project doc `claude/next-tasks.md`.
2. Finish the Warrior draft (`guide_files`: fighter / page / spearman) to Bandit-guide standard and open it for sale.

## Sindit guide (done 2026-10-19)
- Built by `build/sindit.py` from the site Assassin guide + Bandit daggers/explainers; run after `site_merge.py`, then `inline.py sindit` (uses the Assassin artifact's `i/` images). Uploaded to `guide_files` as `sindit`.
- Bonus for Bandit owners: `private.guide_product('sindit') = 'guide_bandit'` (migration `20261019100000_sindit_guide.sql`, PR #28 merged to main). Progress KEY `sindit-route-v1`.
- Plan: 1st job Lucky Seven 20 / Nimble Body 15 / Keen Eyes 3 / Disorder 3 / Dark Sight 20; hold all 2nd-job SP; switch at Lv.44 (SB 21 / Mastery 20 / Booster 1 / Haste 1), options Lv.36 / Lv.40. AP: Assassin plan to DEX 45 at Lv.44, then all LUK.
- Next: Warrior guide (task 2).

## Sindit SP plan fix (2026-10-20, owner)
- No more holding SP. 2nd job follows the Bandit guide: Lv.30 Haste 1, Lv.31–37 Dagger Mastery 20 (Booster 1 at Lv.32), Lv.38–47 Savage Blow 30, Lv.48–50 Haste 8 / Steal 1 / Recovery 1.
- Switch to dagger any time after Mastery 20 + Savage Blow 11+ (Lv.41); player's choice (when to change weapon / sell claw and stars).
- Applied with `build/sindit_sp_fix.py` (49 string replacements) directly to `guide_files.sindit` via SQL and to `site/sindit.html`. Backup: `private.guide_files_backup_20261020b`.
- `build/sindit.py` still has the old hold-SP texts: on any rebuild, run `sindit_sp_fix.py site/sindit.html site/sindit.html` after it (before inline.py).
