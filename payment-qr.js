import qrcode from './vendor/qrcode-generator.js?v=c345e19176';
export function crc16(text) {
  let crc = 0xffff;
  for (const c of text) {
    crc ^= c.charCodeAt(0) << 8;
    for (let n = 0; n < 8; n++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
export function parsePayload(text) {
  const fields = [];
  for (let i = 0; i < text.length;) {
    const id = text.slice(i, i + 2),
      size = text.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(size)) throw Error('QR ไม่ถูกต้อง');
    const n = Number(size),
      value = text.slice(i + 4, i + 4 + n);
    if (value.length !== n) throw Error('QR ไม่ครบ');
    fields.push({ id, value });
    i += 4 + n;
  }
  return fields;
}
export function amountPayload(source, cents) {
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000) throw Error('ยอด QR ไม่ถูกต้อง');
  const fields = parsePayload(source);
  if (
    fields.at(-1)?.id !== '63' ||
    fields.at(-1).value !== crc16(source.slice(0, -4)) ||
    fields.filter(f => f.id === '29').length !== 1
  )
    throw Error('QR ผู้รับไม่ถูกต้อง');
  const receiver = parsePayload(fields.find(f => f.id === '29').value);
  if (receiver.find(f => f.id === '00')?.value !== 'A000000677010111') throw Error('ไม่ใช่ QR พร้อมเพย์');
  const keep = fields.filter(f => !['54', '63'].includes(f.id));
  const init = keep.find(f => f.id === '01');
  if (init) init.value = '12';
  else keep.splice(1, 0, { id: '01', value: '12' });
  const currency = keep.find(f => f.id === '53');
  if (currency?.value !== '764') throw Error('QR ต้องใช้เงินบาท');
  const index = keep.findIndex(f => Number(f.id) > 54);
  keep.splice(index < 0 ? keep.length : index, 0, { id: '54', value: (cents / 100).toFixed(2) });
  const payload = keep.map(f => f.id + String(f.value.length).padStart(2, '0') + f.value).join('') + '6304';
  return payload + crc16(payload);
}
export function qrMatrix(payload) {
  const qr = qrcode(0, 'M');
  qr.addData(payload);
  qr.make();
  return Array.from({ length: qr.getModuleCount() }, (_, y) =>
    Array.from({ length: qr.getModuleCount() }, (_, x) => qr.isDark(y, x))
  );
}
export async function paymentImage(source, cents, imageUrl) {
  const payload = amountPayload(source, cents),
    matrix = qrMatrix(payload);
  const base = new Image();
  base.src = imageUrl;
  await base.decode();
  if (base.naturalWidth !== 885 || base.naturalHeight !== 1200)
    throw Error('ภาพ QR ผู้รับไม่ตรงกับรูปแบบที่รองรับ');
  const canvas = document.createElement('canvas');
  canvas.width = 885;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(base, 0, 0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(210, 277, 466, 466);
  const scale = Math.floor(466 / (matrix.length + 8)),
    size = scale * matrix.length,
    left = 210 + Math.floor((466 - size) / 2),
    top = 277 + Math.floor((466 - size) / 2);
  ctx.fillStyle = '#000';
  for (let y = 0; y < matrix.length; y++)
    for (let x = 0; x < matrix.length; x++)
      if (matrix[y][x]) ctx.fillRect(left + x * scale, top + y * scale, scale, scale);
  return canvas.toDataURL('image/png');
}
