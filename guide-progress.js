import { supabase } from './supabase-client.js?v=ffa6b49ed5';
export async function readProgress() {
  const { data, error } = await supabase.rpc('my_guide_progress');
  if (error) throw error;
  return data || [];
}
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
// Runs inside the private guide document. Existing maps, checkboxes and route navigation stay intact.
export function attachProgress(html, { userId, guide, initial, token }) {
  const key = 'maplethai:guide:' + userId + ':' + guide;
  const original =
    /const KEY\s*=\s*["'](?:pure-bandit|sindit|assassin|il-mage|fp-mage|cleric|fighter|page|spearman)-route-v1["'];/;
  if (!original.test(html)) return { html, supported: false };
  html = html.replace(original, () => 'const KEY = ' + json(key) + ';');
  if (initial) html = html.replace(/localStorage\.getItem\(KEY\)/, () => json(JSON.stringify(initial)));
  const bridge = `<script>(()=>{
 const token=${json(token)},origin=${json(location.origin)};
 const emit=()=>{const i=Math.max(0,Math.min(S.length-1,state.i));const step=S[i];parent.postMessage({type:'maplethai-progress',token,state:JSON.parse(JSON.stringify(state)),label:('Lv.'+step.lv+' · '+step.title).slice(0,160),completed:S.filter((_,k)=>stepDone(k)).length,total:S.length},origin)};
 const originalSave=save;save=function(){originalSave();emit()};
 addEventListener('load',emit,{once:true});
 })();</script>`;
  return { html: html.replace(/<\/body>/i, () => bridge + '</body>'), supported: true };
}
export function createProgressSaver({ userId, guide, version = 0, onStatus }) {
  const key = 'maplethai:pending:' + userId + ':' + guide;
  let latest = null,
    running = false,
    stopped = false,
    timer;
  const store = () => {
    try {
      if (latest) localStorage.setItem(key, JSON.stringify({ version, ...latest }));
      else localStorage.removeItem(key);
    } catch {}
  };
  async function flush() {
    clearTimeout(timer);
    if (running || stopped || !latest) return;
    running = true;
    const snapshot = latest;
    onStatus('saving');
    try {
      const { data, error } = await supabase.rpc('save_guide_progress', {
        p_guide: guide,
        p_state: snapshot.state,
        p_label: snapshot.label,
        p_completed: snapshot.completed,
        p_total: snapshot.total,
        p_version: version
      });
      if (stopped) return;
      if (error) throw error;
      if (data?.conflict) {
        stopped = true;
        onStatus('conflict');
        return;
      }
      if (!Number.isInteger(data?.version)) throw Error('Invalid save response');
      version = data.version;
      if (latest === snapshot) latest = null;
      store();
      onStatus(latest ? 'saving' : 'saved');
    } catch {
      if (!stopped) onStatus('error');
    } finally {
      running = false;
      if (!stopped && latest !== snapshot && latest) timer = setTimeout(flush, 250);
    }
  }
  return {
    push(value) {
      if (stopped) return;
      latest = value;
      store();
      onStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(flush, 600);
    },
    flush,
    stop() {
      stopped = true;
      clearTimeout(timer);
    }
  };
}
export function pendingProgress(userId, guide) {
  try {
    return JSON.parse(localStorage.getItem('maplethai:pending:' + userId + ':' + guide) || 'null');
  } catch {
    return null;
  }
}
