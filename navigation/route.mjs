export function route(maps, start, end, scrollTown = null) {
  const byId = new Map(maps.map(m => [m.id, m]));
  if (!byId.has(start) || !byId.has(end)) return null;
  const queue = [{ id: start, steps: [] }],
    seen = new Set([start]);
  while (queue.length) {
    const current = queue.shift();
    if (current.id === end) return current.steps;
    const map = byId.get(current.id);
    const edges = (map.portals || [])
      .filter(p => byId.has(p.toMapId) && p.toMapId !== map.id)
      .map(p => ({ from: map.id, to: p.toMapId, kind: 'portal', portal: p }));
    // Scroll rules are experimental and opt-in. Maps with unknown/nonzero restrictions are excluded.
    if (
      scrollTown &&
      current.id === start &&
      map.fieldLimit === 0 &&
      byId.get(scrollTown)?.isTown &&
      scrollTown !== start
    )
      edges.push({ from: start, to: scrollTown, kind: 'scroll' });
    for (const e of edges)
      if (!seen.has(e.to)) {
        seen.add(e.to);
        queue.push({ id: e.to, steps: [...current.steps, e] });
      }
  }
  return null;
}
export function search(maps, type, query) {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  return maps.filter(m =>
    type === 'map'
      ? m.name.toLocaleLowerCase().includes(q)
      : (m[type === 'npc' ? 'npcs' : 'monsters'] || []).some(v =>
          (v.name || v.displayName || '').toLocaleLowerCase().includes(q)
        )
  );
}

export const scrolls = [
  { to: '010000000', item: 280, price: 500 },
  { to: '010002000', item: 281, price: 500 },
  { to: '010004000', item: 282, price: 500 },
  { to: '010001000', item: 283, price: 500 },
  { to: '010003000', item: 284, price: 500 },
  { to: '010005000', item: 285, price: 600 },
  { to: '010006000', item: 286, price: 800 }
];
export function recommendations(maps, start, end) {
  const walk = route(maps, start, end),
    origin = maps.find(m => m.id === start);
  let shortcut = null;
  if (origin?.region === 'VictoriaIsland' && origin.fieldLimit === 0) {
    for (const item of scrolls) {
      const town = maps.find(m => m.id === item.to);
      if (!town || town.id === start) continue;
      const tail = route(maps, town.id, end);
      if (tail === null) continue;
      const steps = [{ from: start, to: town.id, kind: 'scroll', item }, ...tail];
      if (
        (walk === null || steps.length < walk.length) &&
        (!shortcut ||
          steps.length < shortcut.steps.length ||
          (steps.length === shortcut.steps.length && item.price < shortcut.item.price))
      )
        shortcut = { steps, item };
    }
  }
  return { walk, shortcut };
}
export function arrival(map, previous) {
  if (!previous || previous.kind !== 'portal') return { point: null, confirmed: false };
  const exact = previous.portal.toName || previous.portal.targetName;
  if (exact) {
    const p = (map.portals || []).find(p => p.name === exact);
    if (p) return { point: p, confirmed: true };
  }
  const back = (map.portals || []).filter(p => p.toMapId === previous.from);
  return { point: back.length === 1 ? back[0] : null, confirmed: false };
}
export function suggestions(maps, type, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const items =
    type === 'map'
      ? maps.map(m => ({ name: m.name, id: m.id }))
      : maps.flatMap(m =>
          (m[type === 'npc' ? 'npcs' : 'monsters'] || []).map(v => ({
            name: v.name || v.displayName,
            id: v.id
          }))
        );
  const unique = [
    ...new Map(
      items.filter(v => v.name?.toLowerCase().includes(q)).map(v => [type === 'map' ? v.id : v.name, v])
    ).values()
  ];
  return unique
    .sort(
      (a, b) =>
        Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)) ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 12);
}
