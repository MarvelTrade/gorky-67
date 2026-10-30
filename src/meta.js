import { HANGAR, HELI, LIVERIES, GEAR } from './config.js';
import { platform } from './platform/platform.js';

// Всё, что живёт между забегами: кошелёк, улучшения «Ангара», опыт вертолёта, окраска и снаряжение.
// Хранится в том же сохранении, что и рекорд (облако Яндекса или localStorage).
export const meta = { money: 0, parts: 0, levels: {}, heliXp: 0, livery: 'olive', gear: [], runs: 0 };

export async function loadMeta() {
  const m = (await platform.loadProgress()).meta ?? {};
  meta.money = m.money ?? 0;
  meta.parts = m.parts ?? 0;
  meta.levels = { ...(m.levels ?? {}) };
  meta.heliXp = m.heliXp ?? 0;
  meta.livery = m.livery ?? 'olive';
  meta.gear = [...(m.gear ?? [])];
  meta.runs = m.runs ?? 0; // сыгранных забегов — для подсказок первых забегов
}

// Для сохранения вместе с рекордом — одной записью, чтобы две записи не затёрли друг друга
export function metaSnapshot() {
  return { ...meta, levels: { ...meta.levels }, gear: [...meta.gear] };
}

export async function saveMeta() {
  const save = await platform.loadProgress();
  await platform.saveProgress({ ...save, meta: metaSnapshot() });
}

// ── Улучшения «Ангара» за рубли и запчасти ──

export function level(id) {
  return meta.levels[id] ?? 0;
}

// Цена следующего уровня; null — уже максимум
export function price(id) {
  const it = HANGAR.items[id];
  const n = level(id);
  if (n >= it.max) return null;
  return { money: Math.round((it.money * HANGAR.growth ** n) / 5) * 5, parts: it.parts * (n + 1) };
}

export function canBuy(id) {
  const p = price(id);
  return !!p && meta.money >= p.money && meta.parts >= p.parts;
}

export function buy(id) {
  if (!canBuy(id)) return false;
  const p = price(id);
  meta.money -= p.money;
  meta.parts -= p.parts;
  meta.levels[id] = level(id) + 1;
  saveMeta();
  return true;
}

// ── Уровень вертолёта ──

export function heliLevel(xp = meta.heliXp) {
  let lv = 1;
  while (lv < HELI.levels.length && xp >= HELI.levels[lv]) lv++;
  return lv;
}

// Доля пути до следующего уровня (1 — максимум)
export function heliProgress() {
  const lv = heliLevel();
  if (lv >= HELI.levels.length) return 1;
  const from = HELI.levels[lv - 1];
  return (meta.heliXp - from) / (HELI.levels[lv] - from);
}

export function slots() {
  return HELI.slots[heliLevel() - 1];
}

// Опыт за забег; возвращает, сколько получено и вырос ли уровень
export function addHeliXp(stats) {
  const X = HELI.xp;
  const xp = Math.round(stats.kills * X.perKill + stats.time * X.perSecond + (stats.win ? X.escaped : 0));
  const before = heliLevel();
  meta.heliXp += xp;
  return { xp, levelUp: heliLevel() > before ? heliLevel() : null };
}

// ── Окраска и снаряжение ──

export function liveryUnlocked(id) {
  return heliLevel() >= LIVERIES.find((l) => l.id === id).level;
}

export function setLivery(id) {
  if (!liveryUnlocked(id)) return false;
  meta.livery = id;
  saveMeta();
  return true;
}

export function liveryTint(id = meta.livery) {
  return LIVERIES.find((l) => l.id === id)?.tint ?? null;
}

export function gearUnlocked(id) {
  return heliLevel() >= GEAR[id].level;
}

// Взять или снять вещь; взять — только если есть свободная ячейка
export function toggleGear(id) {
  const i = meta.gear.indexOf(id);
  if (i >= 0) meta.gear.splice(i, 1);
  else if (gearUnlocked(id) && meta.gear.length < slots()) meta.gear.push(id);
  else return false;
  saveMeta();
  return true;
}

// В начале забега: «Ангар», снаряжение и окраска поверх стартовых статов
export function applyMeta(scene) {
  const I = HANGAR.items;
  const p = scene.player;
  const st = p.stats;
  const gun = scene.gun.stats;
  p.maxHp += level('armor') * I.armor.add;
  gun.damage *= 1 + level('caliber') * I.caliber.mul;
  st.maxSpeed *= 1 + level('engine') * I.engine.mul;
  st.magnetRadius += level('magnet') * I.magnet.add;
  scene.rerolls += level('reroll') * I.reroll.add;

  for (const id of meta.gear) {
    const g = GEAR[id];
    if (!g || !gearUnlocked(id)) continue;
    p.maxHp += g.hp ?? 0;
    st.maxSpeed *= 1 + (g.speedMul ?? 0);
    st.turnSpeed *= 1 + (g.turnMul ?? 0);
    st.accel *= 1 + (g.accelMul ?? 0);
    st.magnetRadius += g.magnet ?? 0;
    gun.damage *= 1 + (g.damageMul ?? 0);
    gun.fireRate *= 1 + (g.fireRateMul ?? 0);
    // Ловушки — как взятое улучшение, чтобы карточки дальше считали уровни верно
    for (let k = 0; k < (g.flares ?? 0); k++) scene.upgrades.apply('flares');
  }
  p.hp = p.maxHp;

  const tint = liveryTint();
  if (tint !== null) p.look.setTint(tint);
}
