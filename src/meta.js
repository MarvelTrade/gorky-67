import { HANGAR } from './config.js';
import { platform } from './platform/platform.js';

// Кошелёк и «Ангар» между забегами: рубли, запчасти, уровни постоянных улучшений.
// Хранятся в том же сохранении, что и рекорд (облако Яндекса или localStorage).
export const meta = { money: 0, parts: 0, levels: {} };

export async function loadMeta() {
  const save = await platform.loadProgress();
  meta.money = save.meta?.money ?? 0;
  meta.parts = save.meta?.parts ?? 0;
  meta.levels = { ...(save.meta?.levels ?? {}) };
}

// Для сохранения вместе с рекордом — одной записью, чтобы две записи не затёрли друг друга
export function metaSnapshot() {
  return { money: meta.money, parts: meta.parts, levels: { ...meta.levels } };
}

export async function saveMeta() {
  const save = await platform.loadProgress();
  await platform.saveProgress({ ...save, meta: metaSnapshot() });
}

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

// В начале забега: постоянные улучшения поверх стартовых статов
export function applyMeta(scene) {
  const I = HANGAR.items;
  const p = scene.player;
  p.maxHp += level('armor') * I.armor.add;
  p.hp = p.maxHp;
  scene.gun.stats.damage *= 1 + level('caliber') * I.caliber.mul;
  p.stats.maxSpeed *= 1 + level('engine') * I.engine.mul;
  p.stats.magnetRadius += level('magnet') * I.magnet.add;
  scene.rerolls += level('reroll') * I.reroll.add;
}
