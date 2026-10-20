import { supabase, GUIDES, hasGuide, readAccount } from './supabase-client.js?v=2b187ad0f8';
import { renderProfile } from './profile-ui.js?v=79ef17697c';
import { readProgress } from './guide-progress.js?v=606cb326ad';
import { guideCard } from './guide-library.js?v=49f9872ff0';
let generation = 0;
async function refresh() {
  const ticket = ++generation;
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (ticket !== generation) return;
    const link = document.querySelector('header a[data-account-link]');
    if (link) {
      link.replaceChildren();
      link.classList.toggle('profile-link', !!user);
      link.setAttribute('aria-label', user ? 'บัญชีของฉัน' : 'เข้าสู่ระบบ');
      if (user) renderProfile(link, user);
      else link.textContent = 'เข้าสู่ระบบ';
    }
    document.getElementById('member-section').hidden = !!user;
    const section = document.getElementById('home-owned-guides'),
      quiz = document.getElementById('class-quiz');
    section.hidden = true;
    quiz.hidden = false;
    section.querySelector('.guide-library').replaceChildren();
    const action = document.querySelector('.hero-actions .secondary');
    action.href = '#class-quiz';
    action.textContent = 'หาอาชีพที่เข้ากับคุณ';
    if (!user) return;
    const account = await readAccount();
    let progress = [];
    try {
      progress = await readProgress();
    } catch {}
    if (ticket !== generation) return;
    const owned = Object.entries(GUIDES).filter(([id]) => hasGuide(account, id));
    if (!owned.length) return;
    const byId = Object.fromEntries(progress.map(p => [p.guide, p]));
    for (const [id, name] of owned)
      section.querySelector('.guide-library').append(guideCard(id, name, true, byId[id]));
    section.hidden = false;
    quiz.hidden = true;
    action.href = '#home-owned-guides';
    action.textContent = 'อ่านไกด์ของคุณต่อ';
  } catch {}
}
supabase.auth.onAuthStateChange(() => setTimeout(refresh, 0));
refresh();
