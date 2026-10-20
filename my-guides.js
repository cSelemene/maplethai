import { supabase, GUIDES, hasGuide, readAccount } from './supabase-client.js?v=2b187ad0f8';
import { readProgress } from './guide-progress.js?v=606cb326ad';
const PUBLISHED_GUIDES = {
  bandit: true,
  sindit: true,
  assassin: true,
  mage: true,
  fp: true,
  spearman: true,
  fighter: true,
  page: true
};
const $ = id => document.getElementById(id);
let generation = 0;
import { guideCard as card } from './guide-library.js?v=49f9872ff0';
async function refresh() {
  const ticket = ++generation;
  $('library-owned').replaceChildren();
  $('library-discover').replaceChildren();
  $('library-login').hidden = true;
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();
    if (ticket !== generation) return;
    if (error || !user) {
      $('library-status').textContent = 'เข้าสู่ระบบเพื่อดูไกด์ที่ซื้อและจุดที่อ่านค้างไว้';
      $('library-login').hidden = false;
      return;
    }
    const account = await readAccount();
    let progress = [],
      failed = false;
    try {
      progress = await readProgress();
    } catch {
      failed = true;
    }
    if (ticket !== generation) return;
    const byId = Object.fromEntries(progress.map(p => [p.guide, p]));
    let count = 0;
    for (const [id, name] of Object.entries(GUIDES)) {
      const owns = hasGuide(account, id);
      if (!owns && !PUBLISHED_GUIDES[id]) continue;
      if (owns) count++;
      $(owns ? 'library-owned' : 'library-discover').append(card(id, name, owns, byId[id]));
    }
    $('library-status').textContent = failed
      ? 'เปิดไกด์ได้ แต่โหลดความคืบหน้าไม่สำเร็จ กรุณาลองอีกครั้ง'
      : count
        ? `มีไกด์พร้อมอ่าน ${count} อาชีพ · บันทึกความคืบหน้าตามบัญชี`
        : 'ยังไม่มีไกด์ที่ปลดล็อก เลือกทดลองอ่านด้านล่างได้เลย';
  } catch {
    if (ticket === generation) $('library-status').textContent = 'โหลดไกด์ไม่สำเร็จ กรุณาลองอีกครั้ง';
  }
}
$('library-refresh').onclick = refresh;
supabase.auth.onAuthStateChange(() => setTimeout(refresh, 0));
refresh();
