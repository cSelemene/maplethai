import { supabase, readAccount, hasGuide, GUIDES } from '../supabase-client.js?v=2b187ad0f8';
let bundlePromise = null,
  userId = null,
  invalid = false;
const callbacks = [];
export function onAccessChange(fn) {
  callbacks.push(fn);
}
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || (userId && session?.user?.id !== userId)) {
    invalid = true;
    bundlePromise = null;
    callbacks.forEach(fn => fn());
  }
});
export function getBundle() {
  if (invalid) return Promise.reject(Error('access changed'));
  if (!bundlePromise)
    bundlePromise = (async () => {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();
      if (error || !user) throw Error('login required');
      userId = user.id;
      const account = await readAccount();
      const requested = new URLSearchParams(location.search).get('guide');
      const guide = Object.hasOwn(GUIDES, requested || '')
        ? requested
        : Object.keys(GUIDES).find(g => hasGuide(account, g));
      if (!guide || !hasGuide(account, guide)) throw Error('guide required');
      const result = await supabase.rpc('get_navigation', { p_guide: guide });
      if (result.error || !result.data || invalid) throw Error('access denied');
      return result.data;
    })();
  return bundlePromise;
}
