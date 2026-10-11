import {QUESTIONS,rankClasses} from './class-quiz-data.js?v=20261011-quiz';
const root=document.getElementById('class-quiz');
if(root){
 const intro=root.querySelector('[data-quiz-intro]'),stage=root.querySelector('[data-quiz-stage]'),results=root.querySelector('[data-quiz-results]');
 let current=0,answers=Array(QUESTIONS.length).fill(null);
 const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;};
 function showQuestion(focus=true){
  intro.hidden=true;results.hidden=true;stage.hidden=false;stage.replaceChildren();
  const meta=make('div','quiz-meta');meta.append(make('span','','ข้อ '+(current+1)+' จาก '+QUESTIONS.length),make('span','','เลือกคำตอบที่ตรงกับคุณที่สุด'));
  const progress=make('div','quiz-progress');progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','ความคืบหน้าแบบทดสอบ');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',String(QUESTIONS.length));progress.setAttribute('aria-valuenow',String(current));const fill=make('span');fill.style.width=(current/QUESTIONS.length*100)+'%';progress.append(fill);
  const form=make('form','quiz-form'),fieldset=make('fieldset'),legend=make('legend','',QUESTIONS[current].title);legend.tabIndex=-1;fieldset.append(legend);
  if(QUESTIONS[current].hint)fieldset.append(make('p','quiz-hint',QUESTIONS[current].hint));
  const options=make('div','quiz-options');
  QUESTIONS[current].options.forEach((option,index)=>{const label=make('label','quiz-option'),input=make('input');input.type='radio';input.name='quiz-answer';input.value=String(index);input.required=true;input.checked=answers[current]===index;label.append(input,make('span','',option.text));input.addEventListener('change',()=>{answers[current]=index;next.disabled=false;});options.append(label);});fieldset.append(options);
  const actions=make('div','quiz-actions'),back=make('button','quiz-secondary',current?'ย้อนกลับ':'กลับไปเริ่ม');back.type='button';back.addEventListener('click',()=>{if(current){current--;showQuestion();}else{stage.hidden=true;intro.hidden=false;root.querySelector('[data-quiz-start]').focus();}});
  const next=make('button','quiz-primary',current===QUESTIONS.length-1?'ดูอาชีพที่เข้ากับคุณ':'ข้อถัดไป');next.type='submit';next.disabled=answers[current]===null;actions.append(back,next);form.append(fieldset,actions);
  form.addEventListener('submit',event=>{event.preventDefault();if(answers[current]===null)return;if(current===QUESTIONS.length-1)showResults();else{current++;showQuestion();}});
  stage.append(meta,progress,form);if(focus)legend.focus();
 }
 function resultCard(job,index){
  const card=make('article','quiz-result-card');card.dataset.class=job.id;
  const head=make('div','quiz-result-head');head.append(make('span','quiz-family',job.family),make('span','quiz-rank',index===0?'ลองเริ่มจากสายนี้':'อีกสายที่น่าลอง'));
  card.append(head,make('h3','',job.name),make('p','quiz-job-name',job.thai),make('p','quiz-summary',job.summary));
  const reasons=make('ul','quiz-reasons');job.reasons.forEach(reason=>reasons.append(make('li','',reason)));card.append(reasons);
  const strong=make('div','quiz-detail');strong.append(make('h4','','จุดเด่น'),make('p','',job.strength));const weak=make('div','quiz-detail');weak.append(make('h4','','ข้อที่ต้องยอมรับ'),make('p','',job.tradeoff));card.append(strong,weak);
  const links=make('div','quiz-result-links');const source=make('a','quiz-source-link','ดูสกิลและข้อมูลอาชีพ');source.href='https://meowdb.com/msclassic/classes/'+job.source;source.target='_blank';source.rel='noopener noreferrer';links.append(source);
  if(job.guide){const guide=make('a','quiz-guide-link',job.id==='bandit'?'ดูไกด์ Pure Bandit':'ดูไกด์ '+job.name);guide.href='./guide-preview.html?guide='+job.guide;links.append(guide);}else links.append(make('span','quiz-unavailable','อาชีพนี้ยังไม่มีไกด์บน MapleThai'));
  card.append(links);return card;
 }
 function showResults(){
  const ranked=rankClasses(answers);stage.hidden=true;intro.hidden=true;results.hidden=false;results.replaceChildren();
  const heading=make('h3','quiz-result-title','สามสายที่น่าลองจากคำตอบของคุณ');heading.tabIndex=-1;
  results.append(heading,make('p','quiz-hint','จับคู่จากแนวเล่นที่คุณชอบ ไม่ใช่อันดับว่าอาชีพไหนเก่งที่สุด'));
  const tied=ranked[0].score===ranked[1].score;if(tied)results.append(make('p','quiz-tie-note','คำตอบเข้ากับหลายสายพอ ๆ กัน ลองเทียบจุดเด่นและข้อแลกเปลี่ยนก่อนเลือก'));
  const cards=make('div','quiz-results-grid');ranked.slice(0,3).forEach((job,index)=>cards.append(resultCard(job,tied?1:index)));results.append(cards);
  const actions=make('div','quiz-actions');const again=make('button','quiz-secondary','ลองตอบใหม่');again.type='button';again.addEventListener('click',()=>{answers=Array(QUESTIONS.length).fill(null);current=0;showQuestion();});const guides=make('a','quiz-source-link','ดูไกด์ที่มีทั้งหมด');guides.href='#guides';actions.append(again,guides);results.append(actions);heading.focus();
 }
 root.querySelector('[data-quiz-start]').addEventListener('click',()=>showQuestion());
}
