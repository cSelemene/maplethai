import { translate } from './i18n.js?v=9fed356559';
import { supabase, readAccount } from './supabase-client.js?v=cb12a9f448';
import { rpc, money, date, STATUS } from './payment-common.js?v=965cc4294e';
const $ = id => document.getElementById(id);
let offset = 0;
let payments = [],
  names = {},
  loading = false,
  working = false;
function say(text, error = false) {
  $('admin-status').textContent = text;
  $('admin-status').className = 'message' + (error ? ' error' : '');
}
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function input(form, text, type = 'text') {
  const id = 'review-' + crypto.randomUUID();
  const label = el('label', text);
  label.htmlFor = id;
  const field = el('input');
  field.id = id;
  field.type = type;
  form.append(label, field);
  return field;
}
function render() {
  const list = $('payments-list');
  list.replaceChildren();
  const term = ($('payment-search')?.value || '').trim().toLowerCase();
  const rows = payments.filter(
    p =>
      ($('payment-filter').value === 'all' ||
        ($('payment-filter').value === 'review'
          ? p.bank_review_state === 'needs_review'
          : p.status === 'pending')) &&
      (!term ||
        [
          p.email,
          p.gift_email,
          p.referral_email,
          p.trans_ref,
          p.id,
          (p.amount_due_cents / 100).toFixed(2),
          p.received_cents == null ? '' : (p.received_cents / 100).toFixed(2),
          names[p.product]
        ].some(v =>
          String(v ?? '')
            .toLowerCase()
            .includes(term)
        ))
  );
  if (!rows.length) {
    list.textContent = 'ไม่มีรายการในสถานะนี้';
    return;
  }
  for (const p of rows) {
    const row = el('article', null, 'history-row');
    row.append(
      el('h3', `#${p.id} · ${names[p.product] || p.product} · ${money(p.amount)}`),
      el('span', STATUS[p.status] || p.status, 'tag ' + p.status),
      el('p', `${p.email || 'บัญชีถูกลบ'} · ${date(p.created_at)}`)
    );
    row.append(
      el('p', 'สิทธิ์ปัจจุบัน: ' + (p.has_access ? 'ใช้งานได้' : 'ยังไม่มีสิทธิ์ / หมดอายุ / ถูกระงับ'))
    );
    if (p.bank_review_state === 'needs_review')
      row.append(el('p', '⚠ ปลดล็อกแล้ว · รอตรวจยอดเงินจริงในบัญชี', 'message'));
    if (p.bank_review_state === 'confirmed') row.append(el('p', '✓ ผู้ดูแลยืนยันเงินเข้าแล้ว'));
    if (p.bank_review_reason) row.append(el('p', 'เหตุที่ต้องตรวจย้อนหลัง: ' + p.bank_review_reason));
    if (p.status === 'ok') {
      const note = el('input');
      note.placeholder = 'หมายเหตุ / เหตุผลที่ระงับ';
      note.maxLength = 500;
      note.setAttribute('aria-label', 'หมายเหตุรายการ ' + p.id);
      const confirm = el('button', 'ยืนยันเงินเข้าแล้ว');
      confirm.type = 'button';
      const revoke = el('button', 'ระงับสิทธิ์รายการนี้', 'outline');
      revoke.type = 'button';
      confirm.disabled = p.bank_review_state === 'confirmed';
      const action = async accept => {
        if (working) return;
        if (!accept && note.value.trim().length < 3) {
          say('กรอกเหตุผลการระงับอย่างน้อย 3 ตัวอักษร', true);
          return;
        }
        if (!accept && !window.confirm(translate('ระงับสิทธิ์จากรายการ #' + p.id + ' ของ ' + p.email + '?')))
          return;
        working = true;
        confirm.disabled = revoke.disabled = true;
        try {
          await rpc('admin_reconcile_payment', {
            p_payment: p.id,
            p_confirm: accept,
            p_note: note.value.trim()
          });
          say(accept ? 'ยืนยันเงินเข้าแล้ว' : 'ระงับสิทธิ์จากรายการนี้แล้ว');
          await loadOrders();
        } catch (e) {
          say(e.message, true);
        } finally {
          working = false;
          confirm.disabled = p.bank_review_state === 'confirmed';
          revoke.disabled = false;
        }
      };
      confirm.onclick = () => action(true);
      revoke.onclick = () => action(false);
      row.append(note, confirm, revoke);
    }
    if (p.referral_email) row.append(el('p', 'ผู้แนะนำ: ' + p.referral_email));
    if (p.gift_email) row.append(el('p', 'ซื้อไกด์ให้ ' + p.gift_email));
    if (p.recipient)
      row.append(
        el(
          'p',
          `ผู้รับตามรายการ: ${p.recipient.bank} · ${p.recipient.account_number} · ${p.recipient.recipient_name}`
        )
      );
    if (p.verification_code) row.append(el('p', 'ผลตรวจ: ' + p.verification_code));
    if (p.credit_applied_cents)
      row.append(
        el(
          'p',
          'ใช้เครดิต ' +
            money(p.credit_applied_cents / 100) +
            ' · ยอดโอนเพิ่ม ' +
            money(p.amount_due_cents / 100)
        )
      );
    if (p.processing_fee_cents)
      row.append(
        el(
          'p',
          'ทศนิยมช่วยตรวจเช็คยอด ' +
            money(p.processing_fee_cents / 100) +
            ' · ยอดเรียกเก็บผ่านธนาคาร ' +
            money(p.amount_due_cents / 100)
        )
      );
    if (p.received_cents) row.append(el('p', 'ยอดโอนจริง ' + money(p.received_cents / 100)));
    if (p.trans_ref && !p.trans_ref.startsWith('ORDER-'))
      row.append(el('p', 'เลขอ้างอิงธนาคาร: ' + p.trans_ref));
    if (p.review_note) row.append(el('p', 'หมายเหตุ: ' + p.review_note));
    if (p.slip_path) {
      const view = el('button', 'เปิดสลิป', 'outline');
      view.type = 'button';
      view.onclick = async () => {
        view.disabled = true;
        try {
          const { data, error } = await supabase.storage.from('slips').createSignedUrl(p.slip_path, 120);
          if (error) throw error;
          const old = row.querySelector('img');
          if (old) old.remove();
          const img = el('img', null, 'preview');
          img.alt = 'สลิปรายการ #' + p.id;
          img.src = data.signedUrl;
          row.insertBefore(img, view.nextSibling);
        } catch (e) {
          say(e.message, true);
        } finally {
          view.disabled = false;
        }
      };
      row.append(view);
    }
    if (p.status === 'pending') {
      const retry = el('button', 'ตรวจสลิปอัตโนมัติ', 'outline');
      retry.type = 'button';
      retry.onclick = async () => {
        retry.disabled = true;
        try {
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { payment_id: p.id }
          });
          if (error) throw error;
          say(
            data?.status === 'ok'
              ? 'ตรวจผ่านและปลดล็อกสิทธิ์แล้ว'
              : data?.status === 'credited'
                ? 'ตรวจเงินเข้าจริงแล้ว เก็บเป็นเครดิตให้ลูกค้า'
                : 'ยังตรวจอัตโนมัติไม่ได้ กรุณาตรวจรายการด้วยตนเอง'
          );
          await loadOrders();
        } catch {
          say('ตรวจอัตโนมัติไม่สำเร็จ สามารถตรวจและอนุมัติด้วยตนเองได้', true);
        } finally {
          retry.disabled = false;
        }
      };
      row.append(retry);
      const form = el('form');
      const amount = input(form, 'ยอดที่ได้รับจริง (บาท)', 'number');
      amount.min = '0.01';
      amount.step = '0.01';
      amount.required = true;
      const bankRef = input(form, 'เลขอ้างอิงธนาคารจากรายการเงินจริง');
      bankRef.minLength = 6;
      bankRef.maxLength = 200;
      bankRef.required = true;
      const note = input(form, 'หมายเหตุ / เหตุผลที่ไม่อนุมัติ');
      note.maxLength = 500;
      const label = el('label', null, 'check');
      const checked = el('input');
      checked.type = 'checkbox';
      checked.required = true;
      label.append(
        checked,
        el('span', 'ตรวจในบัญชีธนาคารแล้ว: ยอดเข้าจริง ผู้รับตรงกับรายการ และเลขอ้างอิงไม่ซ้ำ')
      );
      form.append(label);
      const actions = el('div', null, 'actions');
      const approve = el('button', 'บันทึกยอดเงินจริง / จัดสรรเครดิต');
      approve.type = 'submit';
      const reject = el('button', 'ไม่อนุมัติ', 'outline');
      reject.type = 'button';
      actions.append(approve, reject);
      form.append(actions);
      async function review(accept) {
        if (working) return;
        if (!accept && note.value.trim().length < 3) {
          say('กรอกเหตุผลที่ไม่อนุมัติอย่างน้อย 3 ตัวอักษร', true);
          note.focus();
          return;
        }
        if (
          accept &&
          (!checked.checked || !amount.value || Number(amount.value) <= 0 || bankRef.value.trim().length < 6)
        ) {
          say('ตรวจยอดเข้าจริงและกรอกเลขอ้างอิงก่อนบันทึก', true);
          return;
        }
        working = true;
        approve.disabled = reject.disabled = true;
        try {
          if (accept && !Number.isInteger(Number(amount.value)))
            await rpc('admin_record_transfer', {
              p_payment: p.id,
              p_amount: Number(amount.value),
              p_bank_ref: bankRef.value.trim(),
              p_note: note.value.trim()
            });
          else
            await rpc('admin_review_payment', {
              p_payment: p.id,
              p_approve: accept,
              p_amount: accept ? Number(amount.value) : null,
              p_bank_ref: accept ? bankRef.value.trim() : null,
              p_note: note.value.trim()
            });
          say(
            accept
              ? 'บันทึกแล้ว ยอดครบปลดล็อกสิทธิ์ ยอดต่ำเก็บเป็นเครดิต ยอดเกินคืนส่วนเกินเข้าเครดิต'
              : 'บันทึกผลไม่อนุมัติแล้ว'
          );
          await loadOrders();
        } catch (e) {
          say(e.message, true);
        } finally {
          working = false;
          approve.disabled = reject.disabled = false;
        }
      }
      form.onsubmit = e => {
        e.preventDefault();
        review(true);
      };
      reject.onclick = () => review(false);
      row.append(form);
    }
    list.append(row);
  }
}
async function loadOrders() {
  const data = await rpc('admin_payment_dashboard', { p_offset: offset });
  payments = data.orders;
  $('payment-summary').textContent =
    `แจ้งเตือน: ปลดล็อกแล้วรอตรวจเงินจริง ${data.needs_review} รายการ · ยังไม่ปลดล็อกรอตรวจ ${data.pending} รายการ · อัปเดต ${new Date().toLocaleTimeString('th-TH')}`;
  $('previous-page').disabled = offset === 0;
  $('next-page').disabled = payments.length < 200;
  $('page-label').textContent = 'หน้า ' + (offset / 200 + 1);
  render();
}
async function verify() {
  if (loading) return;
  loading = true;
  $('admin-content').hidden = true;
  $('admin-login').hidden = true;
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      say('เข้าสู่ระบบด้วยบัญชีผู้ดูแลเพื่อดูสลิปและจัดการการชำระเงิน');
      $('admin-login').hidden = false;
      return;
    }
    const account = await readAccount();
    if (!account.is_admin) {
      say('บัญชีนี้ไม่มีสิทธิ์จัดการการชำระเงิน', true);
      return;
    }
    const verification = await rpc('admin_verification_settings');
    $('verification-enabled').checked = verification.enabled;
    $('verification-settings-status').textContent = verification.has_key
      ? verification.enabled
        ? 'เปิดตรวจอัตโนมัติแล้ว'
        : 'บันทึก API Key แล้ว ยังปิดตรวจอัตโนมัติ'
      : 'ยังไม่เชื่อม EasySlip — ระบบใช้ผู้ดูแลตรวจสลิป';
    const cfg = await rpc('payment_settings');
    $('setting-bank').value = cfg.bank;
    $('setting-account').value = cfg.account_number;
    $('setting-name').value = cfg.recipient_name;
    $('setting-enabled').checked = cfg.enabled;
    const { data, error } = await supabase.from('products').select('id,name');
    if (error) throw error;
    names = Object.fromEntries(data.map(p => [p.id, p.name]));
    await loadOrders();
    $('admin-content').hidden = false;
    say(cfg.enabled ? 'เปิดรับชำระเงินแล้ว' : 'ยังปิดรับชำระเงิน กรอกบัญชีรับเงินแล้วเปิดใช้งานเมื่อพร้อม');
  } catch (e) {
    say(e.message, true);
  } finally {
    loading = false;
  }
}
$('settings-form').onsubmit = async e => {
  e.preventDefault();
  $('save-settings').disabled = true;
  try {
    await rpc('admin_payment_settings', {
      p_enabled: $('setting-enabled').checked,
      p_bank: $('setting-bank').value.trim(),
      p_account: $('setting-account').value.trim(),
      p_name: $('setting-name').value.trim()
    });
    say(
      $('setting-enabled').checked
        ? 'บันทึกแล้ว เปิดรับชำระเงินผ่านการโอน'
        : 'บันทึกแล้ว ปิดรับรายการชำระเงินใหม่'
    );
  } catch (e) {
    say(e.message, true);
  } finally {
    $('save-settings').disabled = false;
  }
};
$('payment-filter').onchange = render;
$('reload-payments').onclick = async () => {
  try {
    await loadOrders();
    say('อัปเดตรายการแล้ว');
  } catch (e) {
    say(e.message, true);
  }
};
supabase.auth.onAuthStateChange(() => setTimeout(verify, 0));
verify();

$('verification-settings-form').onsubmit = async e => {
  e.preventDefault();
  $('save-verification-settings').disabled = true;
  try {
    await rpc('admin_save_verification_settings', {
      p_enabled: $('verification-enabled').checked,
      p_key: $('verification-api-key').value.trim()
    });
    $('verification-api-key').value = '';
    $('verification-settings-status').textContent = $('verification-enabled').checked
      ? 'บันทึกแล้ว เปิดตรวจอัตโนมัติ'
      : 'บันทึกแล้ว ปิดตรวจอัตโนมัติ';
    say('บันทึกการเชื่อมบริการตรวจสลิปแล้ว');
  } catch (e) {
    say(e.message, true);
  } finally {
    $('save-verification-settings').disabled = false;
  }
};

if ($('payment-search')) $('payment-search').oninput = render;

$('previous-page').onclick = async () => {
  offset = Math.max(0, offset - 200);
  try {
    await loadOrders();
  } catch (e) {
    say(e.message, true);
  }
};
$('next-page').onclick = async () => {
  offset += 200;
  try {
    await loadOrders();
  } catch (e) {
    say(e.message, true);
  }
};
setInterval(async () => {
  if (!$('admin-content').hidden && !working && !document.hidden) {
    try {
      await loadOrders();
    } catch (e) {
      say('รีเฟรชไม่สำเร็จ: ' + e.message, true);
    }
  }
}, 30000);
