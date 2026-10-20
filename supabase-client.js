// Shared Supabase client used by every page.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './auth-config.js?v=8a90f44ccf';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
export const GUIDES = {
  bandit: 'Pure Bandit',
  sindit: 'Sindit (ปาดาว → โจรมีด)',
  assassin: 'Assassin',
  mage: 'Ice / Lightning Mage',
  fp: 'Fire / Poison Mage',
  cleric: 'Cleric',
  fighter: 'Fighter',
  page: 'Page',
  spearman: 'Spearman'
};
// Sindit is sold on its own (guide_sindit) and stays free for anyone who owns the Bandit guide.
export function guideProduct(id) {
  return 'guide_' + id;
}
export function hasGuide(account, id) {
  return Boolean(
    account?.is_admin ||
    account?.entitlements?.some(
      e =>
        (e.product === guideProduct(id) || (id === 'sindit' && e.product === 'guide_bandit')) &&
        (!e.expires_at || new Date(e.expires_at).getTime() > Date.now())
    )
  );
}
export async function readAccount() {
  const { data, error } = await supabase.rpc('sync_account');
  if (error) throw error;
  return data;
}
