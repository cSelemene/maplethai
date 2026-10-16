// Metadata is used only for presentation; permissions still come from the server.
export function renderProfile(target, user) {
  const meta = user.user_metadata || {};
  const name = String(meta.full_name || meta.name || 'ผู้เล่น MapleThai').trim();
  const avatar = document.createElement('span');
  avatar.className = 'profile-avatar';
  avatar.textContent = Array.from(name)[0]?.toUpperCase() || 'M';
  const source = meta.avatar_url || meta.picture;
  try {
    const url = new URL(source);
    if (url.protocol === 'https:') {
      const img = document.createElement('img');
      img.src = url.href;
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => img.remove(), { once: true });
      avatar.append(img);
    }
  } catch {}
  const label = document.createElement('span');
  label.className = 'profile-name';
  label.textContent = name;
  target.replaceChildren(avatar, label);
}
