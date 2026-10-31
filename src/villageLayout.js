// Уровень 2 «Ольховка»: деревня и колхоз «Красный пахарь» на дороге от Горького-67 к столице
// (план: docs/level2-plan.svg). Север — к столице: туда идёт железная дорога и трасса, туда же коридор
// ухода в конце. Виды кварталов 27–39 — в общих таблицах cityLayout.js (BUILDINGS, BUILDING_STYLE)
// и BootScene.makeCityTiles; у деревенских кварталов нет асфальта по краям — дороги рисуются поверх.
//
// F лес · G луг · w пшеница · p картофель · k кукуруза · I избы с огородами · C центр (сельсовет, клуб,
// «Сельпо») · K школа · X разрушенная церковь · B коровники МТФ · L место сбора (выходит «Объект»)
// · M машинный двор · E разъезд с элеватором
const DISTRICTS = [
  'FFFFGwwwwG',
  'FFFFGwwwwG',
  'FGGGGwwwwG',
  'FGGIIIIGGE',
  'BBBXCCIGGG',
  'BLBIKIIMMG',
  'GGGIIIIMMG',
  'ppppGkkkkG',
  'ppppGkkkkG',
  'ppppGkkkkG',
];

const DISTRICT_VARIANT = { I: 27, C: 28, B: 29, L: 30, M: 31, w: 32, p: 33, k: 34, F: 35, G: 36, E: 37, X: 38, K: 39 };

// Трасса — асфальт с юга на север; грунтовки — к ферме, машинному двору, озеру, полям и разъезду
const AVENUES = [{ dir: 'v', at: 2000, from: 0, to: 4000, tex: 'highway' }];
const ROADS = [
  { dir: 'h', at: 1800, from: 600, to: 2000, tex: 'dirt' },
  { dir: 'h', at: 2200, from: 2000, to: 3200, tex: 'dirt' },
  { dir: 'h', at: 1200, from: 1250, to: 2000, tex: 'dirt' },
  { dir: 'h', at: 2800, from: 0, to: 3800, tex: 'dirt' },
  { dir: 'h', at: 1400, from: 2000, to: 3800, tex: 'dirt' },
  { dir: 'v', at: 1000, from: 2800, to: 4000, tex: 'dirt' },
];

// ЛЭП через поля — провода под током, как троллейбусные в городе (offset 0 — прямо по линии)
const WIRES = [
  { dir: 'h', at: 600, from: 2000, to: 3600, offset: 0 },
  { dir: 'v', at: 600, from: 2800, to: 4000, offset: 0 },
];

// Силосные башни у коровников, элеватор у разъезда, колокольня у церкви, водонапорная — у школы
const TOWER_SPOTS = {
  B: [{ kind: 'silo', x: 345, y: 110 }],
  E: [
    { kind: 'silo', x: 90, y: 110 },
    { kind: 'silo', x: 150, y: 110 },
  ],
  X: [{ kind: 'bell', x: 300, y: 130 }],
  K: [{ kind: 'water', x: 330, y: 300 }],
};

// Озеро в лесу: короткая толстая «река» без мостов — вода закрыта для наземных врагов
const RIVER = {
  points: [[560, 1060], [900, 1000], [1260, 1140]],
  width: 300,
  bank: 0,
  bridges: [],
  tankSlow: 0.3,
};

export const VILLAGE_LEVEL = {
  DISTRICTS,
  DISTRICT_VARIANT,
  TILE_FACING: {},
  randomQuarter: 'FGIwpk', // эти кварталы поворачиваются случайно
  AVENUES,
  ROADS,
  WIRES,
  TOWER_SPOTS,
  RIVER,
  rail: { x: 3800 },
  towerDistrict: 'I',      // случайные водонапорные башни — среди изб
  labStyle: 'pit',         // «Объект» выходит из ямы-навозохранилища, где копилось собранное
  exitDir: 'n',            // уходим на север — к столице
  plazaVariants: [33, 36], // поля и луг — туда артиллерия, заманить «Объект»
  features: { cityFence: false, checkpoint: false, trolleys: false, factoryFence: false },
};
