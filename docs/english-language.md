# Thai and English

The TH / EN control (the last item of the header menu, or top-right on route pages without one) stores the reader's choice in local storage. It translates rendered text and accessible labels, including later DOM updates, without rewriting form values, links, product identifiers, or amounts. Embedded member guides use the outer page's control.

Public dictionaries are under `locales/`. Protected guide dictionaries belong only in `private.guide_translations` and must never be committed to this repository. `get_guide` performs the existing entitlement check before attaching a dictionary. A dictionary is attached only when its source hash matches the current guide HTML.

When updating a guide, review and refresh its protected dictionary against the new HTML. A changed source hash deliberately disables the old dictionary. Review both the original sentences and the rendered fragments: item links, monster level badges, and EXP/meso chips can divide one sentence into multiple text nodes.

## Release verification (24 October 2026)

- Public pages, articles, and the updated class previews were checked for untranslated visible text.
- All 11 member guides were checked across every main route step and the intro, builds, optional, money, and grinding tabs: no untranslated visible Thai text or JavaScript errors in those checks.
- Reviewed the numeric differences in source translations and corrected derived fragments that omitted counts or introduced unrelated context.
- Browser tests passed for language persistence, Thai restoration, dynamic text, mobile placement, input/link preservation, denied local storage, authenticated iframe dictionaries, login, guide progress, and marketplace behavior.
- Translation-table RLS is enabled; anonymous and authenticated roles cannot read the table or call its private attachment helper directly.

Run `node scripts/stamp-assets.mjs` after changing public dictionaries or the language module, then `node scripts/stamp-assets.mjs --check`. Run `scripts/test-i18n.mjs` and `scripts/test-guide-progress.mjs` with the local site on port 8765. The SQL entitlement, escaping, and source-hash tests are in `scripts/test-guide-translations.sql` and run through the schema CI job.

These checks do not translate player-written marketplace listings, character names, or contacts. Those are intentionally preserved as user content.
