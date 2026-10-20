import { supabase, readAccount, hasGuide } from './supabase-client.js?v=ffa6b49ed5';
import { rpc, myOrders, showHistory, money, STATUS } from './payment-common.js?v=6ff74e298a';
import { paymentImage } from './payment-qr.js?v=ad42cece6f';
let wallet = { available_cents: 0, reserved_cents: 0 },
  qrKey = '',
  qrGeneration = 0;
const $ = id => document.getElementById(id);
const allowed = [
  'guide_bandit',
  'guide_sindit',
  'guide_assassin',
  'guide_mage',
  'guide_fp',
  'guide_cleric',
  'guide_hunter',
  'guide_crossbowman',
  'guide_spearman',
  'guide_fighter',
  'guide_page',
  'market'
];
// Guides in the product menu are grouped by class family, Thief first.
const FAMILIES = [
  ['Thief · สายโจร', ['guide_bandit', 'guide_sindit', 'guide_assassin']],
  ['Magician · สายเมจ', ['guide_mage', 'guide_fp', 'guide_cleric']],
  ['Warrior · สายนักรบ', ['guide_fighter', 'guide_page', 'guide_spearman']],
  ['Bowman · สายธนู', ['guide_hunter', 'guide_crossbowman']]
];
let products = [],
  settings,
  user,
  account,
  orders = [],
  order,
  autoVerify = false,
  loading = false,
  working = false,
  previewUrl;
let selected = new URLSearchParams(location.search).get('product') || 'guide_bandit';
if (!allowed.includes(selected)) selected = 'guide_bandit';
const initialGift = new URLSearchParams(location.search).get('gift');
if (initialGift) {
  $('gift-toggle').checked = true;
  $('gift-email').value = initialGift;
}
const gifting = () => selected !== 'market' && $('gift-toggle').checked;
const giftEmail = () => $('gift-email').value.trim().toLowerCase();
const referralEmail = () => $('referral-email').value.trim().toLowerCase();
function say(text, error = false) {
  $('checkout-status').textContent = text;
  $('checkout-status').className = 'message' + (error ? ' error' : '');
}
function recipient(cfg) {
  const show = order?.status === 'awaiting_slip';
  $('recipient').hidden = !show;
  const sameReceiver =
    cfg && settings && ['bank', 'account_number', 'recipient_name'].every(k => cfg[k] === settings[k]);
  const qr = cfg?.qr_path || (sameReceiver ? settings.qr_path : '');
  const payload = cfg?.qr_payload || (sameReceiver ? settings.qr_payload : '');
  const valid = typeof qr === 'string' && /^assets\/payments\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp)$/.test(qr);
  if (!show || !valid) {
    qrKey = '';
    qrGeneration++;
    $('payment-qr').hidden = true;
    $('qr-unavailable').hidden = !show;
    return;
  }
  const due = order.amount_due_cents ?? order.amount * 100,
    key = order.id + ':' + due + ':' + qr;
  if (qrKey === key) return;
  qrKey = key;
  const ticket = ++qrGeneration;
  const url = new URL('./' + qr, location.href).href;
  $('payment-qr').hidden = true;
  $('qr-unavailable').hidden = false;
  $('qr-unavailable').textContent = 'กำลังสร้าง QR ตามยอดชำระ…';
  const ready = image => {
    if (ticket !== qrGeneration) return;
    $('receiving-qr').src = image;
    $('download-qr').href = image;
    $('download-qr').download = payload ? 'MapleThai-PromptPay.png' : 'MapleThai-PromptPay.jpeg';
    $('qr-amount-note').textContent = payload
      ? 'สแกนแล้วตรวจยอด ' + money(due / 100) + ' และชื่อผู้รับก่อนยืนยัน'
      : 'สแกนด้วยแอปธนาคาร แล้วกรอกยอด ' + money(due / 100) + ' ก่อนยืนยัน';
    $('payment-qr').hidden = false;
    $('qr-unavailable').hidden = true;
  };
  if (payload)
    paymentImage(payload, due, url)
      .then(ready)
      .catch(() => {
        if (ticket !== qrGeneration) return;
        qrKey = '';
        $('qr-unavailable').textContent = 'สร้าง QR ไม่สำเร็จ กรุณากดตรวจสอบสถานะอีกครั้ง';
      });
  else ready(url);
}
function render() {
  const product = products.find(p => p.id === selected);
  if (!product) return;
  $('product-select').value = selected;
  $('product-name').textContent = product.name;
  $('product-price').textContent = money(product.price);
  const market = selected === 'market';
  const guide = selected.slice(6);
  $('checkout-heading').textContent = market ? 'สมัครสมาชิกตลาด' : 'ปลดล็อกไกด์ฉบับเต็ม';
  $('product-heading').textContent = market ? 'สมาชิกตลาด' : 'ไกด์ที่เลือก';
  $('product-label').textContent = market ? 'แพ็กเกจ' : 'อาชีพ';
  $('product-duration').textContent = market ? 'ใช้งาน 30 วัน' : 'ซื้อครั้งเดียว';
  $('guide-features').hidden = market;
  $('market-features').hidden = !market;
  $('product-note').textContent = market
    ? 'หลังอนุมัติ เปิดดูช่องทางติดต่อในตลาดได้ 30 วัน'
    : 'หลังอนุมัติ เปิดอ่านฉบับเต็มได้ใน “ไกด์ของฉัน”';
  $('free-preview').hidden = market;
  $('owned-message').textContent = market ? 'บัญชีนี้มีสิทธิ์สมาชิกตลาดแล้ว' : 'บัญชีนี้มีสิทธิ์อ่านไกด์แล้ว';
  $('read-guide').textContent = market ? 'เปิดตลาดซื้อขาย' : 'เปิดไกด์ฉบับเต็ม';
  $('payment-read-guide').textContent = market ? 'เปิดตลาดซื้อขาย' : 'อ่านไกด์ฉบับเต็ม';
  $('free-preview').href =
    guide === 'bandit' ? './bandit-artifact-preview-v3.html' : './guide-preview.html?guide=' + guide;
  $('read-guide').href = market ? './marketplace.html' : './premium-guide.html?guide=' + guide;
  $('payment-read-guide').href = market ? './marketplace.html' : './premium-guide.html?guide=' + guide;
  $('checkout-login').href = './auth.html?next=' + encodeURIComponent('checkout.html?product=' + selected);
  $('login-needed').hidden = !!user;
  $('gift-options').hidden = !user || market;
  $('gift-fields').hidden = !gifting();
  $('friend-promotion').hidden = market;
  $('referral-fields').hidden = !user || market || gifting();
  const owns =
    !gifting() &&
    user &&
    (market
      ? Boolean(
          account?.is_admin ||
          account?.entitlements?.some(
            e => e.product === 'market' && (!e.expires_at || new Date(e.expires_at) > new Date())
          )
        )
      : hasGuide(account, guide));
  $('already-owned').hidden = !owns;
  $('payment-read-guide').hidden = !owns;
  $('checkout-flow').hidden = !user || !!owns;
  $('buyer-email').textContent = user
    ? gifting()
      ? 'ผู้รับไกด์: ' + (giftEmail() || 'กรอกอีเมลเพื่อนด้านบน')
      : 'สิทธิ์จะเข้าบัญชี ' + user.email
    : '';
  order = orders.find(
    p =>
      p.product === selected &&
      (p.gift_email || '') === (gifting() ? giftEmail() : '') &&
      ['awaiting_slip', 'pending'].includes(p.status)
  );
  if (order && !gifting()) $('referral-email').value = order.referral_email || '';
  $('referral-email').disabled = working || !!order;
  $('create-order').hidden = !user || !!owns || !!order || !settings?.enabled;
  $('slip-form').hidden = order?.status !== 'awaiting_slip';
  $('pending-message').hidden = order?.status !== 'pending';
  $('retry-verification').hidden = order?.status !== 'pending' || !autoVerify;
  $('availability').textContent = order
    ? 'ยอดโอนเพิ่ม ' + money((order.amount_due_cents ?? order.amount * 100) / 100)
    : settings?.enabled
      ? 'ชำระผ่าน PromptPay แล้วส่งสลิปเพื่อปลดล็อกสิทธิ์'
      : 'ยังไม่เปิดรับชำระเงิน ผู้ดูแลกำลังเตรียม QR รับเงิน';
  $('credit-balance').textContent =
    'เครดิตคงเหลือ ' +
    money(wallet.available_cents / 100) +
    (wallet.reserved_cents ? ' · กันไว้ในรายการที่ยังไม่เสร็จ ' + money(wallet.reserved_cents / 100) : '');
  $('credit-note').textContent = order?.credit_applied_cents
    ? 'ใช้เครดิต ' + money(order.credit_applied_cents / 100) + ' จากราคา ' + money(order.amount)
    : wallet.available_cents
      ? 'ระบบจะใช้เครดิตที่มี และสร้าง QR เฉพาะยอดที่เหลือ'
      : 'หากโอนต่ำกว่ายอดและตรวจเงินเข้าจริงแล้ว เงินจะเก็บเป็นเครดิตสำหรับซื้อครั้งถัดไป';
  $('fee-note').textContent = order?.processing_fee_cents
    ? 'ทศนิยมช่วยตรวจเช็คยอด ' +
      money(order.processing_fee_cents / 100) +
      ' เพื่อให้ตรวจเช็คยอดโอนได้ง่ายขึ้น · รวมก่อนหักเครดิต ' +
      money(order.amount + order.processing_fee_cents / 100)
    : order
      ? ''
      : wallet.available_cents >= product.price * 100
        ? 'ชำระด้วยเครดิตครบราคา ไม่ต้องเพิ่มทศนิยม'
        : 'ระบบเพิ่มทศนิยม 0.11–0.49 บาท เพื่อช่วยตรวจเช็คและแยกแยะยอดโอน ยอดชำระทั้งหมดจะแสดงก่อนโอน';
  if (
    wallet.available_cents % 100 &&
    (!order || order.processing_fee_cents) &&
    wallet.available_cents < product.price * 100
  )
    $('credit-note').textContent += ' · ใช้เครดิตจำนวนเต็มบาท เศษสตางค์เก็บสะสมในบัญชี';
  $('create-order').textContent =
    wallet.available_cents >= product.price * 100
      ? 'ชำระด้วยเครดิตและปลดล็อก'
      : 'ใช้เครดิต / ดู QR เพื่อชำระเงิน';
  $('order-detail').textContent = order ? `${STATUS[order.status]}` : '';
  $('gift-toggle').disabled = working || !!order;
  $('gift-email').disabled = working || !!order;
  $('product-note').textContent = gifting()
    ? 'หลังชำระสำเร็จ เพื่อนจะเห็นไกด์ในบัญชีที่ยืนยันอีเมลนี้'
    : market
      ? 'หลังอนุมัติ เปิดดูช่องทางติดต่อในตลาดได้ 30 วัน'
      : 'หลังอนุมัติ เปิดอ่านฉบับเต็มได้ใน “ไกด์ของฉัน”';
  recipient(order?.recipient);
  showHistory($('order-history'), orders, Object.fromEntries(products.map(p => [p.id, p.name])));
  for (const id of [
    'create-order',
    'submit-slip',
    'cancel-order',
    'product-select',
    'refresh-orders',
    'retry-verification'
  ])
    $(id).disabled = working;
}
async function refresh() {
  if (loading) return;
  loading = true;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,price')
      .in('id', allowed)
      .eq('active', true)
      .order('sort');
    if (error) throw error;
    products = data;
    const {
      data: { user: u },
      error: authError
    } = await supabase.auth.getUser();
    if (authError && authError.name !== 'AuthSessionMissingError') throw authError;
    user = u;
    settings = user ? await rpc('payment_settings') : null;
    autoVerify = user ? await rpc('auto_verification_status') : false;
    account = user ? await readAccount() : null;
    orders = user ? await myOrders() : [];
    try {
      wallet = user ? await rpc('credit_summary') : { available_cents: 0, reserved_cents: 0 };
    } catch {
      wallet = { available_cents: 0, reserved_cents: 0 };
    }
    const option = p => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name;
      return o;
    };
    const groups = FAMILIES.map(([label, ids]) => {
      const list = products.filter(p => ids.includes(p.id));
      if (!list.length) return null;
      const g = document.createElement('optgroup');
      g.label = label;
      g.append(...list.map(option));
      return g;
    }).filter(Boolean);
    const grouped = FAMILIES.flatMap(([, ids]) => ids);
    $('product-select').replaceChildren(
      ...groups,
      ...products.filter(p => !grouped.includes(p.id)).map(option)
    );
    if (!products.some(p => p.id === selected)) selected = products[0]?.id;
    if (!selected) throw Error('ยังไม่มีสินค้าเปิดขาย');
    $('page-status').textContent = '';
    render();
  } catch (e) {
    $('page-status').textContent = 'โหลดรายการไม่สำเร็จ: ' + e.message;
    $('page-status').className = 'message error';
  } finally {
    loading = false;
  }
}
async function action(fn) {
  if (working) return;
  working = true;
  render();
  say('กำลังดำเนินการ…');
  try {
    await fn();
    await refresh();
  } catch (e) {
    say(e.message || 'ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง', true);
  } finally {
    working = false;
    render();
  }
}
$('product-select').onchange = () => {
  selected = $('product-select').value;
  history.replaceState(
    null,
    '',
    '?product=' + selected + (gifting() ? '&gift=' + encodeURIComponent(giftEmail()) : '')
  );
  $('slip-file').value = '';
  $('confirm-transfer').checked = false;
  $('slip-preview').hidden = true;
  say('');
  render();
};
$('create-order').onclick = () => {
  const field = gifting()
    ? $('gift-email')
    : selected !== 'market' && referralEmail()
      ? $('referral-email')
      : null;
  if (field && (!field.value.trim() || !field.checkValidity())) {
    field.reportValidity();
    say('กรอกอีเมลให้ถูกต้องก่อนชำระเงิน', true);
    return;
  }
  action(async () => {
    const referred = !gifting() && selected !== 'market' && !!referralEmail();
    const method = gifting()
      ? 'create_gift_payment_order'
      : referred
        ? 'create_referred_payment_order'
        : 'create_payment_order';
    const args = { p_product: selected };
    if (gifting() || referred) args.p_email = gifting() ? giftEmail() : referralEmail();
    const created = await rpc(method, args);
    if (gifting())
      history.replaceState(null, '', '?product=' + selected + '&gift=' + encodeURIComponent(giftEmail()));
    say(
      created?.status === 'ok'
        ? gifting()
          ? 'ชำระสำเร็จ ส่งไกด์ให้ ' + giftEmail() + ' แล้ว'
          : 'ชำระด้วยเครดิตสำเร็จ ปลดล็อกสิทธิ์แล้ว'
        : 'สแกน QR หรือบันทึกภาพเพื่อเปิดในแอปธนาคาร'
    );
  });
};
$('slip-file').onchange = () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  const file = $('slip-file').files[0];
  $('slip-preview').hidden = true;
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5242880) {
    say('เลือก JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB', true);
    $('slip-file').value = '';
    return;
  }
  previewUrl = URL.createObjectURL(file);
  $('slip-preview').src = previewUrl;
  $('slip-preview').hidden = false;
};
$('slip-form').onsubmit = e => {
  e.preventDefault();
  const file = $('slip-file').files[0],
    id = order?.id;
  if (!id || !file || !$('confirm-transfer').checked) return;
  action(async () => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5242880)
      throw Error('ไฟล์สลิปไม่ถูกต้อง');
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = `${user.id}/${id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('slips')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    await rpc('submit_payment_slip', { p_payment: id, p_path: path });
    $('slip-file').value = '';
    $('slip-preview').hidden = true;
    if (autoVerify) {
      say('กำลังตรวจสอบการชำระเงิน…');
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { payment_id: id }
        });
        if (!error && data?.status === 'ok') {
          say(
            (gifting()
              ? 'ชำระสำเร็จ ส่งไกด์ให้ ' + giftEmail() + ' แล้ว'
              : 'ชำระเงินสำเร็จ ปลดล็อกสิทธิ์แล้ว') + (data.excess_cents ? ' ยอดส่วนเกินเก็บเป็นเครดิต' : '')
          );
          return;
        }
        if (!error && data?.status === 'credited') {
          say('ยอดโอนต่ำกว่ายอดชำระ เงินที่ตรวจผ่านเก็บเป็นเครดิตแล้ว เลือกแพ็กที่ต้องการซื้อได้เลย');
          return;
        }
      } catch {}
    }
    say('ส่งสลิปแล้ว ผู้ดูแลจะตรวจสอบให้ คุณดูสถานะได้ในประวัติการซื้อ');
  });
};
$('cancel-order').onclick = () =>
  action(async () => {
    await rpc('cancel_payment_order', { p_payment: order.id });
    say('ยกเลิกรายการแล้ว');
  });
$('refresh-orders').onclick = refresh;
supabase.auth.onAuthStateChange(() => setTimeout(refresh, 0));
refresh();

$('retry-verification').onclick = () =>
  action(async () => {
    if (!order || order.status !== 'pending') return;
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { payment_id: order.id }
    });
    if (error) throw error;
    say(
      data?.status === 'ok'
        ? gifting()
          ? 'ชำระสำเร็จ ส่งไกด์ให้ ' + giftEmail() + ' แล้ว'
          : 'ชำระเงินสำเร็จ ปลดล็อกสิทธิ์แล้ว'
        : data?.status === 'credited'
          ? 'ตรวจเงินเข้าจริงแล้ว เก็บเป็นเครดิตให้แล้ว'
          : data?.code === 'ATTEMPT_LIMIT'
            ? 'ตรวจครบจำนวนครั้งแล้ว ผู้ดูแลจะช่วยตรวจรายการนี้'
            : 'ยังตรวจไม่ผ่าน รายการยังคงรอตรวจสอบ ไม่ต้องโอนซ้ำ'
    );
  });

$('gift-toggle').onchange = () => {
  say('');
  render();
};
$('gift-email').oninput = () => {
  say('');
  render();
};

$('referral-email').oninput = () => say('');
