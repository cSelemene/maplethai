export function selectWatchlist(rows, { now = Date.now(), limit = 6 } = {}) {
  const active = rows.filter(
    r =>
      r.status === 'open' &&
      r.price_unit === 'meso' &&
      ['buy', 'sell'].includes(r.kind) &&
      new Date(r.expires_at).getTime() > now &&
      Number.isFinite(Number(r.price)) &&
      Number(r.price) > 0
  );
  const groups = new Map();
  for (const row of active) {
    const key =
      row.kind +
      ':' +
      (row.item_id
        ? 'id:' + row.item_id
        : 'name:' +
          String(row.item_name || '')
            .trim()
            .toLowerCase());
    if (!String(row.item_name || '').trim()) continue;
    if (!groups.has(key)) groups.set(key, { rows: [], people: new Set() });
    const group = groups.get(key);
    group.rows.push(row);
    // Admin-posted Discord listings share one user_id; count the Discord player instead.
    const person = row.discord_user ? 'discord:' + row.discord_user : row.user_id;
    if (person) group.people.add(person);
  }
  const ranked = [...groups.values()]
    .map(g => {
      g.rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || Number(b.id) - Number(a.id));
      return { row: g.rows[0], people: g.people.size, count: g.rows.length };
    })
    .sort(
      (a, b) =>
        b.people - a.people ||
        new Date(b.row.created_at) - new Date(a.row.created_at) ||
        b.count - a.count ||
        Number(b.row.id) - Number(a.row.id)
    );
  const chosen = [];
  for (const kind of ['sell', 'buy']) {
    const match = ranked.find(g => g.row.kind === kind);
    if (match && !chosen.includes(match)) chosen.push(match);
  }
  for (const g of ranked) {
    if (chosen.length >= limit) break;
    if (!chosen.includes(g)) chosen.push(g);
  }
  return chosen.slice(0, limit);
}
