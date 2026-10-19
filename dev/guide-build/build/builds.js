/* ---------- แท็บ Builds ---------- */
const BSLOT = [
  ["", "hat", "", "", ""],
  ["medal", "face", "", "ring1", "ring2"],
  ["", "", "eye", "ear", "shoulder"],
  ["cape", "top", "pendant", "weapon", "shield"],
  ["gloves", "bottom", "belt", "ring3", "ring4"],
  ["", "", "shoes", "", ""],
];
const BSLOT_EN = {hat:"CAP", face:"FOREHEAD", eye:"EYE ACC", ear:"EARRING", shoulder:"SHOULDER", medal:"MEDAL", ring1:"RING", ring2:"RING", ring3:"RING", ring4:"RING", cape:"MANTLE", top:"CLOTHES", pendant:"PENDANT", weapon:"WEAPON", shield:"SHIELD", gloves:"GLOVES", bottom:"PANTS", belt:"BELT", shoes:"SHOES"};
const BSLOT_TH = {weapon:"อาวุธ", shield:"โล่", hat:"หมวก", top:"เสื้อ", bottom:"กางเกง", shoes:"รองเท้า", gloves:"ถุงมือ", ear:"ต่างหู", cape:"ผ้าคลุม"};
const BSLOT_ORDER = ["weapon","shield","hat","top","bottom","shoes","gloves","ear","cape"];
const BKIND = {start:"เกมให้", buy:"ร้าน NPC", drop:"ดรอป", quest:"เควส", craft:"คราฟต์", none:"ยังหาไม่ได้"};
const bKinds = it => it.k.map(k => `<span class="gk ${k}">${BKIND[k]}</span>`).join(" ");
const bMeso = v => `${Number(v).toLocaleString("en-US")} meso`;
function bFm(n){ const p = ((typeof MKT !== "undefined" && MKT && MKT.prices) || {})[n]; if (!p || !p.usual) return null; const r = (p.priceChecks||0) + (p.soldChecks||0); return {v: p.usual, r, few: r < 3}; }
/* ราคา: ร้าน NPC (แน่นอน) และราคาผู้เล่นโดยประมาณ (จากข้อมูลแท็บหาเงิน) ไม่แสดงราคาผู้เล่นของที่ได้จากเควสหรือเกมให้อย่างเดียว */
function bPrice(n){
  const it = bIt(n), out = [];
  if (it.shop) out.push(`<div class="bp"><span class="bpl">ร้าน NPC</span>${bMeso(it.shop.price)} <small>ที่ ${esc(it.shop.npc)}, ${esc(it.shop.town)}${it.nshop > 1 ? ` และร้านอื่นอีก ${it.nshop - 1} ร้าน` : ""}</small></div>`);
  const fmOk = !it.st.untradeable && it.k.some(k => k === "buy" || k === "drop" || k === "craft");
  if (fmOk) { const f = bFm(n); out.push(f ? `<div class="bp"><span class="bpl fm">ผู้เล่นขายประมาณ</span>${bMeso(f.v)} <small>รายงาน ${f.r} ครั้ง${f.few ? ", ข้อมูลน้อย" : ""}</small></div>` : `<div class="bp"><span class="bpl fm">ผู้เล่นขายประมาณ</span><small>ยังไม่มีข้อมูล</small></div>`); }
  return out.join("");
}
const BSTAT = [["str","STR"],["dex","DEX"],["int","INT"],["luk","LUK"],["hp","MaxHP"],["mp","MaxMP"],["watk","WEAPON ATT"],["matk","MAGIC ATT"],["wdef","WEAPON DEF"],["mdef","MAGIC DEF"],["acc","ACCURACY"],["avoid","AVOIDABILITY"],["speed","SPEED"],["jump","JUMP"],["critRate","CRITICAL RATE"],["critDamage","CRITICAL DAMAGE"]];
const BJOBS = ["Beginner","Warrior","Magician","Bowman","Thief"];
let bState = {br: 2, tb: "weapon"};

/* สเตตัสของตัวละครตามสูตรลง AP ของบิลด์ */
function bStats(L){
  const c = BUILD.stat, b = {...c.base};
  for (let lv = 2; lv <= L; lv++) { const p = c.phases.find(([f, t]) => lv >= f && lv <= t); if (p) for (const k in p[2]) b[k] += p[2][k]; }
  return b;
}
const bIt = n => BUILD.items[n];
const bIcon = (n, cls) => { const it = bIt(n); return it ? `<img class="${cls||""}" src="${it.ic}" alt="">` : ""; };
function bReqOk(it, L){ const s = bStats(L), t = it.st; return !(t.reqStr > s.str || t.reqDex > s.dex || t.reqInt > s.int || t.reqLuk > s.luk || t.reqFame); }
function bJobOk(it){ const j = it.st.reqJob; return !j || j.split("/").includes(BUILD.job || "Thief"); }
const BJOBKEY = {Magician:"Mage"};
const bMain = () => BUILD.main || ["dex","luk"];
const bMainText = s => bMain().map(k => `${k.toUpperCase()} ${s[k]}`).join(", ");
function bStatText(it, keys){
  const t = it.st, out = [];
  if (t.watk) out.push(`W.ATK ${t.watk}`);
  if (t.matk) out.push(`M.ATK ${t.matk}`);
  ["str","dex","int","luk"].forEach(k => { if (t[k]) out.push(`${k.toUpperCase()} +${t[k]}`); });
  if (t.wdef) out.push(`WDEF ${t.wdef}`);
  if (t.mdef && !t.wdef) out.push(`MDEF ${t.mdef}`);
  if (t.hp) out.push(`HP +${t.hp}`);
  if (t.mp) out.push(`MP +${t.mp}`);
  if (t.acc) out.push(`ACC +${t.acc}`);
  if (t.avoid) out.push(`Avoid +${t.avoid}`);
  if (t.speed) out.push(`Speed +${t.speed}`);
  if (t.critRate) out.push(`Crit +${t.critRate}`);
  if (t.critDamage) out.push(`Crit DMG +${t.critDamage}`);
  return out.join(", ");
}
function bReqText(it, L){
  const t = it.st, s = bStats(L), out = [];
  [["reqStr","STR","str"],["reqDex","DEX","dex"],["reqInt","INT","int"],["reqLuk","LUK","luk"]].forEach(([k,lab,sk]) => {
    if (t[k]) out.push(`<span class="${t[k] > s[sk] ? "bno" : ""}">${lab} ${t[k]}</span>`);
  });
  if (t.reqFame) out.push(`<span class="bno">Fame ${t.reqFame}</span>`);
  return out.length ? out.join(", ") : `<span class="mt">ไม่มี</span>`;
}
/* ช่วงเลเวลที่ของชิ้นนี้เป็นของหลักในบิลด์ */
function bUseRange(n){
  let lo = null, hi = null, alt = false;
  BUILD.br.forEach(b => [...Object.values(b.s), ...(b.ammo ? [{i: b.ammo.i, alt: b.ammo.alt || []}] : [])].forEach(s => {
    if (s.i === n) { lo = lo == null ? b.lv[0] : Math.min(lo, b.lv[0]); hi = hi == null ? b.lv[1] : Math.max(hi, b.lv[1]); }
    if (s.alt.includes(n)) alt = true;
  }));
  return {lo, hi, alt};
}
function bTipHTML(n, L, ctx){
  const it = bIt(n); if (!it) return "";
  const t = it.st, s = bStats(L);
  const rq = (lab, v, have) => `<div class="${v > have ? "no" : ""}">REQ ${lab} : ${v||0}</div>`;
  const jobs = BJOBS.map(j => {
    const ok = !t.reqJob ? true : (j !== "Beginner" && t.reqJob.split("/").includes(BJOBKEY[j] || j));
    return `<span class="${ok ? "on" : ""}">${j.toUpperCase()}</span>`;
  }).join("");
  const lines = [];
  lines.push(`<div>CATEGORY : ${it.sub.toUpperCase()}</div>`);
  if (t.attackSpeed) lines.push(`<div>ATTACK SPEED : ${(it.spd||"").toUpperCase()} (${t.attackSpeed})</div>`);
  BSTAT.forEach(([k, lab]) => { if (t[k]) lines.push(`<div>${lab} : ${["watk","matk","wdef","mdef"].includes(k) ? "" : "+"}${t[k]}</div>`); });
  if (t.slots != null) lines.push(`<div>NUMBER OF UPGRADES AVAILABLE : ${t.slots}</div>`);
  if (t.untradeable) lines.push(`<div class="gold">UNTRADEABLE</div>`);
  const ur = bUseRange(n);
  const use = ur.lo != null ? `ใช้ช่วง Lv.${ur.lo}–${ur.hi}` : ur.alt ? "ตัวเลือกอื่นของบิลด์นี้" : "";
  return `<div class="tt-name">${esc(n)}</div>
    ${ctx && ctx.isNew ? `<div class="tt-sub">ชิ้นใหม่ในช่วงนี้</div>` : ""}
    <div class="tt-top"><div class="tt-ic"><img src="${it.ic}" alt=""></div>
      <div class="tt-req"><div>REQ LEV : ${it.lv}</div>${rq("STR", t.reqStr, s.str)}${rq("DEX", t.reqDex, s.dex)}${rq("INT", t.reqInt, s.int)}${rq("LUK", t.reqLuk, s.luk)}${t.reqFame ? `<div class="no">REQ POP : ${t.reqFame}</div>` : ""}</div></div>
    <div class="tt-jobs">${jobs}</div>
    <div class="tt-stats">${lines.join("")}</div>
    <div class="tt-guide"><div class="tt-k">${bKinds(it)}</div>${it.src ? `<div>${esc(it.src)}</div>` : ""}${bPrice(n)}<div>${esc(it.note)}</div>${use ? `<div class="tt-use">${use}</div>` : ""}
    ${ctx && ctx.note ? `<div>${esc(ctx.note)}</div>` : ""}${ctx && ctx.alt && ctx.alt.length ? `<div><b>ตัวเลือกอื่น</b> ${ctx.alt.map(esc).join(", ")}</div>` : ""}
    <div class="tt-lv">เทียบกับสเตตัสตามบิลด์ที่ Lv.${L}: ${bMainText(s)}</div></div>`;
}
/* ---- tooltip ---- */
let bTipEl = null, bTipFor = null;
function bTipShow(el){
  if (!bTipEl) { bTipEl = document.createElement("div"); bTipEl.className = "gtip"; bTipEl.setAttribute("role", "tooltip"); bTipEl.id = "gtip"; document.body.appendChild(bTipEl); }
  const n = el.dataset.gi, L = +el.dataset.glv || (bIt(n) ? Math.max(bIt(n).lv, 1) : 1);
  let ctx = null;
  if (el.dataset.gslot != null) { const b = BUILD.br[bState.br], s = b.s[el.dataset.gslot]; ctx = s ? {note: s.note, alt: s.alt, isNew: el.classList.contains("new")} : null; }
  bTipEl.innerHTML = bTipHTML(n, L, ctx);
  bTipEl.hidden = false; bTipFor = el; el.setAttribute("aria-describedby", "gtip");
  const r = el.getBoundingClientRect(), w = bTipEl.offsetWidth, h = bTipEl.offsetHeight, vw = innerWidth, vh = innerHeight;
  let x = r.right + 10, y = r.top;
  if (x + w > vw - 8) x = r.left - w - 10;
  if (x < 8) { x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2)); y = r.bottom + 8; if (y + h > vh - 8) y = r.top - h - 8; }
  y = Math.max(8, Math.min(y, vh - h - 8));
  bTipEl.style.left = x + "px"; bTipEl.style.top = y + "px";
}
function bTipHide(){ if (bTipEl) bTipEl.hidden = true; if (bTipFor) bTipFor.removeAttribute("aria-describedby"); bTipFor = null; }
document.addEventListener("pointerover", e => { if (e.pointerType === "touch") return; const t = e.target.closest("[data-gi]"); if (t && t !== bTipFor) bTipShow(t); });
document.addEventListener("pointerout", e => { if (e.pointerType === "touch") return; const t = e.target.closest("[data-gi]"); if (t && !t.contains(e.relatedTarget)) bTipHide(); });
document.addEventListener("focusin", e => { const t = e.target.closest && e.target.closest("[data-gi]"); if (t) bTipShow(t); });
document.addEventListener("focusout", e => { const t = e.target.closest && e.target.closest("[data-gi]"); if (t) bTipHide(); });
document.addEventListener("click", e => {
  const t = e.target.closest("[data-gi]");
  if (t) { if (bTipFor === t && e.pointerType !== "mouse") bTipHide(); else bTipShow(t); return; }
  if (bTipFor && !e.target.closest(".gtip")) bTipHide();
  const bb = e.target.closest("[data-bbr]"); if (bb) { bState.br = +bb.dataset.bbr; renderGear(); return; }
  const tb = e.target.closest("[data-btb]"); if (tb) { bState.tb = tb.dataset.btb; renderBTable(); return; }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") bTipHide(); });
addEventListener("scroll", () => { if (bTipFor) bTipHide(); }, {passive: true});

/* ---- ชุดตามช่วงเลเวล ---- */
function gearWindow(b, prev){
  const cell = k => {
    if (!k) return `<div class="eqc blank" aria-hidden="true"></div>`;
    const s = b.s[k];
    if (!s) return `<div class="eqc empty" aria-hidden="true"><span>${BSLOT_EN[k]}</span></div>`;
    const isNew = !prev || !prev.s[k] || prev.s[k].i !== s.i;
    const L = Math.max(b.lv[0], bIt(s.i).lv);
    return `<button type="button" class="eqc it-slot${isNew ? " new" : ""}${s.opt ? " opt" : ""}" data-gi="${attr(s.i)}" data-glv="${L}" data-gslot="${k}" aria-label="${attr(BSLOT_TH[k] + ": " + s.i)}">
      <img src="${bIt(s.i).ic}" alt="">${isNew ? `<i class="eqnew" title="ชิ้นใหม่"></i>` : ""}${s.alt.length ? `<i class="equp" title="มีตัวเลือกอื่น">▲</i>` : ""}</button>`;
  };
  return `<div class="eqwin" aria-label="ช่องสวมใส่ช่วง Lv.${b.lv[0]}–${b.lv[1]}">
    <div class="eqtitle"><span>EQUIPMENT</span><span class="eqlv">Lv.${b.lv[0]}–${b.lv[1]}</span></div>
    <div class="eqtabs"><span class="on">Equip</span><span>Cash</span><span>Pet</span></div>
    <div class="eqgrid">${BSLOT.map(r => r.map(cell).join("")).join("")}</div>
    <div class="eqleg"><span><i class="eqnew st"></i>ชิ้นใหม่</span><span><i class="equp st">▲</i>มีตัวเลือกอื่น</span><span><i class="eqopt st"></i>ไม่บังคับ</span></div>
  </div>`;
}
function gearSide(b, prev){
  const s0 = bStats(b.lv[0]), TK = BUILD.tot || ["watk","luk","dex","wdef"], tot = {};
  TK.forEach(k => tot[k] = 0);
  Object.values(b.s).forEach(s => { const t = bIt(s.i).st; TK.forEach(k => tot[k] += t[k]||0); });
  const TL = {watk:"W.ATK", matk:"M.ATK", wdef:"WDEF", mdef:"MDEF"};
  const totText = TK.map(k => TL[k] ? `${TL[k]} ${tot[k]}` : (tot[k] ? `${k.toUpperCase()} +${tot[k]}` : "")).filter(Boolean).join(", ");
  const rows = BSLOT_ORDER.filter(k => b.s[k]).map(k => {
    const s = b.s[k], it = bIt(s.i), isNew = !prev || !prev.s[k] || prev.s[k].i !== s.i;
    const L = Math.max(b.lv[0], it.lv);
    return `<li class="gr${isNew ? " new" : ""}">
      <button type="button" class="gr-ic" data-gi="${attr(s.i)}" data-glv="${L}" data-gslot="${k}" aria-label="${attr(s.i)}"><img src="${it.ic}" alt=""></button>
      <div class="gr-tx"><div class="gr-h"><span class="gr-slot">${BSLOT_TH[k]}</span><b>${esc(s.i)}</b>${isNew ? `<span class="gchip new">ใหม่</span>` : `<span class="gchip keep">ใช้ต่อ</span>`}${s.opt ? `<span class="gchip opt">ไม่บังคับ</span>` : ""}</div>
        <div class="gr-m">${bKinds(it)} Lv.${it.lv}, ${bStatText(it)}</div>
        ${s.note ? `<div class="gr-note">${esc(s.note)}</div>` : ""}
        <div class="gr-price">${bPrice(s.i)}</div>
      </div></li>
      ${s.alt.map(a => { const ai = bIt(a); return `<li class="gr alt">
        <button type="button" class="gr-ic" data-gi="${attr(a)}" data-glv="${Math.max(b.lv[0], ai.lv)}" aria-label="${attr(a)}"><img src="${ai.ic}" alt=""></button>
        <div class="gr-tx"><div class="gr-h"><span class="gchip alt">ตัวเลือกอื่น ${BSLOT_TH[k]}</span><b>${esc(a)}</b></div>
          <div class="gr-m">${bKinds(ai)} Lv.${ai.lv}, ${bStatText(ai)}</div>
          ${ai.src ? `<div class="gr-note">${esc(ai.src)}</div>` : ""}
          <div class="gr-note">${esc(ai.note)}</div>
          <div class="gr-price">${bPrice(a)}</div>
        </div></li>`; }).join("")}`;
  }).join("");
  const ammoRow = b.ammo ? (() => { const a = b.ammo, it = bIt(a.i), isNew = !prev || !prev.ammo || prev.ammo.i !== a.i;
    return `<li class="gr${isNew ? " new" : ""}">
      <button type="button" class="gr-ic" data-gi="${attr(a.i)}" data-glv="${b.lv[0]}" aria-label="${attr(a.i)}"><img src="${it.ic}" alt=""></button>
      <div class="gr-tx"><div class="gr-h"><span class="gr-slot">${BUILD.ammoLabel || "ดาว"}</span><b>${esc(a.i)}</b>${isNew ? `<span class="gchip new">ใหม่</span>` : `<span class="gchip keep">ใช้ต่อ</span>`}</div>
        <div class="gr-m">${bKinds(it)} ${bStatText(it)}</div>
        ${a.note ? `<div class="gr-note">${esc(a.note)}</div>` : ""}
        <div class="gr-price">${bPrice(a.i)}</div>
      </div></li>
      ${(a.alt||[]).map(x => { const ai = bIt(x); return `<li class="gr alt">
        <button type="button" class="gr-ic" data-gi="${attr(x)}" data-glv="${b.lv[0]}" aria-label="${attr(x)}"><img src="${ai.ic}" alt=""></button>
        <div class="gr-tx"><div class="gr-h"><span class="gchip alt">ตัวเลือกอื่น ${BUILD.ammoLabel || "ดาว"}</span><b>${esc(x)}</b></div>
          <div class="gr-m">${bKinds(ai)} ${bStatText(ai)}</div>
          ${ai.src ? `<div class="gr-note">${esc(ai.src)}</div>` : ""}
          <div class="gr-note">${esc(ai.note)}</div>
          <div class="gr-price">${bPrice(x)}</div>
        </div></li>`; }).join("")}`; })() : "";
  return `<div class="gside">
    <div class="gs-h"><span class="lv">Lv.${b.lv[0]}–${b.lv[1]}</span><span class="gs-job">${b.job}</span></div>
    <p class="gs-head">${esc(b.head)}</p>
    <p class="onote">${esc(b.tip)}</p>
    <div class="gtot"><div><span>สเตตัสต้นช่วง</span><b>${bMainText(s0)}</b></div><div><span>จากชุดหลัก</span><b>${totText}</b></div></div>
    <ul class="glist">${ammoRow}${rows}</ul>
  </div>`;
}
function renderGear(){
  const box = $("bgear"); if (!box) return;
  const b = BUILD.br[bState.br], prev = BUILD.br[bState.br - 1];
  box.innerHTML = `<div class="bbar" role="tablist" aria-label="เลือกช่วงเลเวล">${BUILD.br.map((x, i) => `<button type="button" role="tab" class="bbtn" data-bbr="${i}" aria-selected="${i === bState.br}"><b>Lv.${x.lv[0]}–${x.lv[1]}</b><small>${x.job}</small></button>`).join("")}</div>
    <div class="gwrap">${gearWindow(b, prev)}${gearSide(b, prev)}</div>`;
  bTipHide();
}
/* ---- ตารางของ ---- */
function renderBTable(){
  const box = $("btable"); if (!box) return;
  const tb = BUILD.tables.find(t => t.k === bState.tb) || BUILD.tables[0];
  const rows = tb.items.map(n => {
    const it = bIt(n), ur = bUseRange(n), L = Math.max(it.lv, 1);
    let st;
    if (it.k.includes("none")) st = `<span class="bst gray">ยังหาไม่ได้</span>`;
    else if (!bJobOk(it) || it.st.reqStr || it.st.reqFame || !bReqOk(it, L) && ur.lo == null) st = `<span class="bst red">ใส่ไม่ได้</span>`;
    else if (ur.lo != null) st = `<span class="bst green">ใช้ Lv.${ur.lo}–${ur.hi}</span>`;
    else if (ur.alt) st = `<span class="bst amber">ทางเลือก</span>`;
    else st = `<span class="bst gray">ไม่จำเป็น</span>`;
    return `<tr><td><button type="button" class="bname" data-gi="${attr(n)}" data-glv="${L}"><img src="${it.ic}" alt="">${esc(n)}</button></td>
      <td class="num">${it.lv || "—"}</td><td>${bStatText(it)}</td><td>${bReqText(it, L)}</td><td>${bKinds(it)}${it.src ? `<div class="bnote">${esc(it.src)}</div>` : ""}</td><td class="bprice">${bPrice(n) || `<span class="mt">—</span>`}</td><td>${st}<div class="bnote">${esc(it.note)}</div></td></tr>`;
  }).join("");
  box.innerHTML = `<div class="bchips" role="tablist" aria-label="หมวดของ">${BUILD.tables.map(t => `<button type="button" role="tab" class="mkchip" data-btb="${t.k}" aria-pressed="${t.k === tb.k}">${t.t} (${t.items.length})</button>`).join("")}</div>
    <div class="btbl"><table><thead><tr><th>ไอเทม</th><th>Lv</th><th>สเตตัสที่ได้</th><th>ต้องมี</th><th>ได้จาก</th><th>ราคา</th><th>ในบิลด์นี้</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="onote">ค่าที่ต้องมีสีแดงคือค่าที่บิลด์นี้ยังไม่ถึงตอนเลเวลของไอเทม ชี้หรือแตะชื่อไอเทมเพื่อดูรายละเอียดแบบในเกม</p>`;
  bTipHide();
}
/* ---- SP timeline ---- */
function spTimeline(){
  const A = 10, Z = 50, N = Z - A + 1, pct = v => (v / N * 100).toFixed(3) + "%";
  const ticks = [10, 20, 30, 40, 50].map(v => `<span class="tk" style="left:${pct(v - A + .5)}">${v}</span>`).join("");
  const rows = BUILD.sp.map(r => `<div class="spr"><div class="spn"><b>${esc(r.n)}</b><small>${esc(r.d)}</small></div>
    <div class="spt">${BUILD.jobLines.map(j => `<span class="spj" style="left:${pct(j.lv - A)}"></span>`).join("")}${r.seg.map(([f, t, p]) => `<span class="spb" style="left:${pct(f - A)};width:${pct(t - f + 1)}" title="Lv.${f}${t !== f ? "–" + t : ""}: ลงถึง ${p}"><em>${p}</em></span>`).join("")}</div></div>`).join("");
  return `<div class="spwrap"><div class="spgrid">
    <div class="spr sph"><div class="spn"></div><div class="spt axis">${ticks}${BUILD.jobLines.map(j => `<span class="spjl" style="left:${pct(j.lv - A)}">${j.t}</span>`).join("")}</div></div>
    ${rows}</div></div>`;
}
/* ---- AP table ---- */
function apTable(){
  const M = bMain();
  return `<div class="btbl"><table class="aptbl"><thead><tr><th>เลเวล</th>${M.map(k => `<th>${k.toUpperCase()}</th>`).join("")}<th>${BUILD.wlabel || "อาวุธ"}</th><th>ต้องมี</th><th>ได้จาก</th><th>ราคา</th></tr></thead><tbody>
  ${BUILD.apRows.map(([L, n, alt]) => { const s = bStats(L), it = bIt(n);
    return `<tr class="${alt ? "altrow" : ""}"><td class="num">Lv.${L}</td>${M.map(k => `<td class="num">${s[k]}</td>`).join("")}
    <td><div class="bnr"><button type="button" class="bname" data-gi="${attr(n)}" data-glv="${L}"><img src="${it.ic}" alt="">${esc(n)}</button>${alt ? `<span class="bst amber">ทางเลือก</span>` : `<span class="bst green">หลัก</span>`}</div><div class="bnote">${esc(it.note)}</div></td>
    <td>${bReqText(it, L)}</td><td>${bKinds(it)}${it.src ? `<div class="bnote">${esc(it.src)}</div>` : ""}</td><td class="bprice">${bPrice(n) || `<span class="mt">—</span>`}</td></tr>`; }).join("")}
  </tbody></table></div>`;
}
function buildsHTML(){
  const B = BUILD.text;
  return `<div class="card intro-hero">
    <p class="mt">Builds: ${BUILD.cls}</p>
    <h2>${B.title}</h2>
    <p>${B.lead}</p>
    <div class="hero-grid">${B.summary.map(([h, p]) => `<div><h3>${h}</h3><p>${p}</p></div>`).join("")}</div>
    <nav class="toc">${[["b-ap","ลง AP"],["b-sp","ลง SP"],["b-gear","ชุดตามช่วงเลเวล"],["b-legend","ป้ายและราคา"],["b-table","ตารางของทั้งหมด"]].map(([id, t]) => `<a href="#${id}" data-jump="${id}">${t}</a>`).join("")}</nav>
  </div>

  <section id="b-ap" class="osec"><h2>หลักการลง AP</h2>
    <div class="card band pad">
      <div class="apflow">${B.apFlow.map(([lv, txt]) => `<div class="apstep"><span class="lv">${lv}</span><p>${txt}</p></div>`).join("")}</div>
      <ul class="olist">${B.apRules.map(x => `<li>${ico(x)}</li>`).join("")}</ul>
    </div>
    <h3 class="sub-h">สเตตัสตามเลเวลถ้าลงตามบิลด์</h3>
    <div class="card band">${apTable()}</div>
    <p class="onote">${B.apNote}</p>
    ${B.apAlt ? `<div class="card band pad altplan"><h3>${B.apAlt.t}</h3>${B.apAlt.p.map(x => `<p>${ico(x)}</p>`).join("")}</div>` : ""}
    <h3 class="sub-h">สร้างตัวละคร</h3>
    <ol class="steps">${B.create.map(x => `<li>${ico(x)}</li>`).join("")}</ol>
  </section>

  <section id="b-sp" class="osec"><h2>หลักการลง SP</h2>
    <div class="card band pad"><ul class="olist">${B.spRules.map(x => `<li>${ico(x)}</li>`).join("")}</ul></div>
    <h3 class="sub-h">ลำดับลงสกิลตามเลเวล</h3>
    <div class="card band pad">${spTimeline()}<p class="onote">ตัวเลขในแถบคือแต้มสกิลรวมเมื่อจบช่วงนั้น เส้นแนวตั้งคือเลเวลที่เปลี่ยนอาชีพ ลำดับแบบเลเวลต่อเลเวลอยู่ในช่อง SP ของแต่ละขั้นใน route</p></div>
    ${(B.spTables || []).map(t => `<h3 class="sub-h">${t.t}</h3>
    <div class="card band"><div class="prow phead c3">${t.head.map(h => `<div class="pc">${h}</div>`).join("")}</div>
      ${t.rows.map(r => `<div class="prow c3">${r.map((c, i) => `<div class="pc${i === 0 ? " pc0" : ""}">${ico(c)}</div>`).join("")}</div>`).join("")}</div>
    ${(t.notes || []).map(x => `<p class="onote">${x}</p>`).join("")}`).join("")}
  </section>

  <section id="b-gear" class="osec"><h2>ชุดตามช่วงเลเวล</h2>
    <p class="onote">เลือกช่วงเลเวลด้านล่าง ช่องสวมใส่จะแสดงชุดหลักที่ควรมีในช่วงนั้น ชี้หรือแตะไอเทมเพื่อดูรายละเอียดแบบในเกม ค่าที่ต้องมีสีแดงคือค่าที่ตัวละครยังไม่ถึงถ้าลงสเตตัสตามบิลด์ ความหมายของป้ายและราคาอยู่ในหัวข้อถัดไป</p>
    ${B.gearNotes ? `<div class="card band pad"><ul class="olist">${B.gearNotes.map(x => `<li>${ico(x)}</li>`).join("")}</ul></div>` : ""}
    <div id="bgear"></div>
  </section>

  <section id="b-legend" class="osec"><h2>ป้ายและราคาหมายถึงอะไร</h2>
    <div class="card band pad">
      <div class="lgrid">
        <div><span class="gk start">เกมให้</span><p>ได้อัตโนมัติตอนสร้างตัวละครหรือตอนเปลี่ยนอาชีพ</p></div>
        <div><span class="gk buy">ร้าน NPC</span><p>ซื้อจากร้าน NPC ได้แน่นอน ราคาตายตัวตามที่อ่านจากเกมตอนเปิดเซิร์ฟ ถ้ามีหลายร้านจะแสดงร้านที่ถูกที่สุด</p></div>
        <div><span class="gk drop">ดรอป</span><p>มีโอกาสดรอปจากมอนที่ route พาไปตี ไม่การันตีว่าจะได้ คำว่า “ยืนยัน 3 คน” หมายถึงมีผู้เล่น 3 คนรายงานว่าเคยได้ดรอปนี้ใน Classic</p></div>
        <div><span class="gk quest">เควส</span><p>รางวัลจากเควสใน route ทำเควสครบได้แน่นอน ยกเว้นเควสที่สุ่มรางวัล ซึ่งจะเขียนบอกไว้</p></div>
        <div><span class="gk craft">คราฟต์</span><p>ทำเองด้วย Life Skill ต้องมีวัตถุดิบและเลเวลของสายนั้นตามที่กำหนด</p></div>
        <div><span class="gk none">ยังหาไม่ได้</span><p>ยังไม่มีแหล่งได้ใน Classic ตอนนี้</p></div>
      </div>
      <h3 class="sub-h">ราคา</h3>
      <ul class="olist">
        <li><b>ร้าน NPC</b> คือราคาซื้อจากร้าน NPC ซึ่งแน่นอน</li>
        <li><b>ผู้เล่นขายประมาณ</b> มาจากชุดข้อมูลเดียวกับ<button type="button" class="linkbtn" data-tab="money"><b>แท็บหาเงิน</b></button> คือราคาที่ผู้เล่นรายงานบน MeowDB ย้อนหลัง 14 วัน สำหรับของที่ยังไม่ตีม้วน อัปเดตวันละครั้ง ข้อมูลล่าสุดเมื่อ ${mktDate()}</li>
        <li>ราคาผู้เล่น<b>เป็นแค่การประมาณจากข้อมูลที่มี</b> ราคาซื้อขายจริงใน Free Market อาจถูกหรือแพงกว่านี้ ของที่มีรายงานน้อยจะขึ้นว่า “ข้อมูลน้อย” ให้เช็กราคาในเกมหรือบน MesoWatch ก่อนซื้อเสมอ</li>
        <li>ของที่ได้จากเควสหรือเกมให้อย่างเดียวจะไม่แสดงราคา เพราะทำเควสตาม route ก็ได้อยู่แล้ว</li>
      </ul>
    </div>
  </section>

  <section id="b-table" class="osec"><h2>ตารางของทั้งหมด</h2>
    <div id="btable"></div>
  </section>
  <p class="credit">ข้อมูลสเตตัสไอเทมและไอคอนจาก <a href="https://meowdb.com/msclassic/item-db/equipment" target="_blank" rel="noopener">NiaMeowDB</a>, ภาพจากเกม © Nexon</p>`;
}
