import { supabase as s, readAccount, GUIDES } from './supabase-client.js?v=ffa6b49ed5';
import {
  readProgress,
  attachProgress,
  createProgressSaver,
  pendingProgress
} from './guide-progress.js?v=7390044d8b';
const id = new URLSearchParams(location.search).get('guide');
const $ = x => document.getElementById(x);
let objectURL = null,
  stopped = false,
  saver = null;
const token = crypto.randomUUID();
function status(kind) {
  const messages = {
    saving: 'กำลังบันทึกความคืบหน้า…',
    saved: 'บันทึกแล้ว · เปิดอีกเครื่องเพื่ออ่านต่อได้',
    error: 'ยังบันทึกเข้าบัญชีไม่ได้ · จุดล่าสุดยังอยู่ในเครื่องนี้',
    conflict: 'มีการบันทึกจากอีกหน้าหรืออีกเครื่อง กรุณาโหลดข้อมูลล่าสุดก่อนอ่านต่อ',
    unavailable: 'โหลดความคืบหน้าไม่สำเร็จ · กรุณาโหลดใหม่เพื่อเชื่อมการบันทึก',
    unsupported: 'ไกด์นี้ยังไม่รองรับการบันทึกความคืบหน้า'
  };
  $('progress-status').textContent = messages[kind];
  $('progress-retry').hidden = !['error', 'conflict', 'unavailable'].includes(kind);
  $('progress-retry').textContent = kind === 'error' ? 'ลองบันทึกอีกครั้ง' : 'โหลดข้อมูลล่าสุด';
  $('progress-retry').onclick =
    kind === 'error'
      ? () => saver?.flush()
      : () => {
          if (kind === 'conflict') {
            try {
              localStorage.removeItem('maplethai:pending:' + currentUser + ':' + id);
            } catch {}
          }
          location.reload();
        };
}
let currentUser = null;
s.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || (currentUser && session?.user && session.user.id !== currentUser)) {
    stopped = true;
    saver?.stop();
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = null;
    $('viewer').removeAttribute('src');
    $('viewer').hidden = true;
    $('progress-bar').hidden = true;
    $('status').textContent = 'ออกจากระบบแล้ว กรุณาเข้าสู่ระบบเพื่ออ่านต่อ';
    $('actions').hidden = false;
  }
});
window.addEventListener('message', e => {
  if (
    stopped ||
    e.source !== $('viewer').contentWindow ||
    e.origin !== location.origin ||
    e.data?.token !== token ||
    e.data.type !== 'maplethai-progress'
  )
    return;
  const v = e.data;
  if (
    !v.state ||
    typeof v.state !== 'object' ||
    !Number.isInteger(v.total) ||
    v.total < 1 ||
    v.total > 2000 ||
    !Number.isInteger(v.completed) ||
    v.completed < 0 ||
    v.completed > v.total ||
    typeof v.label !== 'string'
  )
    return;
  saver?.push({ state: v.state, label: v.label.slice(0, 160), completed: v.completed, total: v.total });
});
if (!Object.hasOwn(GUIDES, id)) {
  $('heading').textContent = 'ไม่พบไกด์';
  $('status').textContent = 'กรุณากลับไปเลือกอาชีพที่หน้าแรก';
  $('actions').hidden = false;
} else {
  $('heading').textContent = GUIDES[id] + ' — ไกด์ฉบับเต็ม';
  $('preview').href =
    id === 'bandit' ? './bandit-artifact-preview-v3.html' : './guide-preview.html?guide=' + id;
  $('login').href = './auth.html?next=' + encodeURIComponent('premium-guide.html?guide=' + id);
  try {
    const {
      data: { user },
      error: authError
    } = await s.auth.getUser();
    if (stopped) {
    } else if (authError || !user) {
      $('status').textContent = 'กรุณาเข้าสู่ระบบก่อนอ่านไกด์ Premium';
      $('actions').hidden = false;
    } else {
      currentUser = user.id;
      $('status').textContent = 'กำลังตรวจสอบสิทธิ์และโหลดไกด์…';
      await readAccount();
      const { data, error } = await s.rpc('get_guide', { p_guide: id });
      if (stopped) {
      } else if (error) {
        $('status').textContent =
          'บัญชีนี้ยังไม่มีสิทธิ์อ่านไกด์นี้ หรือไม่สามารถโหลดไกด์ได้ กรุณาตรวจสอบสิทธิ์';
        $('actions').hidden = false;
      } else if (typeof data !== 'string' || !data.trim()) {
        $('status').textContent = 'ไม่พบข้อมูลไกด์ กรุณาติดต่อผู้ดูแล';
        $('actions').hidden = false;
      } else {
        let cloud = null,
          available = true;
        try {
          cloud = (await readProgress()).find(p => p.guide === id) || null;
        } catch {
          available = false;
        }
        if (!stopped) {
          const pending = pendingProgress(user.id, id),
            version = cloud?.version || 0;
          const conflict = available && pending && pending.version !== version;
          const initial = available
            ? pending && !conflict
              ? pending.state
              : cloud?.state || { i: 0, done: {}, tab: 'intro', w15: true }
            : null;
          let doc = data.replace(
            /<head([^>]*)>/i,
            '<head$1><base href="' + new URL('./', location.href).href + '">'
          );
          doc = doc.replace(
            /<body([^>]*)>/i,
            (_match, attrs) =>
              '<body' +
              (attrs.includes('class=')
                ? attrs.replace(/class=(["'])(.*?)\1/i, (_m, q, v) => 'class=' + q + v + ' maple-guide' + q)
                : attrs + ' class="maple-guide"') +
              '>'
          );
          doc = doc.replace(
            '</head>',
            '<link rel="stylesheet" href="' +
              new URL('./guide-reading.css?v=39c08c6b40', location.href).href +
              '"></head>'
          );
          doc = doc.replace(
            '</body>',
            '<script src="' +
              new URL('./guide-layout.js?v=7e2834b1c7', location.href).href +
              '"></script></body>'
          );
          doc = doc.replace(
            '</head>',
            '<link rel="stylesheet" href="' +
              new URL('./equipment-guide.css?v=167b2f7976', location.href).href +
              '"></head>'
          );
          doc = doc.replace(
            '</body>',
            '<script type="module" data-equipment-guide="' +
              id +
              '" src="' +
              new URL('./equipment-guide.js?v=ce072c7451', location.href).href +
              '"></script></body>'
          );
          doc = doc.replace(
            '</body>',
            '<script type="module" data-navigation-guide="' +
              id +
              '" src="' +
              new URL('./navigation-entry.js?v=bf26ae2b68', location.href).href +
              '"></script></body>'
          );
          const attached = attachProgress(doc, { userId: user.id, guide: id, initial, token });
          doc = attached.html;
          $('progress-bar').hidden = false;
          if (attached.supported && available && !conflict)
            saver = createProgressSaver({ userId: user.id, guide: id, version, onStatus: status });
          if (!attached.supported) status('unsupported');
          else if (!available) status('unavailable');
          else if (conflict) status('conflict');
          else $('progress-status').textContent = 'บันทึกจุดอ่านและรายการที่ทำเสร็จอัตโนมัติ';
          objectURL = URL.createObjectURL(new Blob([doc], { type: 'text/html;charset=utf-8' }));
          $('viewer').src = objectURL;
          $('viewer').hidden = false;
          $('status').textContent = 'ตรวจสอบสิทธิ์ผ่านแล้ว';
        }
      }
    }
  } catch {
    if (!stopped) {
      $('status').textContent = 'เกิดปัญหาในการเชื่อมต่อ กรุณาลองอีกครั้ง';
      $('actions').hidden = false;
    }
  }
}
window.addEventListener('online', () => saver?.flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saver?.flush();
});
window.addEventListener('pagehide', () => {
  saver?.flush();
  if (objectURL) URL.revokeObjectURL(objectURL);
});
