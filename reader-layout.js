const viewer=document.getElementById('viewer');
const bar=document.createElement('div');bar.className='reader-toolbar';bar.hidden=true;
const label=document.createElement('span');label.textContent='โหมดอ่าน';
const button=document.createElement('button');button.type='button';button.setAttribute('aria-controls','viewer');
bar.append(label,button);viewer.before(bar);
function setFocus(on){document.body.classList.toggle('reader-focus',on);button.textContent=on?'กลับหน้าปกติ':'ขยายพื้นที่อ่าน';button.setAttribute('aria-pressed',String(on))}
button.addEventListener('click',()=>setFocus(!document.body.classList.contains('reader-focus')));
let first=true;
function update(){bar.hidden=viewer.hidden;if(viewer.hidden){setFocus(false);return}if(first){first=false;setFocus(matchMedia('(max-width:700px)').matches)}}
new MutationObserver(update).observe(viewer,{attributes:true,attributeFilter:['hidden']});update();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('reader-focus'))setFocus(false)});
