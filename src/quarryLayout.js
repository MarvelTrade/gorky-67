// Уровень 3 «Карьер «Гранитный»»: гранитный карьер с посёлком горняков и сортировочной горкой на дороге
// к столице (план: docs/level3-plan.svg). Газ дошёл и сюда; заражённые свозят обломки Объекта на дно
// карьера — там собирают нового. Север — к столице: трасса и ж/д идут насквозь, туда же уход в конце.
// Виды кварталов 40–47 — в общих таблицах cityLayout.js и BootScene (quarryLayouts); посёлок, завод,
// контора и гаражи — городские виды.
//
// a угол карьера · b край с пандусом · e край без пандуса · Q дно · L дно, где собирают «Объект» · D отвалы породы
// · w пустырь · C дробильно-сортировочный завод · W контора рудоуправления · G гараж самосвалов
// · E подстанция · P посёлок горняков · S станция «Гранитная» · R сортировочная горка · X склад взрывчатки
// · T хвостохранилище (вода поверх пустыря) · F перелесок
const DISTRICTS = [
  'wDDDwwwERR',
  'DDDDDCCWRR',
  'DaeeaCCGRR',
  'DeLQbwwGGR',
  'DeQQewwPPR',
  'DaebawPPPR',
  'wwwwwwPPPR',
  'wwTTTwPPSR',
  'XwTTTwwwFR',
  'wwTTTwFFFR',
];

const DISTRICT_VARIANT = {
  a: 40, b: 41, e: 48, Q: 42, L: 42, D: 43, R: 44, X: 45, w: 46, T: 46, E: 47,
  C: 4, W: 24, G: 26, P: [0, 1, 2], S: 37, F: 35,
};

// Карьер 4×4: углы (вид 40 нарисован левым верхним) и края (41 — верхним, с пандусом; e — 48, без пандуса)
// повёрнуты внутрь ямы. Пандус — на двух краях: с юга от дороги и с востока от дробилки
const TILE_FACING = {
  '1,2': 0, '4,2': 1, '4,5': 2, '1,5': 3,
  '2,2': 0, '3,2': 0, '4,3': 1, '4,4': 1, '2,5': 2, '3,5': 2, '1,3': 3, '1,4': 3,
};

// Трасса на столицу; грунтовые технологические дороги — вокруг карьера, к заводу, складу и посёлку
const AVENUES = [{ dir: 'v', at: 2400, from: 0, to: 4000, tex: 'highway' }];
const ROADS = [
  { dir: 'h', at: 2400, from: 0, to: 3600, tex: 'dirt' },
  { dir: 'h', at: 800, from: 1600, to: 3600, tex: 'dirt' },
  { dir: 'v', at: 2000, from: 800, to: 2400, tex: 'dirt' },
  { dir: 'v', at: 400, from: 2400, to: 3600, tex: 'dirt' },
  { dir: 'h', at: 3200, from: 2400, to: 3600, tex: 'dirt' },
];

// ЛЭП от подстанции: на юг вдоль посёлка и на запад к заводу
const WIRES = [
  { dir: 'v', at: 3000, from: 400, to: 2800, offset: 0 },
  { dir: 'h', at: 400, from: 2200, to: 3000, offset: 0 },
];

// Бункеры дробильного завода — высокие силосы; водонапорные башни — в посёлке (towerDistrict)
const TOWER_SPOTS = {
  C: [{ kind: 'silo', x: 300, y: 196 }], // в проезде между цехами
};

// Хвостохранилище: мутная вода, наземным врагам туда нельзя
const RIVER = {
  points: [[850, 3150], [1350, 3450], [1850, 3250]],
  width: 380,
  bank: 0,
  bridges: [],
  tankSlow: 0.3,
};

// Волны карьера: горняки вместо колхозников, подрывники с толом, самосвалы с людьми в кузове;
// экскаваторы стоят на краю карьера (staticSpawns) с самого начала
const WAVES = [
  { hpMul: 1.0, dmgMul: 0.5, alive: [0, 60], infantry: { interval: 1.4, batch: [1, 2, 2] }, miner: { interval: 1.4, batch: [1, 1, 2] }, blaster: { interval: 8, batch: 1, from: 30 } },
  { hpMul: 1.2, dmgMul: 0.75, alive: [30, 90], infantry: { interval: 1.2, batch: 2 }, miner: { interval: 1.2, batch: 2 }, blaster: { interval: 5, batch: 2 }, jeep: { interval: 4, batch: 1 } },
  { hpMul: 1.5, alive: [50, 130], infantry: { interval: 1.0, batch: 2 }, miner: { interval: 1.0, batch: 3 }, blaster: { interval: 4, batch: 2 }, dumptruck: { interval: 20, batch: 1, from: 10 }, jeep: { interval: 3, batch: 2 } },
  { hpMul: 1.9, alive: [70, 160], infantry: { interval: 1.0, batch: 3 }, miner: { interval: 1.0, batch: 3 }, blaster: { interval: 3.5, batch: 2 }, dumptruck: { interval: 16, batch: 1 }, aa: { interval: 7, batch: 1 }, jeep: { interval: 3, batch: 2 } },
  { hpMul: 2.4, alive: [80, 180], infantry: { interval: 0.9, batch: 3 }, miner: { interval: 0.9, batch: 4 }, blaster: { interval: 3, batch: 3 }, dumptruck: { interval: 14, batch: 1 }, aa: { interval: 5, batch: 1 }, btr: { interval: 12, batch: 1 } },
];

export const QUARRY_LEVEL = {
  DISTRICTS,
  DISTRICT_VARIANT,
  TILE_FACING,
  randomQuarter: 'DwPFQL', // эти кварталы поворачиваются случайно (дно карьера — чтобы не повторялось)
  AVENUES,
  ROADS,
  WIRES,
  TOWER_SPOTS,
  RIVER,
  rail: { x: 3800 },
  towerDistrict: 'P',      // водонапорные башни — в посёлке
  labStyle: 'pit',         // «Объект» выходит из ямы на дне карьера
  exitDir: 'n',            // к столице
  WAVES,
  hordeType: 'miner',      // орда — горняки
  wreckKinds: ['dumptruck', 'jeep', 'jeep', 'btr'],
  train: { y: 3000, stand: 0, moving: true }, // эшелон идёт мимо горки, не останавливаясь
  // Экскаваторы на краю карьера: стоят и кидают глыбы
  staticSpawns: [
    { type: 'excavator', x: 700, y: 950 },
    { type: 'excavator', x: 1900, y: 1300 },
    { type: 'excavator', x: 900, y: 2250 },
  ],
  explosives: 'X',         // склад взрывчатки в этом районе: подстрелить — огромный взрыв
  plazaVariants: [46, 42], // пустыри и дно карьера — туда артиллерия, заманить «Объект»
  features: { cityFence: false, checkpoint: false, trolleys: false, factoryFence: false },
};
