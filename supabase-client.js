import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './auth-config.js?v=8a90f44ccf';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
export const GUIDES = {
  bandit: 'Pure Bandit',
  assassin: 'Assassin',
  mage: 'Ice / Lightning Mage',
  fighter: 'Fighter',
  page: 'Page',
  spearman: 'Spearman'
};
export function hasGuide(account, id) {
  return Boolean(
    account?.is_admin ||
    account?.entitlements?.some(
      e => e.product === 'guide_' + id && (!e.expires_at || new Date(e.expires_at).getTime() > Date.now())
    )
  );
}
export async function readAccount() {
  const { data, error } = await supabase.rpc('sync_account');
  if (error) throw error;
  return data;
}
