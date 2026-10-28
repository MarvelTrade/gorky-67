// Поиск ближайшего живого врага в радиусе. Линейный проход —
// на 300 врагов это дешевле любой пространственной структуры.
// exclude — необязательный Set уже выбранных целей.
export function findNearest(group, x, y, range, exclude) {
  let best = null;
  let bestD2 = range * range;
  const list = group.getChildren();
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e.active || (exclude && exclude.has(e))) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = e;
    }
  }
  return best;
}

// Живой босс в радиусе — или null. Нужен, чтобы оружие не тратило весь огонь
// на толпу вокруг: замер показал, что иначе «Объект» не получает урона вовсе.
export function bossInRange(scene, x, y, range) {
  const b = scene.boss;
  if (!b || !b.active) return null;
  return Math.hypot(b.x - x, b.y - y) <= range ? b : null;
}
