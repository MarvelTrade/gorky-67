import { CITY_LEVEL } from './cityLayout.js';
import { VILLAGE_LEVEL } from './villageLayout.js';
import { t } from './i18n/index.js';

// Кампания «Дорога на столицу»: газ и заражённые уходят от Горького-67 к столице вдоль железной дороги.
// Десять остановок снизу вверх; у построенных уровней есть layout (план карты), остальные пока — «???».
// prefix — ключи текстов уровня: t(`${prefix}telegram`) и т.п.; нет своего — общий ключ (уровень 1)
export const LEVELS = [
  { n: 1, key: 'city', layout: CITY_LEVEL, prefix: '' },
  { n: 2, key: 'village', layout: VILLAGE_LEVEL, prefix: 'l2_' },
  { n: 3, key: 'quarry' },
  { n: 4, key: 'l4' },
  { n: 5, key: 'l5' },
  { n: 6, key: 'l6' },
  { n: 7, key: 'l7' },
  { n: 8, key: 'l8' },
  { n: 9, key: 'l9' },
  { n: 10, key: 'capital' },
];

// План активного уровня. Системы читают его поля (DISTRICTS, AVENUES, RIVER, rail…), а не импорт
// конкретного города — так одна GameScene собирает любой уровень
export const layout = {};
export let level = LEVELS[0];

export function setLevel(n) {
  level = LEVELS.find((l) => l.n === n && l.layout) ?? LEVELS[0];
  for (const k of Object.keys(layout)) delete layout[k];
  Object.assign(layout, level.layout);
  return level;
}

export function isBuilt(n) {
  return !!LEVELS.find((l) => l.n === n)?.layout;
}

// Текст уровня: свой ключ (l2_telegram), иначе общий (telegram)
export function lt(key) {
  const own = `${level.prefix ?? ''}${key}`;
  const s = t(own);
  return s === own ? t(key) : s;
}

setLevel(1);
