import { translate } from './i18n.js?v=9ff36a4da6';
import {
  STAT_LABELS,
  formatStatDiff,
  parseStatDiff,
  itemCategory,
  itemFields,
  itemUrl,
  findItems
} from './market-items.js?v=0bc363de63';
import { supabase, readAccount } from './supabase-client.js?v=cb12a9f448';
const $ = id => document.getElementById(id),
  categories = {
    weapon: 'อาวุธ',
    armor: 'ชุดและเครื่องป้องกัน',
    scroll: 'สโครล',
    material: 'วัตถุดิบ',
    consumable: 'ของใช้',
    other: 'อื่น ๆ'
  },
  channels = { discord: 'Discord', line: 'LINE', facebook: 'Facebook', other: 'ช่องทางอื่น' };
let quota = null,
  openingContact = false;
let user = null,
  account = null,
  mine = false,
  page = 0,
  rows = [],
  editing = null,
  generation = 0,
  authGeneration = 0,
  busy = false,
  items = [],
  selectedItem = null,
  suggestions = [],
  referenceGeneration = 0,
  referenceMedian = null,
  referenceTimer;
const size = 18;
let highlightedListing = /^[1-9][0-9]{0,14}$/.test(new URLSearchParams(location.search).get('listing') || '')
  ? Number(new URLSearchParams(location.search).get('listing'))
  : null;
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
const paid = () =>
  Boolean(
    account?.is_admin ||
    account?.entitlements?.some(
      e => e.product === 'market' && (!e.expires_at || new Date(e.expires_at) > new Date())
    )
  );
const login = () => location.assign('./auth.html?next=marketplace.html');
const date = s => new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
function message(text, error = false) {
  $('status').textContent = text;
  $('status').className = error ? 'error' : '';
}
function membership() {
  const market = account?.entitlements?.find(e => e.product === 'market');
  $('account-link').textContent = user ? 'บัญชีของฉัน' : 'เข้าสู่ระบบ';
  $('account-link').href = user ? './auth.html' : './auth.html?next=marketplace.html';
  $('market-buy').hidden = paid();
  $('membership-title').textContent = paid() ? 'คุณเป็นสมาชิกตลาดแล้ว' : 'โพสต์ฟรี ดูสินค้าได้ทุกคน';
  $('membership-description').textContent = paid()
    ? market?.expires_at
      ? 'ดูช่องทางติดต่อได้ถึง ' +
        new Date(market.expires_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) +
        ' · โบนัสสะสม ' +
        (quota?.bonus_remaining ?? 0) +
        ' ครั้ง เก็บไว้ใช้ภายหลัง'
      : (market?.source === 'pack'
          ? 'สมาชิกตลาดถาวรจากแพ็กทุกอาชีพ เปิดดูช่องทางติดต่อได้ไม่จำกัด'
          : 'เปิดดูช่องทางติดต่อของเจ้าของประกาศได้') +
        ' · โบนัสสะสม ' +
        (quota?.bonus_remaining ?? 0) +
        ' ครั้ง'
    : user
      ? 'เปิดดูฟรีเหลือ ' +
        (quota?.free_remaining ?? quota?.remaining ?? '…') +
        ' / 10 ประกาศเดือนนี้ · โบนัสสะสม ' +
        (quota?.bonus_remaining ?? 0) +
        ' ครั้ง · เปิดประกาศเดิมซ้ำไม่หักเพิ่ม'
      : 'สมัครบัญชีเพื่อเปิดดูช่องทางติดต่อฟรี 10 ประกาศต่อเดือน';
}
async function refreshAccount() {
  const ticket = ++authGeneration;
  try {
    const {
      data: { user: u },
      error
    } = await supabase.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') throw error;
    const a = u ? await readAccount() : null;
    if (ticket !== authGeneration) return;
    user = u;
    account = a;
    quota = null;
    if (u) await refreshQuota(ticket);
    if (ticket !== authGeneration) return;
    membership();
    await load();
  } catch (e) {
    if (ticket !== authGeneration) return;
    user = null;
    account = null;
    quota = null;
    membership();
    message('ตรวจสอบบัญชีไม่สำเร็จ กรุณารีเฟรชอีกครั้ง', true);
  }
}
async function load() {
  updateCategoryTabs();
  const ticket = ++generation;
  $('listings').replaceChildren();
  $('previous').hidden = true;
  $('next').hidden = true;
  $('page-label').textContent = '';
  message('กำลังโหลดประกาศ…');
  if (mine && !user) {
    message('เข้าสู่ระบบเพื่อดูประกาศของคุณ');
    return;
  }
  try {
    let q = supabase
      .from('listings')
      .select(
        'id,user_id,kind,item_name,category,discord_user,discord_url,qty,price,price_max,price_unit,atk,slots,item_id,item_stats,status,created_at,expires_at'
      );
    if (highlightedListing && !mine) q = q.eq('id', highlightedListing);
    if (mine) q = q.eq('user_id', user.id);
    else q = q.eq('status', 'open').gt('expires_at', new Date().toISOString());
    if ($('filter-kind').value) q = q.eq('kind', $('filter-kind').value);
    if ($('filter-category').value) q = q.eq('category', $('filter-category').value);
    q = q.eq('price_unit', 'meso');
    const term = $('search')
      .value.trim()
      .replace(/steelies/gi, 'Steely')
      .replace(/ilbis/gi, 'Ilbi');
    if (term) q = q.ilike('item_name', '%' + term.replace(/[\\%_]/g, '\\$&') + '%');
    const sort = $('sort').value;
    if (sort !== 'new') q = q.order('price', { ascending: sort === 'low', nullsFirst: false });
    q = q
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(page * size, page * size + size);
    const { data, error } = await q;
    if (error) throw error;
    if (ticket !== generation) return;
    rows = data.slice(0, size);
    $('results-title').textContent =
      (mine ? 'ประกาศของฉัน' : 'รายการสินค้า') +
      ' · ' +
      rows.length +
      (data.length > size ? '+' : '') +
      ' รายการในหน้านี้';
    $('market-results').classList.toggle('has-results', rows.length > 0);
    $('previous').hidden = page === 0;
    $('next').hidden = data.length <= size;
    $('page-label').textContent = rows.length ? 'หน้า ' + (page + 1) : '';
    message('');
    if (!rows.length) {
      const empty = el('div', undefined, 'empty');
      empty.append(
        el('strong', mine ? 'ยังไม่มีประกาศของคุณ' : 'ยังไม่มีประกาศที่ตรงกับการค้นหา'),
        el('p', mine ? 'ลงขายของหรือประกาศรับซื้อได้ฟรี' : 'ลองเปลี่ยนคำค้น หรือเป็นคนแรกที่ลงประกาศ')
      );
      $('listings').append(empty);
    } else for (const row of rows) renderRow(row);
  } catch (e) {
    if (ticket === generation) message('โหลดประกาศไม่สำเร็จ: ' + e.message, true);
  }
}
function renderRow(row) {
  const own = row.user_id === user?.id,
    open = row.status === 'open' && new Date(row.expires_at) > new Date();
  const card = el('article', undefined, 'listing'),
    meta = el('div', undefined, 'post-meta');
  meta.append(
    el(
      'span',
      open ? (row.kind === 'sell' ? 'ขาย' : 'รับซื้อ') : row.status === 'done' ? 'ปิดแล้ว' : 'หมดอายุ',
      'post-kind ' + (!open ? 'done' : row.kind)
    ),
    el('span', row.discord_user && open ? timeLeft(row.expires_at) : date(row.created_at))
  );
  if (row.discord_user) meta.append(el('span', 'จาก Discord', 'discord-badge'));
  card.append(meta);
  const item =
    items.find(i => i.id === row.item_id) ||
    items.find(i => i.name.toLowerCase() === row.item_name.toLowerCase());
  const heading = item ? el('a', undefined, 'item-heading') : el('div', undefined, 'item-heading');
  if (item) {
    heading.href = itemUrl(item);
    heading.target = '_blank';
    heading.rel = 'noopener noreferrer';
    heading.title = 'ดู ' + item.name + ' ใน MeowDB';
  }
  const picture = el('span', undefined, 'item-picture');
  picture.append(itemImage(item));
  const name = el('span', undefined, 'item-name-block');
  name.append(
    el('h3', item?.name || row.item_name || 'ไอเทม'),
    el('small', categories[row.category] || categories.other)
  );
  heading.append(picture, name);
  if (item)
    heading.append(
      el('span', (item.subtype || item.type) + ' · Lv.' + item.lv + ' · คลิกดูใน MeowDB', 'item-tooltip')
    );
  card.append(heading);
  const price = el('p', undefined, 'price');
  const offer = row.price == null;
  if (offer) {
    // No price: the other side makes an offer through the poster's contact.
    price.classList.add('offer');
    price.title = 'ยังไม่ตั้งราคา ติดต่อผู้ลงประกาศเพื่อเสนอราคา';
    price.append(el('strong', 'เสนอราคา', 'price-amount'));
  } else {
    const coin = el('img', undefined, 'meso-icon');
    coin.src = './assets/market/meso-coin.svg?v=0e1561a5ba';
    coin.alt = 'Meso';
    coin.title = 'Meso';
    price.append(coin);
    // price_max (Discord listings only) turns the price into a low–high range.
    const full = n => new Intl.NumberFormat('en-US').format(n),
      fullPrice = full(row.price) + (row.price_max ? ' – ' + full(row.price_max) : '') + ' Meso';
    price.title = fullPrice;
    price.setAttribute('aria-label', fullPrice);
    const amount = compactPrice(row.price) + (row.price_max ? '–' + compactPrice(row.price_max) : '');
    price.append(el('strong', amount, 'price-amount'));
  }
  const priceCell = el('div', undefined, 'price-cell');
  priceCell.append(price);
  card.append(priceCell);
  const info = [String(row.qty)];
  const stats = row.item_stats || {};
  const quantity = el('p', info.join(' · '), 'item-info');
  quantity.setAttribute('aria-label', 'จำนวน ' + row.qty);
  card.append(quantity);
  const chips = el('div', undefined, 'stat-chips');
  for (const [key, value] of Object.entries(stats)) {
    if (STAT_LABELS[key])
      chips.append(
        el('span', STAT_LABELS[key] + ' ' + formatStatDiff(value), value > 0 ? 'up' : value < 0 ? 'down' : '')
      );
  }
  // Listings saved before item_stats existed only kept a total ATK.
  if (!Object.keys(stats).length && row.atk != null && (!item || itemCategory(item) === 'weapon'))
    chips.append(el('span', 'ATK ' + row.atk));
  if (row.slots !== null && row.slots !== undefined) chips.append(el('span', 'ช่องอัปเกรด ' + row.slots));
  if (!chips.children.length) chips.append(el('small', 'ไม่ระบุ'));
  const checkPrice = el('a', 'เช็คราคา Meso Watch ↗', 'price-check');
  checkPrice.href = 'https://meso.watch/';
  checkPrice.target = '_blank';
  checkPrice.rel = 'noopener noreferrer';
  checkPrice.title = 'ค้นหา ' + (item?.name || row.item_name) + ' ใน Meso Watch';
  checkPrice.onclick = () => navigator.clipboard?.writeText(item?.name || row.item_name).catch(() => {});
  priceCell.append(checkPrice);
  card.append(chips);
  const contact = el(
    'button',
    own
      ? 'ดูช่องทางติดต่อของฉัน'
      : offer
        ? row.discord_user
          ? 'เสนอราคาทาง Discord'
          : 'เสนอราคา'
        : row.discord_user
          ? 'ติดต่อทาง Discord'
          : 'ดูช่องทางติดต่อ'
  );
  contact.type = 'button';
  contact.disabled = !open && !own;
  contact.onclick = () => (row.discord_user ? showDiscordContact(row) : showContact(row));
  card.append(contact);
  if (own || account?.is_admin) {
    const actions = el('div', undefined, 'owner-actions');
    if (own && open) {
      const edit = el('button', 'แก้ไข', 'outline');
      edit.type = 'button';
      edit.onclick = () => openForm(row);
      actions.append(edit);
    }
    if (open) {
      const close = el('button', 'ปิดประกาศ', 'outline');
      close.type = 'button';
      close.onclick = async () => {
        if (!confirm(translate('ปิดประกาศ ' + row.item_name + '? ประกาศจะไม่แสดงในตลาดอีก'))) return;
        close.disabled = true;
        try {
          await rpc('marketplace_close', { p_id: row.id });
          await load();
        } catch (e) {
          close.disabled = false;
          message(e.message, true);
        }
      };
      actions.append(close);
    }
    card.append(actions);
  }
  $('listings').append(card);
}
// One big tap target per channel: links open the app, everything else copies to the clipboard.
function contactButton(key, value) {
  const url = externalUrl(value, key) || contactLink(value, key),
    button = el(url ? 'a' : 'button', undefined, 'contact-button ' + key),
    icon = el('span', undefined, 'contact-icon'),
    img = el('img'),
    text = el('span', undefined, 'contact-text'),
    action = el('small', url ? 'แตะเพื่อเปิด ' + channels[key] : 'แตะเพื่อคัดลอก');
  img.src = './assets/market/contact/' + key + '.svg';
  img.alt = '';
  icon.append(img);
  text.append(el('strong', channels[key]), el('span', value, 'contact-value'), action);
  button.append(icon, text);
  if (url) {
    button.href = url;
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
  } else {
    button.type = 'button';
    button.onclick = async () => {
      try {
        await navigator.clipboard.writeText(value);
        action.textContent =
          key === 'discord' ? 'คัดลอก username แล้ว · วางในช่องเพิ่มเพื่อนของ Discord' : 'คัดลอกแล้ว';
      } catch {
        action.textContent = 'คัดลอกไม่สำเร็จ · เลือกข้อความด้านบนเพื่อคัดลอก';
      }
      button.classList.add('copied');
    };
  }
  return button;
}
// A bare LINE ID or Facebook username can still be opened as a link.
function contactLink(value, channel) {
  const id = value.trim().replace(/^@/, '');
  if (channel === 'line' && /^[a-z0-9._-]{4,20}$/i.test(id))
    return 'https://line.me/R/ti/p/~' + encodeURIComponent(id);
  if (channel === 'facebook' && /^[a-z0-9.]{5,50}$/i.test(id) && !/^\d+$/.test(id))
    return 'https://www.facebook.com/' + encodeURIComponent(id);
  return null;
}
function externalUrl(value, channel) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return null;
    const hosts = {
      line: ['line.me', 'lin.ee'],
      facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'www.fb.com'],
      discord: ['discord.com', 'discord.gg']
    }[channel];
    return hosts?.includes(u.hostname.toLowerCase()) ? u.href : null;
  } catch {
    return null;
  }
}
async function showContact(row) {
  if (openingContact) return;
  const ticket = authGeneration;
  $('contact-title').textContent = row.item_name;
  $('contact-content').replaceChildren();
  $('contact-dialog').showModal();
  if (!user) {
    $('contact-content').append(el('p', 'เข้าสู่ระบบก่อนเปิดดูช่องทางติดต่อ'));
    const a = el('a', 'เข้าสู่ระบบ / สมัครสมาชิก', 'button');
    a.href = './auth.html?next=marketplace.html';
    $('contact-content').append(a);
    return;
  }
  $('contact-content').append(el('p', 'กำลังเปิดช่องทางติดต่อ…'));
  openingContact = true;
  try {
    const contacts = await rpc('listing_contact', { p_id: row.id });
    if (ticket !== authGeneration || !$('contact-dialog').open) return;
    $('contact-content').replaceChildren();
    refreshQuota(ticket);
    if (!Object.keys(contacts).length) {
      $('contact-content').append(el('p', 'เจ้าของประกาศยังไม่ได้ระบุช่องทางติดต่อ'));
      return;
    }
    const list = el('div', undefined, 'contact-list');
    for (const [key, value] of Object.entries(contacts))
      if (channels[key] && value) list.append(contactButton(key, value));
    $('contact-content').append(list);
  } catch (e) {
    if (ticket === authGeneration) {
      $('contact-content').replaceChildren(
        el(
          'p',
          e.message === 'LOCKED'
            ? 'ใช้สิทธิ์เปิดประกาศใหม่ฟรีครบ 10 ประกาศในเดือนนี้แล้ว สมัครสมาชิกตลาดเพื่อเปิดเพิ่มได้ไม่จำกัด'
            : e.message
        )
      );
      if (e.message === 'LOCKED') {
        const a = el('a', 'สมัครสมาชิกตลาด', 'button');
        a.href = './checkout.html?product=market';
        $('contact-content').append(a);
      }
    }
  } finally {
    openingContact = false;
  }
}
const discordLink = /^https:\/\/(ptb\.|canary\.)?discord(app)?\.com\/channels\/\d+\/\d+\/\d+$/;
function timeLeft(expires) {
  const hours = Math.ceil((new Date(expires) - Date.now()) / 3600000);
  return hours <= 1 ? 'ปิดในไม่ถึง 1 ชม.' : 'ปิดใน ' + hours + ' ชม.';
}
// Listings posted for Discord players: the username is public and free to view, no quota or login.
function showDiscordContact(row) {
  $('contact-title').textContent = row.item_name;
  const list = el('div', undefined, 'contact-list');
  list.append(contactButton('discord', row.discord_user));
  if (discordLink.test(row.discord_url || '')) {
    const a = el('a', 'ดูข้อความต้นฉบับใน Discord ↗', 'discord-source');
    a.href = row.discord_url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    list.append(a);
  }
  $('contact-content').replaceChildren(
    el('p', 'ประกาศนี้ลงแทนผู้เล่นจาก Discord ทักผู้เล่นทาง Discord ได้โดยตรง', 'muted'),
    list
  );
  $('contact-dialog').showModal();
}
function setDiscordMode(on) {
  $('for-discord').checked = on;
  $('discord-fields').hidden = !on;
  $('contact-fieldset').hidden = on;
}
$('for-discord').onchange = () => setDiscordMode($('for-discord').checked);
async function openForm(row = null) {
  if (!user) {
    login();
    return;
  }
  if (busy) return;
  const ticket = authGeneration;
  editing = row?.id ?? null;
  $('post-form').reset();
  selectItem(null);
  $('form-status').textContent = '';
  $('form-title').textContent = row ? 'แก้ไขประกาศ' : 'ลงประกาศ';
  $('save-post').textContent = row ? 'บันทึกการแก้ไข' : 'เผยแพร่ประกาศ';
  // Admins can post for Discord players; an existing listing keeps its kind.
  $('discord-mode').hidden = !account?.is_admin || !!(row && !row.discord_user);
  $('for-discord').disabled = !!row;
  setDiscordMode(!!row?.discord_user);
  $('discord-user').value = row?.discord_user || '';
  $('discord-url').value = row?.discord_url || '';
  $('price-max').value = row?.price_max || '';
  if (row) {
    for (const [id, key] of Object.entries({
      'item-name': 'item_name',
      kind: 'kind',
      category: 'category',
      qty: 'qty',
      price: 'price',
      slots: 'slots'
    }))
      $(id).value = row[key] ?? '';
    selectItem(
      items.find(i => i.id === row.item_id) ||
        items.find(i => i.name.toLowerCase() === row.item_name.toLowerCase()) ||
        null,
      row
    );
    if (!row.discord_user)
      try {
        const c = await rpc('listing_contact', { p_id: row.id });
        if (ticket !== authGeneration) return;
        for (const key of Object.keys(channels)) $(key).value = c[key] || '';
      } catch (e) {
        message(e.message, true);
        return;
      }
  }
  if (ticket === authGeneration) $('post-dialog').showModal();
}
$('post-form').onsubmit = async e => {
  e.preventDefault();
  if (busy) return;
  if (!selectedItem) {
    $('form-status').textContent = 'เลือกไอเทมจากรายการค้นหาก่อน';
    $('item-name').focus();
    return;
  }
  const forDiscord = $('for-discord').checked && !$('discord-mode').hidden;
  const contacts = {};
  for (const key of Object.keys(channels)) {
    const value = $(key).value.trim();
    if (value) contacts[key] = value;
  }
  if (forDiscord && !$('discord-user').value.trim()) {
    $('form-status').textContent = 'ใส่ Discord username ของผู้เล่น';
    $('discord-user').focus();
    return;
  }
  if (!forDiscord && !Object.keys(contacts).length) {
    $('form-status').textContent = 'กรอกช่องทางติดต่ออย่างน้อย 1 ช่องทาง';
    $('discord').focus();
    return;
  }
  const stats = readStats(selectedItem);
  if (!stats) {
    $('form-status').textContent = 'กรอกสเตตัสเป็นค่าแปรผัน เช่น +2, 0 หรือ -1';
    return;
  }
  const data = {
    item_id: selectedItem.id,
    item_stats: stats,
    kind: $('kind').value,
    item_name: $('item-name').value.trim(),
    category: $('category').value,
    qty: $('qty').value,
    price: $('price').value,
    price_unit: 'meso',
    slots: $('slots').value,
    contacts
  };
  busy = true;
  $('save-post').disabled = true;
  $('form-status').textContent = 'กำลังบันทึก…';
  try {
    if (forDiscord) {
      delete data.contacts;
      data.discord_user = $('discord-user').value.trim();
      data.discord_url = $('discord-url').value.trim();
      data.price_max = $('price-max').value.trim();
      await rpc('marketplace_save_discord', { p_id: editing, p_data: data });
    } else await rpc('marketplace_save', { p_id: editing, p_data: data });
    $('post-dialog').close();
    $('post-form').reset();
    mine = true;
    page = 0;
    $('search-form').reset();
    updateTabs();
    await load();
    message(
      forDiscord
        ? 'บันทึกประกาศจาก Discord แล้ว ประกาศจะปิดเองเมื่อครบ 36 ชั่วโมง'
        : 'บันทึกประกาศแล้ว ผู้ใช้เปิดดูช่องทางติดต่อได้ตามโควตาฟรีหรือสิทธิ์สมาชิกตลาด'
    );
  } catch (error) {
    $('form-status').textContent = error.message || 'บันทึกไม่สำเร็จ';
  } finally {
    busy = false;
    $('save-post').disabled = false;
  }
};
function updateTabs() {
  $('all-posts').setAttribute('aria-pressed', String(!mine));
  $('my-posts').setAttribute('aria-pressed', String(mine));
  $('all-posts').className = mine ? 'outline' : '';
  $('my-posts').className = mine ? '' : 'outline';
}
$('item-name').oninput = () => {
  selectedItem = null;
  $('selected-item').hidden = true;
  $('item-stats').hidden = true;
  clearPriceReference();
  suggestions = findItems(items, $('item-name').value);
  renderSuggestions();
};
$('item-name').onkeydown = e => {
  const buttons = [...$('item-suggestions').querySelectorAll('button')];
  if (e.key === 'ArrowDown' && buttons.length) {
    e.preventDefault();
    buttons[0].focus();
  }
  if (e.key === 'Enter' && suggestions.length) {
    e.preventDefault();
    selectItem(suggestions[0]);
  }
  if (e.key === 'Escape') hideSuggestions();
};
$('new-post').onclick = () => openForm();
$('close-form').onclick = () => {
  if (!busy) $('post-dialog').close();
};
$('close-contact').onclick = () => {
  $('contact-dialog').close();
  $('contact-content').replaceChildren();
};
$('contact-dialog').addEventListener('close', () => $('contact-content').replaceChildren());
$('post-dialog').addEventListener('cancel', e => {
  if (busy) e.preventDefault();
});
$('all-posts').onclick = () => {
  highlightedListing = null;
  mine = false;
  page = 0;
  updateTabs();
  load();
};
$('my-posts').onclick = () => {
  if (!user) {
    login();
    return;
  }
  mine = true;
  page = 0;
  updateTabs();
  load();
};
$('search-form').onsubmit = e => {
  e.preventDefault();
  hideSearchSuggestions();
  applyFilters();
};
$('refresh').onclick = refreshAccount;
$('previous').onclick = () => {
  page--;
  load();
};
$('next').onclick = () => {
  page++;
  load();
};
supabase.auth.onAuthStateChange(() => {
  authGeneration++;
  generation++;
  user = null;
  account = null;
  quota = null;
  rows = [];
  $('contact-dialog').close();
  $('contact-content').replaceChildren();
  $('post-dialog').close();
  $('post-form').reset();
  $('listings').replaceChildren();
  setTimeout(refreshAccount, 0);
});
start();

function itemImage(item) {
  if (!item?.icon) return el('span', item?.name?.slice(0, 2) || '?', 'item-placeholder');
  const img = el('img');
  img.src = item.icon;
  img.alt = item.name;
  img.loading = 'lazy';
  img.onerror = () => img.replaceWith(el('span', item.name.slice(0, 2), 'item-placeholder'));
  return img;
}
function hideSuggestions() {
  $('item-suggestions').hidden = true;
  $('item-name').setAttribute('aria-expanded', 'false');
}
function renderSuggestions() {
  const list = $('item-suggestions');
  list.replaceChildren();
  list.hidden = !$('item-name').value.trim();
  $('item-name').setAttribute('aria-expanded', String(!list.hidden));
  if (!suggestions.length) {
    list.append(el('p', 'ไม่พบไอเทม ลองใช้ชื่อภาษาอังกฤษหรือคำสั้นลง'));
    return;
  }
  for (const item of suggestions) {
    const b = el('button', undefined, 'item-option');
    b.type = 'button';
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', 'false');
    const text = el('span', item.name);
    text.append(el('small', (item.subtype || item.type) + ' · Lv.' + item.lv));
    b.append(itemImage(item), text);
    b.onclick = () => selectItem(item);
    b.onkeydown = e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        b.nextElementSibling?.focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        (b.previousElementSibling || $('item-name')).focus();
      }
      if (e.key === 'Escape') {
        hideSuggestions();
        $('item-name').focus();
      }
    };
    list.append(b);
  }
}
function selectItem(item, row = null) {
  clearPriceReference();
  selectedItem = item;
  hideSuggestions();
  $('selected-item').replaceChildren();
  $('primary-stat').replaceChildren();
  $('secondary-stats').replaceChildren();
  $('selected-item').hidden = !item;
  $('item-stats').hidden = item?.type !== 'Equip';
  $('extra-stats').open = false;
  if (!item) return;
  $('item-name').value = item.name;
  $('category').value = itemCategory(item);
  const selected = el('div', undefined, 'selected-summary'),
    text = el('p', item.name);
  text.append(
    el('small', (item.subtype || item.type) + ' · Lv.' + item.lv + ' · ' + categories[itemCategory(item)])
  );
  selected.append(itemImage(item), text);
  const a = el('a', 'ดูข้อมูล');
  a.href = itemUrl(item);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  selected.append(a);
  $('selected-item').append(selected);
  const fields = itemFields(item);
  for (const [index, key] of fields.entries()) {
    const box = el('div'),
      label = el('label', STAT_LABELS[key]),
      input = el('input');
    input.id = 'stat-' + key;
    input.type = 'text';
    input.autocomplete = 'off';
    input.maxLength = 4;
    input.pattern = '[+\\-]?[0-9]{1,3}';
    label.htmlFor = input.id;
    input.value = row?.item_stats?.[key] != null ? formatStatDiff(row.item_stats[key]) : '';
    input.placeholder = 'เช่น +2 หรือ -1';
    box.append(label, input);
    $(index === 0 ? 'primary-stat' : 'secondary-stats').append(box);
  }
  $('slots').value = row?.slots ?? (item.id === 917 ? '7' : '');
  $('item-hint').textContent = 'หมวดและช่องสเตตัสตั้งค่าตามไอเทมแล้ว';
  refreshPriceReference();
}
async function start() {
  // ?q=<item name> opens the market already searching for that item (used by articles).
  const initialSearch = (new URLSearchParams(location.search).get('q') || '').trim().slice(0, 60);
  if (initialSearch) $('search').value = initialSearch;
  try {
    const response = await fetch('./assets/market/items.json?v=25997792fb');
    if (!response.ok) throw Error('โหลดรายชื่อไอเทมไม่ได้');
    items = await response.json();
    buildCategoryTabs();
    await refreshAccount();
  } catch (e) {
    message(e.message + ' กรุณารีเฟรชอีกครั้ง', true);
  }
}

let searchTimer;
function applyFilters() {
  highlightedListing = null;
  history.replaceState(null, '', './marketplace.html');
  clearTimeout(searchTimer);
  page = 0;
  load();
}
$('search').oninput = () => {
  renderSearchSuggestions();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 300);
};
for (const id of ['filter-kind', 'filter-category', 'sort']) $(id).onchange = applyFilters;
$('clear-filters').onclick = () => {
  $('search-form').reset();
  hideSearchSuggestions();
  applyFilters();
};
function buildCategoryTabs() {
  const tabs = $('category-tabs');
  for (const [value, label] of [['', 'ทั้งหมด'], ...Object.entries(categories)]) {
    const button = el('button', undefined, 'category-tab');
    button.type = 'button';
    button.dataset.category = value;
    button.setAttribute('aria-pressed', String(value === ''));
    const item = items.find(i => i.icon && itemCategory(i) === value);
    if (item) button.append(itemImage(item));
    button.append(el('span', label));
    button.onclick = () => {
      $('filter-category').value = value;
      applyFilters();
    };
    tabs.append(button);
  }
}
function updateCategoryTabs() {
  for (const button of $('category-tabs').children)
    button.setAttribute('aria-pressed', String(button.dataset.category === $('filter-category').value));
}
function setView(list) {
  $('market-results').classList.toggle('list-mode', list);
  $('list-view').setAttribute('aria-pressed', String(list));
  $('card-view').setAttribute('aria-pressed', String(!list));
  $('list-view').className = list ? '' : 'outline';
  $('card-view').className = list ? 'outline' : '';
}
$('list-view').onclick = () => setView(true);
$('card-view').onclick = () => setView(false);

function hideSearchSuggestions() {
  $('search-suggestions').hidden = true;
  $('search').setAttribute('aria-expanded', 'false');
}
function chooseSearchItem(item) {
  $('search').value = item.name;
  $('search').focus();
  hideSearchSuggestions();
  applyFilters();
}
function renderSearchSuggestions() {
  const list = $('search-suggestions'),
    query = $('search').value.trim();
  list.replaceChildren();
  if (!query) {
    hideSearchSuggestions();
    return;
  }
  list.hidden = false;
  $('search').setAttribute('aria-expanded', 'true');
  const matches = findItems(items, query);
  if (!matches.length) {
    list.append(el('p', 'ไม่พบไอเทมแนะนำ · ยังค้นหาประกาศด้วยคำนี้ได้'));
    return;
  }
  for (const item of matches) {
    const button = el('button', undefined, 'item-option');
    button.type = 'button';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', 'false');
    button.dataset.itemId = item.id;
    const text = el('span', item.name);
    text.append(el('small', (item.subtype || item.type) + ' · Lv.' + item.lv));
    button.append(itemImage(item), text);
    button.onclick = () => chooseSearchItem(item);
    button.onkeydown = e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        (button.nextElementSibling || list.firstElementChild).focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        (button.previousElementSibling || $('search')).focus();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        $('search').focus();
        hideSearchSuggestions();
      }
    };
    list.append(button);
  }
}
$('search').onfocus = () => {
  if ($('search').value.trim()) renderSearchSuggestions();
};
$('search').onkeydown = e => {
  if (e.key === 'ArrowDown') {
    renderSearchSuggestions();
    const option = $('search-suggestions').querySelector('button');
    if (option) {
      e.preventDefault();
      option.focus();
    }
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    hideSearchSuggestions();
  }
};
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('.search-picker')) hideSearchSuggestions();
});
$('search-suggestions').parentElement.addEventListener('focusout', () => {
  setTimeout(() => {
    if (!$('search-suggestions').parentElement.contains(document.activeElement)) hideSearchSuggestions();
  }, 0);
});

const compactPrice = n =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n);
function clearPriceReference() {
  referenceGeneration++;
  clearTimeout(referenceTimer);
  referenceMedian = null;
  $('price-reference').hidden = true;
  $('use-reference-price').hidden = true;
  $('copy-reference-name').textContent = 'คัดลอกชื่อไอเทม';
}
// Stat inputs take the difference from the standard value; null when any entry is invalid.
function readStats(item) {
  const stats = {};
  for (const key of itemFields(item)) {
    const input = $('stat-' + key);
    if (!input || input.value.trim() === '') continue;
    const value = parseStatDiff(key, input.value);
    if (value === null) return null;
    stats[key] = value;
  }
  return stats;
}
async function refreshPriceReference() {
  const item = selectedItem;
  if (!item) return;
  const ticket = ++referenceGeneration;
  referenceMedian = null;
  $('price-reference').hidden = false;
  $('use-reference-price').hidden = true;
  $('price-reference-status').textContent = 'กำลังเช็คราคาเสนอขาย…';
  const stats = readStats(item);
  if (!stats) {
    $('price-reference-status').textContent = 'กรอกสเตตัสเป็นค่าแปรผัน เช่น +2, 0 หรือ -1';
    return;
  }
  try {
    const ref = await rpc('marketplace_price_reference', {
      p_item_id: item.id,
      p_stats: stats,
      p_slots: item.type === 'Equip' && $('slots').value !== '' ? Number($('slots').value) : null
    });
    if (ticket !== referenceGeneration || selectedItem?.id !== item.id) return;
    if (ref?.seller_count >= 3 && Number(ref.low) > 0 && Number(ref.high) >= Number(ref.low)) {
      $('price-reference-status').textContent =
        compactPrice(ref.low) +
        ' – ' +
        compactPrice(ref.high) +
        ' Meso · ผู้ขาย ' +
        ref.seller_count +
        ' คน' +
        (item.type === 'Equip' && !Object.keys(stats).length
          ? ' · ยังไม่ระบุสเตตัส: ช่วงราคานี้รวมหลายสเตตัส'
          : '');
      $('price-reference-status').title =
        new Intl.NumberFormat('en-US').format(ref.low) +
        ' – ' +
        new Intl.NumberFormat('en-US').format(ref.high) +
        ' Meso';
      referenceMedian = Number(ref.median);
      $('use-reference-price').hidden = false;
    } else {
      $('price-reference-status').textContent =
        'ข้อมูลราคาไอเทมและสเตตัสนี้ยังไม่พอ (ต้องมีผู้ขายอย่างน้อย 3 คน) · เช็ก Meso Watch เพิ่มได้';
    }
  } catch (e) {
    if (ticket === referenceGeneration)
      $('price-reference-status').textContent = 'เช็คราคาใน MapleThai ไม่สำเร็จ · เปิด Meso Watch ตรวจสอบได้';
  }
}
$('item-stats').addEventListener('input', () => {
  referenceGeneration++;
  referenceMedian = null;
  $('use-reference-price').hidden = true;
  clearTimeout(referenceTimer);
  $('price-reference-status').textContent = 'กำลังเช็คราคาตามสเตตัส…';
  referenceTimer = setTimeout(refreshPriceReference, 350);
});
$('use-reference-price').onclick = () => {
  if (Number.isFinite(referenceMedian) && referenceMedian > 0) $('price').value = referenceMedian;
};
$('copy-reference-name').onclick = async () => {
  try {
    await navigator.clipboard.writeText(selectedItem.name);
    $('copy-reference-name').textContent = 'คัดลอกแล้ว';
  } catch {
    $('price-reference-status').textContent = 'ชื่อสำหรับค้นหาใน Meso Watch: ' + selectedItem.name;
  }
};

async function refreshQuota(ticket = authGeneration) {
  try {
    const q = await rpc('marketplace_contact_quota', {});
    if (ticket !== authGeneration) return;
    quota = q;
    membership();
  } catch {
    if (ticket === authGeneration) {
      quota = null;
      membership();
    }
  }
}
