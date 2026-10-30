// Генерирует docs/city-plan.svg из src/cityLayout.js и чисел из GameScene/config (заборы, ворота, ветка)
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
const { DISTRICTS, AVENUES, TOWER_SPOTS } = await import(pathToFileURL(root + '/src/cityLayout.js').href);
const { RAIL, WORLD, CITY } = await import(pathToFileURL(root + '/src/config.js').href).catch(() => ({
  RAIL: { x: 3600 }, WORLD: { width: 4000, height: 4000 }, CITY: { tile: 400 },
}));

const T = CITY.tile;          // 400
const C = 90;                 // клетка на картинке
const k = C / T;              // 0.225
const p = (v) => +(v * k).toFixed(1);
const SIZE = (WORLD.width / T) * C; // 900

const INFO = {
  Z: ['#b9a27a', 'лагерь строителей: бараки, частокол, колючка, «запретка», вышки, вахта', ''],
  T: ['#e0c9a6', 'сталинские кварталы: 3–5 этажей, замкнутые дворы', ''],
  R: ['#cfd3d8', 'микрорайоны: панельные 5–9 этажей', ''],
  D: ['#f0d3a0', 'Дворец культуры', 'ДК'],
  S: ['#e8b4a0', 'площадь с памятником', ''],
  P: ['#8fbf7a', 'центральный парк', ''],
  Q: ['#a9cf96', 'сквер', 'сквер'],
  W: ['#5f8a52', 'санитарная лесополоса у завода', ''],
  F: ['#9c8f86', 'завод «Объект 67»: цеха', ''],
  L: ['#6e625b', 'завод с лабораторией «Объекта» (люк)', 'ЛАБ.'],
  E: ['#5e5652', 'ТЭЦ с тремя трубами', 'ТЭЦ'],
  C: ['#bcd8a4', 'храм в зелёном квадрате за оградой, колокольня', 'храм'],
  V: ['#a9bcd3', 'телецентр с радиовышкой', 'ТВ'],
  H: ['#f7f7f2', 'больница (корпус «Н», красный крест)', 'больн.'],
  N: ['#f3d9d9', 'поликлиника', 'поликл.'],
  K: ['#e9d36a', 'школа со стадионом', 'школа'],
  G: ['#f4b8c8', 'детский сад', 'д/сад'],
  O: ['#e0503c', 'пожарная часть', 'пожарн.'],
  M: ['#4f6fb0', 'отделение милиции', 'милиция'],
  U: ['#f0a640', 'магазины: гастроном и универмаг', 'магазин'],
  Y: ['#8a7a52', 'свалка', 'свалка'],
};
const DARK = new Set(['W', 'F', 'L', 'E', 'O', 'M', 'Y']);

const out = [];
const W = (s) => out.push(s);
W(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1350" font-family="Arial, sans-serif">`);
W(`  <!-- Структурный план выдуманного закрытого города «Горький-67». Совпадает с src/cityLayout.js (DISTRICTS, AVENUES, TOWER_SPOTS)`);
W(`       и заборами/воротами из GameScene. Сетка игры: 10×10 кварталов по 400 px, тут клетка 90 px (1 px картинки = 4.44 px мира). -->`);
W(`  <rect width="1000" height="1350" fill="#f3eee2"/>`);
W(`  <text x="500" y="38" text-anchor="middle" font-size="26" font-weight="bold" fill="#2a2418">ГОРЬКИЙ-67 — структурный план города</text>`);
W(`  <text x="500" y="62" text-anchor="middle" font-size="14" fill="#5a5040">выдуманный закрытый город по мотивам советских «номерных» городов · север сверху · ветер западный · 10×10 кварталов</text>`);
W(`  <g transform="translate(50,80)">`);

// Кварталы
W(`    <!-- Кварталы по DISTRICTS: x = колонка×90, y = ряд×90 -->`);
DISTRICTS.forEach((row, r) => {
  [...row].forEach((d, c) => {
    W(`    <rect x="${c * C}" y="${r * C}" width="${C}" height="${C}" fill="${INFO[d][0]}"/>`);
  });
});
// Улицы по всем краям кварталов
W(`    <!-- Улицы по всем краям кварталов -->`);
W(`    <g stroke="#ffffff" stroke-width="5">`);
for (let i = 1; i < 10; i++) W(`      <line x1="${i * C}" y1="0" x2="${i * C}" y2="${SIZE}"/><line x1="0" y1="${i * C}" x2="${SIZE}" y2="${i * C}"/>`);
W(`    </g>`);

// Детали кварталов
W(`    <!-- Детали: бараки, парк, храм, больница, стадион, свалка -->`);
DISTRICTS.forEach((row, r) => {
  [...row].forEach((d, c) => {
    const x = c * C, y = r * C;
    if (d === 'Z') for (const [bx, by] of [[18, 19], [50, 19], [18, 41], [50, 41], [18, 63], [50, 63]]) W(`    <rect x="${x + bx}" y="${y + by}" width="22" height="8" fill="#7a6040"/>`);
    if (d === 'P') W(`    <circle cx="${x + 45}" cy="${y + 45}" r="14" fill="#6fa9c8" opacity="0.8"/>`);
    if (d === 'C') W(`    <rect x="${x + 8}" y="${y + 8}" width="74" height="74" fill="none" stroke="#6a7a5a" stroke-width="1.5" stroke-dasharray="3 2"/><rect x="${x + 31}" y="${y + 34}" width="25" height="27" fill="#f4f0e4" stroke="#6a5a3a"/><circle cx="${x + 43}" cy="${y + 47}" r="6" fill="#d6a838"/>`);
    if (d === 'H') W(`    <rect x="${x + 37}" y="${y + 30}" width="16" height="30" fill="#d03030"/><rect x="${x + 30}" y="${y + 37}" width="30" height="16" fill="#d03030"/>`);
    if (d === 'K') W(`    <ellipse cx="${x + 45}" cy="${y + 66}" rx="24" ry="12" fill="#7aa86a" stroke="#c05a3a" stroke-width="2"/>`);
    if (d === 'Y') for (const [cx, cy, rr] of [[25, 30, 10], [55, 25, 8], [40, 55, 12], [68, 60, 9]]) W(`    <circle cx="${x + cx}" cy="${y + cy}" r="${rr}" fill="#6a5a3a"/>`);
  });
});

// Проспекты
W(`    <!-- Проспекты с бульваром (AVENUES), по ним — троллейбус -->`);
for (const a of AVENUES) {
  const [x1, y1, x2, y2] = a.dir === 'h' ? [p(a.from), p(a.at), p(a.to), p(a.at)] : [p(a.at), p(a.from), p(a.at), p(a.to)];
  const w = a === AVENUES[0] ? 16 : 13;
  W(`    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3a3a3a" stroke-width="${w}"/>`);
  W(`    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#7aa86a" stroke-width="4" stroke-dasharray="6 8"/>`);
  const o = w / 2 - 2;
  const off = a.dir === 'h' ? [0, o] : [o, 0];
  for (const s of [-1, 1]) W(`    <line x1="${x1 + s * off[0]}" y1="${y1 + s * off[1]}" x2="${x2 + s * off[0]}" y2="${y2 + s * off[1]}" stroke="#d8d4c8" stroke-width="0.8" stroke-dasharray="2 3"/>`);
}

// Ж/д ветка
const rx = p(RAIL.x);
W(`    <!-- Ж/д ветка x=${RAIL.x} через весь завод с севера на юг -->`);
W(`    <line x1="${rx}" y1="-14" x2="${rx}" y2="${SIZE + 14}" stroke="#4a3a2a" stroke-width="10" stroke-dasharray="1.5 4"/>`);
W(`    <line x1="${rx - 2}" y1="-14" x2="${rx - 2}" y2="${SIZE + 14}" stroke="#2a2018" stroke-width="1.2"/>`);
W(`    <line x1="${rx + 2}" y1="-14" x2="${rx + 2}" y2="${SIZE + 14}" stroke="#2a2018" stroke-width="1.2"/>`);

// Бетонные заборы
const fence = (segs, note) => {
  W(`    <!-- ${note} -->`);
  W(`    <g stroke="#8c8a80" stroke-width="4" stroke-linecap="square">`);
  for (const [x1, y1, x2, y2] of segs) W(`      <line x1="${p(x1)}" y1="${p(y1)}" x2="${p(x2)}" y2="${p(y2)}"/>`);
  W(`    </g>`);
  W(`    <g stroke="#d6d4ca" stroke-width="1.2" stroke-dasharray="4 4">`);
  for (const [x1, y1, x2, y2] of segs) W(`      <line x1="${p(x1)}" y1="${p(y1)}" x2="${p(x2)}" y2="${p(y2)}"/>`);
  W(`    </g>`);
};
const gateY = AVENUES[0].at;
const rail = RAIL.x;
{
  const m = 14, Wd = WORLD.width - m, H = WORLD.height - m;
  fence([
    [m, m, rail - 34, m], [rail + 34, m, Wd, m],
    [m, H, rail - 34, H], [rail + 34, H, Wd, H],
    [m, m, m, gateY - 62], [m, gateY + 62, m, H],
    [Wd, m, Wd, H],
  ], 'Бетонный забор закрытого города: проём на КПП (запад, главный проспект) и под ветку (север, юг)');
}
// Завод: F, L, E
const fac = [];
DISTRICTS.forEach((row, r) => [...row].forEach((d, c) => { if ('FLE'.includes(d)) fac.push({ x: c * T, y: r * T }); }));
const fb = {
  x0: Math.min(...fac.map((t) => t.x)) + 40, y0: Math.min(...fac.map((t) => t.y)) + 30,
  x1: Math.max(...fac.map((t) => t.x)) + T - 30, y1: Math.max(...fac.map((t) => t.y)) + T - 30,
};
fence([
  [fb.x0, fb.y0, rail - 34, fb.y0], [rail + 34, fb.y0, fb.x1, fb.y0],
  [fb.x0, fb.y1, rail - 34, fb.y1], [rail + 34, fb.y1, fb.x1, fb.y1],
  [fb.x0, fb.y0, fb.x0, gateY - 62], [fb.x0, gateY + 62, fb.x0, fb.y1],
  [fb.x1, fb.y0, fb.x1, fb.y1],
], 'Бетонный забор завода (F, L, E): металлические ворота на проспекте, ж/д ворота на севере и юге');

// Лагерь
const zs = [];
DISTRICTS.forEach((row, r) => [...row].forEach((d, c) => { if (d === 'Z') zs.push({ x: c * T, y: r * T }); }));
const zb = {
  x0: Math.min(...zs.map((z) => z.x)) + 40, y0: Math.min(...zs.map((z) => z.y)) + 40,
  x1: Math.max(...zs.map((z) => z.x)) + T - 40, y1: Math.max(...zs.map((z) => z.y)) + T - 40,
};
const zg = (zb.x0 + zb.x1) / 2, gw = 44;
const ring = (o) => [
  [zb.x0 - o, zb.y0 - o, zb.x1 + o, zb.y0 - o],
  [zb.x1 + o, zb.y0 - o, zb.x1 + o, zb.y1 + o],
  [zb.x0 - o, zb.y1 + o, zg - gw, zb.y1 + o],
  [zg + gw, zb.y1 + o, zb.x1 + o, zb.y1 + o],
  [zb.x0 - o, zb.y0 - o, zb.x0 - o, zb.y1 + o],
];
W(`    <!-- Лагерь: частокол снаружи, «запретка», колючка внутри, ворота с вахтой на юг -->`);
for (const [x1, y1, x2, y2] of ring(6)) W(`    <line x1="${p(x1)}" y1="${p(y1)}" x2="${p(x2)}" y2="${p(y2)}" stroke="#d8c49a" stroke-width="3"/>`);
for (const [x1, y1, x2, y2] of ring(14)) W(`    <line x1="${p(x1)}" y1="${p(y1)}" x2="${p(x2)}" y2="${p(y2)}" stroke="#5a4630" stroke-width="2.5"/>`);
for (const [x1, y1, x2, y2] of ring(-6)) W(`    <line x1="${p(x1)}" y1="${p(y1)}" x2="${p(x2)}" y2="${p(y2)}" stroke="#3a2e22" stroke-width="1" stroke-dasharray="3 2"/>`);
const mx = (zb.x0 + zb.x1) / 2, my = (zb.y0 + zb.y1) / 2;
W(`    <g fill="#3a2e22">`);
for (const [x, y] of [[zb.x0, zb.y0], [zb.x1, zb.y0], [zb.x0, zb.y1], [zb.x1, zb.y1], [mx, zb.y0], [zb.x0, my]]) W(`      <rect x="${p(x) - 5}" y="${p(y) - 5}" width="10" height="10"/>`);
W(`    </g>`);
W(`    <rect x="${p(zg) - 12}" y="${p(zb.y1) - 2}" width="24" height="7" fill="#7a5a30" stroke="#2a2018" stroke-width="1"/>`);

// Ворота
W(`    <!-- КПП на въезде (шлагбаум), ворота завода, ж/д ворота -->`);
const kx = p(AVENUES[0].from + 30), ky = p(gateY);
W(`    <rect x="${kx - 36}" y="${ky - 22}" width="34" height="18" fill="#b03024"/>`);
W(`    <text x="${kx - 19}" y="${ky - 9}" text-anchor="middle" font-size="11" fill="#fff" font-weight="bold">КПП</text>`);
W(`    <line x1="${kx - 2}" y1="${ky - 9}" x2="${kx - 2}" y2="${ky + 9}" stroke="#b03024" stroke-width="4" stroke-dasharray="3 3"/>`);
const fgx = p(fb.x0), fgy = p(gateY);
W(`    <rect x="${fgx - 3}" y="${fgy - 14}" width="6" height="28" fill="#4a5058" stroke="#b03024" stroke-width="1.5"/>`);
W(`    <text x="${fgx}" y="${fgy + 4}" text-anchor="middle" font-size="8" fill="#e03020">★</text>`);
for (const y of [fb.y0, fb.y1]) W(`    <rect x="${rx - 9}" y="${p(y) - 3}" width="18" height="6" fill="#4a5058" stroke="#b03024" stroke-width="1.5"/>`);

// Высокие сооружения
W(`    <!-- Высокие сооружения по TOWER_SPOTS -->`);
for (const [d, spots] of Object.entries(TOWER_SPOTS)) {
  DISTRICTS.forEach((row, r) => [...row].forEach((dd, c) => {
    if (dd !== d) return;
    for (const sp of spots) {
      const x = p(c * T + sp.x), y = p(r * T + sp.y);
      if (sp.kind === 'chimney') W(`    <circle cx="${x}" cy="${y}" r="6" fill="#c0392b" stroke="#f3eee2" stroke-width="1.5"/>`);
      if (sp.kind === 'bell') W(`    <rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="#f4f0e4" stroke="#6a5a3a"/><circle cx="${x}" cy="${y}" r="3" fill="#d6a838"/>`);
      if (sp.kind === 'radio') W(`    <path d="M${x} ${y - 9} L${x + 7} ${y + 6} L${x - 7} ${y + 6} Z" fill="none" stroke="#c03020" stroke-width="2"/><circle cx="${x}" cy="${y - 9}" r="2.5" fill="#c03020"/>`);
    }
  }));
}

// Памятник, люк лаборатории, старт
const S0 = (() => { for (let r = 0; r < 10; r++) { const c = DISTRICTS[r].indexOf('S'); if (c >= 0) return { x: c * T, y: r * T }; } })();
const L0 = (() => { for (let r = 0; r < 10; r++) { const c = DISTRICTS[r].indexOf('L'); if (c >= 0) return { x: c * T, y: r * T }; } })();
W(`    <!-- Памятник в центре первой клетки площади, люк «Объекта», старт вертолёта (2000, 2000) -->`);
W(`    <circle cx="${p(S0.x + T / 2)}" cy="${p(S0.y + T / 2)}" r="11" fill="#2a2418"/>`);
W(`    <text x="${p(S0.x + T / 2)}" y="${p(S0.y + T / 2) + 5}" text-anchor="middle" font-size="13" fill="#f3eee2">★</text>`);
W(`    <rect x="${p(L0.x + T / 2) - 9}" y="${p(L0.y + T / 2) - 9}" width="18" height="18" fill="#3a3c3e" stroke="#ffd23a" stroke-width="2" stroke-dasharray="3 3"/>`);
W(`    <circle cx="${p(WORLD.width / 2)}" cy="${p(WORLD.height / 2)}" r="9" fill="#1e88c8" stroke="#fff" stroke-width="2"/>`);

// Подписи
W(`    <!-- Подписи районов -->`);
W(`    <g font-size="11" font-weight="bold" text-anchor="middle">`);
DISTRICTS.forEach((row, r) => [...row].forEach((d, c) => {
  const lab = INFO[d][2];
  if (!lab) return;
  const y = d === 'K' ? r * C + 22 : d === 'C' ? r * C + 78 : d === 'H' || d === 'L' ? r * C + 76 : r * C + 50;
  W(`      <text x="${c * C + 45}" y="${y}" fill="${DARK.has(d) ? '#f3eee2' : '#2a2418'}">${lab}</text>`);
}));
W(`    </g>`);
W(`    <g font-size="14" font-weight="bold" text-anchor="middle" fill="#2a2418">`);
W(`      <rect x="95" y="80" width="80" height="20" fill="#f3eee2" opacity="0.85"/><text x="135" y="95" fill="#2a2418">ЛАГЕРЬ</text>`);
W(`      <text x="495" y="50">СТАЛИНСКИЕ КВАРТАЛЫ</text>`);
W(`      <text x="405" y="292" font-size="12">ПЛОЩАДЬ</text>`);
W(`      <text x="405" y="560">ПАРК</text>`);
W(`      <text x="675" y="${SIZE / 2 - 120}" transform="rotate(-90 675 ${SIZE / 2 - 120})" fill="#f3eee2">ЛЕСОПОЛОСА</text>`);
W(`      <text x="855" y="600" transform="rotate(-90 855 600)" fill="#f3eee2">ЗАВОД «ОБЪЕКТ 67»</text>`);
W(`    </g>`);
W(`    <g font-size="11" fill="#2a2418">`);
W(`      <text x="${kx + 6}" y="${ky - 12}" fill="#f3eee2" font-weight="bold">главный проспект →</text>`);
W(`      <text x="${p(AVENUES[1].at) + 10}" y="${SIZE - 6}" font-weight="bold">проспект ↓</text>`);
W(`      <text x="${rx + 8}" y="${SIZE - 8}" fill="#f3eee2">ж/д</text>`);
W(`    </g>`);
W(`  </g>`);

// Легенда
W(`  <!-- Легенда -->`);
W(`  <g transform="translate(50,1000)" font-size="12.5" fill="#2a2418">`);
const keys = Object.keys(INFO);
const half = Math.ceil(keys.length / 2);
keys.forEach((d, i) => {
  const col = i < half ? 0 : 1, row = i < half ? i : i - half;
  const x = col * 460, y = row * 20;
  W(`    <rect x="${x}" y="${y}" width="18" height="14" fill="${INFO[d][0]}" stroke="#2a2418" stroke-width="0.5"/><text x="${x + 26}" y="${y + 12}"><tspan font-weight="bold">${d}</tspan> — ${INFO[d][1]}</text>`);
});
const y0 = half * 20 + 10;
const items = [
  [`<line x1="0" y1="7" x2="18" y2="7" stroke="#3a3a3a" stroke-width="8"/><line x1="0" y1="7" x2="18" y2="7" stroke="#7aa86a" stroke-width="2" stroke-dasharray="3 3"/>`, 'проспект с бульваром, троллейбус — только по проспектам'],
  [`<line x1="9" y1="0" x2="9" y2="14" stroke="#4a3a2a" stroke-width="8" stroke-dasharray="1.5 3"/>`, `ж/д ветка x=${RAIL.x} с севера на юг через завод`],
  [`<line x1="0" y1="7" x2="18" y2="7" stroke="#8c8a80" stroke-width="4"/>`, 'бетонный забор города и завода'],
  [`<line x1="0" y1="7" x2="18" y2="7" stroke="#5a4630" stroke-width="3"/>`, 'частокол и колючка лагеря, ■ вышки'],
  [`<rect x="0" y="1" width="18" height="12" fill="#b03024"/>`, 'КПП со шлагбаумом (запад, главный проспект)'],
  [`<rect x="6" y="0" width="6" height="14" fill="#4a5058" stroke="#b03024"/>`, 'металлические ворота завода · ж/д ворота'],
  [`<rect x="2" y="3" width="14" height="8" fill="#7a5a30" stroke="#2a2018"/>`, 'вахта с воротами лагеря (на юг)'],
  [`<circle cx="9" cy="7" r="6" fill="#c0392b"/>`, 'трубы ТЭЦ · ▢ колокольня · △ радиовышка'],
  [`<circle cx="9" cy="7" r="7" fill="#2a2418"/>`, 'памятник на площади · люк лаборатории'],
  [`<circle cx="9" cy="7" r="7" fill="#1e88c8" stroke="#fff" stroke-width="2"/>`, 'старт вертолёта (2000, 2000) — перекрёсток проспектов'],
];
items.forEach(([icon, text], i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const x = col * 460, y = y0 + row * 20;
  W(`    <g transform="translate(${x},${y})">${icon}<text x="26" y="12">${text}</text></g>`);
});
W(`  </g>`);
W(`</svg>`);
writeFileSync(root + '/docs/city-plan.svg', out.join('\n') + '\n');
console.log('ok', out.length, 'lines; factory box', fb, 'zone', zb);
