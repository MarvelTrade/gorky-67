import * as Phaser from 'phaser';
import { PALETTE as P, CITY } from '../config.js';
import { makeLiveryTextures } from '../systems/Livery.js';

// Отрендеренные в Blender спрайты (tools/blender/make_sprites.py → public/sprites/<ключ>.png).
// Если PNG есть — он заменяет текстуру из примитивов с тем же ключом и размером.
const BLENDER_SPRITES = ['heli', 'rotor', 'infantry', 'jeep', 'aa', 'tank', 'boss'];
const TOWER_SPRITES = ['towerRadio', 'towerWater', 'towerBell', 'towerChimney'];

// Деревенские кварталы (уровень 2): с этого индекса — без асфальта и тротуаров по краям
const VILLAGE_FROM = 27;
// Палитра деревни: приглушённая трава, земля, дерево — ничего ярче заражённых и снарядов
const V = {
  grass: 0x4a5434,
  grassDark: 0x3e482c,
  grassLight: 0x56603c,
  earth: 0x5e523e,
  packed: 0x6a604a,     // утоптанная площадь
  mud: 0x3e3324,
  rut: 0x3a3024,        // колея
  soil: 0x4a3c2c,       // вспаханная земля
  dung: 0x3a2e1e,
  wood: 0x7a6c52,       // штакетник, серое дерево
  woodLight: 0x9a8c6c,
  woodDark: 0x4a3c2a,
  straw: 0x857a50,      // сено — приглушённая охра, золото в игре — добыча
};

// Карьер «Гранитный» (уровень 3): кварталы 40–47, тоже без асфальта по краям
const QUARRY_FROM = 40;
// Палитра карьера: пыльный серо-охристый гранит, всё приглушённое — ярче только враги и снаряды
const Q = {
  dust: 0x6a6455,       // утоптанная пыль — фон 46, им же кончается бровка карьера
  dustDark: 0x5d5849,
  dustLight: 0x777060,
  dry: 0x77724f,        // сухая трава
  dryDark: 0x585a3e,
  gravel: 0x857f70,     // технологическая дорога
  rut: 0x57524a,
  ballast: 0x5a564c,
  sleeper: 0x4a3a2a,
  rail: 0x8e9094,
  bench: [0x6a6455, 0x625f57, 0x5b5952, 0x54524d, 0x4c4b47], // бровка и уступы сверху вниз
  floor: 0x444340,      // дно карьера
  lip: 0x8a867b,        // освещённая кромка уступа
  face: 0x3a3936,       // откос
  strata: 0x4c4a46,
  stone: [0x7e7a72, 0x6e6a63, 0x8c877c, 0x5e5b55, 0x7a6e62],
  water: 0x343e42,
  rust: 0x6a4a34,
  concrete: 0x7c7a72,
};
// Карьер (кварталы 40–42): уступы — линии уровня глубины; у угла общий центр дуг (QC, QC)
const QC = 380;
const QD = [52, 118, 184, 250, 316]; // глубины кромок уступов — одинаковые на стыках 40/41
const QF = 16;                        // ширина откоса

// Генерирует текстуры из примитивов; часть заменяется PNG из Blender.
// Все спрайты смотрят вправо (угол 0).
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    for (const key of BLENDER_SPRITES) this.load.image(key, `sprites/${key}.png`);
    // Высокие сооружения в 3/4: PNG + где в кадре центр основания (towers.json от make_sprites.py)
    for (const key of TOWER_SPRITES) this.load.image(key, `sprites/${key}.png`);
    this.load.json('towers', 'sprites/towers.json');
  }

  create() {
    this.makeHeliTexture();
    this.makeRotorTexture();
    this.makeInfantryTexture();
    this.makeJeepTexture();
    this.makeAATexture();
    this.makeTankTexture();
    this.makeBossTexture();
    this.makeShellTextures();
    this.makeBulletTexture();
    this.makeMissileTexture();
    this.makeGemTexture();
    this.makeParticleTextures();
    this.makeSupplyTextures();
    this.makeDepotTextures();
    this.makeWatchtowerTexture();
    this.makeAvenueTextures();
    this.makeVillageRoadTextures();
    this.makeIndustryTextures();
    this.makeMonumentTextures();
    this.makePauseTexture();
    this.makeTowerTextures();
    this.makeSiloTexture();
    makeLiveryTextures(this); // окраски вертолёта heli_<id> — после того, как спрайт 'heli' готов
    this.makeStreetTextures();
    this.makeCityTiles();
    this.scene.start('MenuScene');
  }

  // «Изделие 67»: угловатый корпус, нос вправо
  makeHeliTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const hull = [
      { x: 22, y: 24 },
      { x: 36, y: 12 },
      { x: 56, y: 15 },
      { x: 68, y: 24 },
      { x: 56, y: 33 },
      { x: 36, y: 36 },
    ];
    // хвостовая балка
    g.fillStyle(0x6c7884);
    g.fillRect(0, 21, 30, 6);
    // хвостовое оперение
    g.fillStyle(0x56616b);
    g.fillTriangle(0, 12, 10, 24, 0, 36);
    // крылышки с подвесками
    g.fillStyle(0x56616b);
    g.fillRect(38, 6, 8, 36);
    // корпус — угловатый ромб
    g.fillStyle(0xb4c0ca);
    g.fillPoints(hull, true);
    g.lineStyle(2, 0x1c2126);
    g.strokePoints(hull, true);
    // кабина
    g.fillStyle(0x9fd3e0);
    g.fillTriangle(52, 19, 64, 24, 52, 29);
    this.makeTexture(g, 'heli', 70, 48);
  }

  makeRotorTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x111111, 0.55);
    g.fillRect(0, 34, 72, 4);
    g.fillRect(34, 0, 4, 72);
    g.fillStyle(0x222222);
    g.fillCircle(36, 36, 4);
    this.makeTexture(g, 'rotor', 72, 72);
  }

  // Мягкое ядовитое свечение вокруг центра — общее для всего заражённого
  glow(g, x, y, r) {
    g.fillStyle(P.glow, 0.14);
    g.fillCircle(x, y, r);
    g.fillStyle(P.glow, 0.2);
    g.fillCircle(x, y, r * 0.72);
  }

  // Заражённый сверху: плечи, голова, руки тянутся вперёд, жёлтое свечение
  makeInfantryTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    this.glow(g, 13, 13, 13);
    g.fillStyle(P.infected);
    g.fillRect(14, 7, 9, 3);
    g.fillRect(14, 16, 9, 3);
    g.fillEllipse(12, 13, 11, 17);
    g.fillStyle(P.infectedHead);
    g.fillCircle(13, 13, 4);
    // Тёмный контур — чтобы читался и на светлой площади, и на жёлтом облачке
    g.lineStyle(1, 0x3a1a08, 0.8);
    g.strokeEllipse(12, 13, 11, 17);
    g.fillStyle(0xffffff);
    g.fillRect(15, 11, 2, 1);
    g.fillRect(15, 14, 2, 1);
    this.makeTexture(g, 'infantry', 26, 26);
  }

  // Заражённый вездеход: армейский, с пятнами «Зари» и жёлтыми фарами
  makeJeepTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    this.glow(g, 16, 11, 15);
    g.fillStyle(0x161a14);
    for (const [x, y] of [[6, 1], [20, 1], [6, 18], [20, 18]]) g.fillRect(x, y, 6, 3);
    g.fillStyle(P.army);
    g.fillRect(2, 3, 28, 16);
    g.fillStyle(P.armyDark);
    g.fillRect(6, 5, 12, 12);
    g.fillStyle(P.glow, 0.7);
    g.fillCircle(11, 8, 2);
    g.fillCircle(22, 15, 2);
    g.fillStyle(P.glow);
    g.fillRect(29, 4, 2, 3);
    g.fillRect(29, 15, 2, 3);
    this.makeTexture(g, 'jeep', 32, 22);
  }

  // Зенитная установка оцепления: платформа, башня, два ствола, белая полоса опознавания
  makeAATexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(P.army);
    g.fillRect(2, 2, 30, 30);
    g.lineStyle(2, P.armyDark);
    g.strokeRect(2, 2, 30, 30);
    g.fillStyle(0xd8d8d0);
    g.fillRect(4, 4, 3, 26);
    g.fillStyle(0x4a5c3c);
    g.fillCircle(17, 17, 10);
    g.fillStyle(P.armyDark);
    g.fillRect(17, 12, 17, 3);
    g.fillRect(17, 19, 17, 3);
    this.makeTexture(g, 'aa', 34, 34);
  }

  // Танк оцепления: гусеницы, корпус, башня и длинный ствол вперёд
  makeTankTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x161a14);
    g.fillRect(4, 2, 40, 8);
    g.fillRect(4, 30, 40, 8);
    g.fillStyle(0x2a3022);
    for (let x = 6; x < 44; x += 6) {
      g.fillRect(x, 3, 2, 6);
      g.fillRect(x, 31, 2, 6);
    }
    g.fillStyle(P.army);
    g.fillRect(6, 9, 36, 22);
    g.lineStyle(2, P.armyDark);
    g.strokeRect(6, 9, 36, 22);
    g.fillStyle(P.armyDark);
    g.fillRect(28, 18, 30, 4);
    g.fillStyle(0x4a5c3c);
    g.fillCircle(24, 20, 9);
    g.lineStyle(2, P.armyDark);
    g.strokeCircle(24, 20, 9);
    g.fillStyle(0xd8d8d0);
    g.fillRect(8, 11, 3, 18);
    this.makeTexture(g, 'tank', 58, 40);
  }

  // «Объект»: бесформенная туша с щупальцами, светящимися наростами и пастью спереди
  makeBossTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const c = 50;
    g.fillStyle(P.glow, 0.1);
    g.fillCircle(c, c, 50);
    g.fillStyle(P.glow, 0.14);
    g.fillCircle(c, c, 42);
    // щупальца
    g.lineStyle(7, 0x4a3a4e);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.55 + (i / 6) * Math.PI * 0.9;
      g.lineBetween(c, c, c + Math.cos(a) * 46, c + Math.sin(a) * 46);
    }
    // туша из нескольких наплывов
    g.fillStyle(0x5b4a5e);
    for (const [x, y, r] of [[48, 50, 30], [38, 36, 18], [38, 64, 18], [62, 42, 16], [62, 58, 16]]) {
      g.fillCircle(x, y, r);
    }
    g.fillStyle(P.infected);
    g.fillCircle(46, 50, 20);
    // светящиеся наросты
    g.fillStyle(P.glow);
    for (const [x, y, r] of [[34, 34, 4], [30, 60, 5], [52, 36, 3], [44, 66, 3], [26, 47, 3]]) {
      g.fillCircle(x, y, r);
    }
    // пасть
    g.fillStyle(0x1a1018);
    g.fillEllipse(70, 50, 16, 24);
    g.fillStyle(P.glow);
    g.fillEllipse(72, 50, 6, 12);
    this.makeTexture(g, 'boss', 100, 100);
  }

  // Вражеские снаряды — самые яркие объекты на экране: насыщенный ореол и белая сердцевина
  makeShellTextures() {
    // Зенитка — крупный круглый снаряд
    let g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(P.shell, 0.35);
    g.fillCircle(9, 9, 9);
    g.fillStyle(P.shell);
    g.fillCircle(9, 9, 6);
    g.fillStyle(P.shellCore);
    g.fillCircle(9, 9, 3);
    this.makeTexture(g, 'shell', 18, 18);

    // Танк — вытянутый трассер: видно, куда летит
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(P.shell, 0.4);
    g.fillEllipse(11, 6, 22, 12);
    g.fillStyle(P.shell);
    g.fillEllipse(12, 6, 16, 7);
    g.fillStyle(P.shellCore);
    g.fillEllipse(15, 6, 8, 3);
    this.makeTexture(g, 'tankShell', 22, 12);

    // Вездеход — мелкая быстрая пуля
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(P.shell, 0.45);
    g.fillEllipse(6, 4, 12, 8);
    g.fillStyle(P.shellCore);
    g.fillEllipse(7, 4, 6, 3);
    this.makeTexture(g, 'jeepShell', 12, 8);

    // «Объект» — ядовито-зелёный плевок «Зарёй», не путается с оранжевыми заражёнными
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(P.spit, 0.35);
    g.fillCircle(9, 9, 9);
    g.fillStyle(P.spit);
    g.fillCircle(9, 9, 6);
    g.fillStyle(P.shellCore);
    g.fillCircle(8, 8, 3);
    this.makeTexture(g, 'spit', 18, 18);
  }


  makeBulletTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffe066);
    g.fillRect(0, 0, 12, 3);
    this.makeTexture(g, 'bullet', 12, 3);
  }

  makeMissileTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xff8a3d);
    g.fillRect(0, 2, 4, 4);
    g.fillStyle(0xe8e8e8);
    g.fillRect(4, 1, 12, 6);
    g.fillStyle(0xd04030);
    g.fillTriangle(16, 1, 20, 4, 16, 7);
    this.makeTexture(g, 'missile', 20, 8);
  }

  // Кристалл опыта — голубой ромб
  makeGemTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4fd8ff);
    g.fillPoints([{ x: 6, y: 0 }, { x: 12, y: 7 }, { x: 6, y: 14 }, { x: 0, y: 7 }], true);
    g.fillStyle(0xc8f4ff);
    g.fillTriangle(6, 2, 9, 7, 6, 7);
    this.makeTexture(g, 'gem', 12, 14);
  }

  // Мягкое пятно для облачков и квадратик для обломков; цвет задаёт tint частиц
  makeParticleTextures() {
    let g = this.make.graphics({ x: 0, y: 0 }, false);
    for (let r = 8; r > 0; r -= 2) {
      g.fillStyle(0xffffff, 0.18);
      g.fillCircle(8, 8, r);
    }
    this.makeTexture(g, 'puff', 16, 16);
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 4, 4);
    this.makeTexture(g, 'spark', 4, 4);
  }

  // Ящик снабжения сверху (доски и жёлтая маркировка) и кольцо маячка вокруг него
  makeSupplyTextures() {
    let g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.35);
    g.fillRect(4, 4, 24, 24);
    g.fillStyle(0x8a6a3a);
    g.fillRect(1, 1, 24, 24);
    g.lineStyle(2, 0x4a3418);
    g.strokeRect(1, 1, 24, 24);
    g.lineBetween(1, 1, 25, 25);
    g.lineBetween(25, 1, 1, 25);
    g.fillStyle(0xffd040);
    g.fillRect(1, 10, 24, 6);
    this.makeTexture(g, 'crate', 30, 30);

    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.lineStyle(3, 0xffd040);
    g.strokeCircle(24, 24, 21);
    this.makeTexture(g, 'beacon', 48, 48);
  }

  // Полевой склад: штабель ящиков под брезентом; разбитый — щепки и гарь.
  // Монета (рубль) и запчасть (шестерня) — добыча со склада
  makeDepotTextures() {
    let g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.35).fillRect(5, 5, 42, 30);
    g.fillStyle(0x6b5232).fillRect(1, 1, 42, 30);           // ящики
    g.lineStyle(2, 0x3a2a14).strokeRect(1, 1, 42, 30);
    g.lineBetween(15, 1, 15, 31);
    g.lineBetween(29, 1, 29, 31);
    g.lineBetween(1, 16, 43, 16);
    g.fillStyle(0x4b5a3a, 0.95).fillRect(1, 1, 26, 18);    // брезент
    g.lineStyle(1.5, 0x2e3824).strokeRect(1, 1, 26, 18);
    g.fillStyle(0xe8e0c0).fillRect(31, 20, 10, 3);          // трафаретная метка
    g.fillStyle(0xd04030).fillCircle(37, 8, 3.5);           // красная метка
    this.makeTexture(g, 'depot', 48, 36);

    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x1e1a14, 0.8).fillRect(4, 6, 38, 24);      // гарь
    g.fillStyle(0x5a4428);
    for (const [x, y, w, h] of [[3, 4, 12, 4], [20, 2, 4, 12], [30, 10, 12, 4], [8, 22, 14, 4], [26, 24, 4, 10], [36, 26, 9, 3]]) g.fillRect(x, y, w, h);
    g.fillStyle(0x2e3824).fillRect(12, 12, 14, 8);           // клок брезента
    this.makeTexture(g, 'depotBroken', 48, 36);

    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xb8862a).fillCircle(7, 7, 7);
    g.fillStyle(0xf2c94c).fillCircle(7, 7, 5.5);
    g.fillStyle(0xb8862a).fillRect(5, 4, 4, 6);
    this.makeTexture(g, 'coin', 14, 14);

    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x9aa6ae);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.fillCircle(9 + Math.cos(a) * 7, 9 + Math.sin(a) * 7, 2.4);
    }
    g.fillCircle(9, 9, 6.5);
    g.fillStyle(0x3a4148).fillCircle(9, 9, 2.6);
    this.makeTexture(g, 'part', 18, 18);
  }

  // Кусок проспекта на квартал (400 × 120): две проезжие части, бульвар с деревьями посередине,
  // разметка полос. Поверх обычной дороги между кварталами — проспект шире улицы
  makeAvenueTextures() {
    const W = CITY.tile;
    const H = 120;
    let g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(P.asphalt).fillRect(0, 0, W, H);
    g.fillStyle(0x6a6d70).fillRect(0, 0, W, 3).fillRect(0, H - 3, W, 3); // бордюры
    // Бульвар и разметка обрываются у перекрёстков (края куска — поперечные улицы), иначе лезли на них
    const gap = 58;
    g.fillStyle(0x3f5a34).fillRect(gap, H / 2 - 9, W - gap * 2, 18);           // бульвар
    g.fillStyle(0x6a6d70).fillRect(gap, H / 2 - 10, W - gap * 2, 1).fillRect(gap, H / 2 + 9, W - gap * 2, 1);
    for (let x = gap + 18; x < W - gap; x += 50) this.tree(g, x, H / 2, 9);
    g.fillStyle(P.roadMark);
    for (let x = gap; x < W - gap; x += 40) g.fillRect(x, 24, 22, 2).fillRect(x, H - 26, 22, 2); // полосы движения
    // Зебры перед перекрёстками
    g.fillStyle(0xd8d4c4);
    for (const x0 of [gap - 22, W - gap + 6]) for (let y = 6; y < H - 6; y += 10) g.fillRect(x0, y, 16, 5);
    this.makeTexture(g, 'avenue', W, H);

    // Перекрёсток двух проспектов: чистый асфальт без бульвара
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(P.asphalt).fillRect(0, 0, H, H);
    this.makeTexture(g, 'avenueCross', H, H);

    // КПП: будка и красно-белый шлагбаум поперёк проспекта
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.3).fillRect(4, 4, 30, 26);
    g.fillStyle(0x8a8c80).fillRect(0, 0, 30, 26);   // будка
    g.fillStyle(0x6a7a86).fillRect(4, 6, 22, 8);     // окно
    g.fillStyle(0xb03024).fillRect(0, 0, 30, 4);     // красная полоса
    for (let y = 30; y < 118; y += 12) {
      g.fillStyle((y / 12) % 2 ? 0xd03030 : 0xf0f0f0).fillRect(12, y, 6, 12); // шлагбаум
    }
    this.makeTexture(g, 'checkpoint', 36, 120);
  }

  // Ворота лагеря с вахтой, металлические ворота завода, ж/д ворота, насыпь с рельсами, состав
  makeIndustryTextures() {
    let g = this.make.graphics({ x: 0, y: 0 }, false);
    // Лагерь: деревянные створки во всю ширину проёма и будка вахты сбоку
    g.fillStyle(0x6a5236).fillRect(0, 6, 88, 8);
    g.lineStyle(1, 0x3e3020);
    for (let x = 0; x < 88; x += 5) g.lineBetween(x, 6, x, 14);
    g.lineStyle(2, 0x3e3020).lineBetween(0, 6, 44, 14).lineBetween(44, 6, 88, 14); // укосины
    g.fillStyle(0x000000, 0.3).fillRect(94, 4, 28, 20);
    g.fillStyle(0x7a6448).fillRect(90, 0, 28, 20);   // вахта
    g.fillStyle(0x3e3a34).fillRect(90, 0, 28, 6);
    g.fillStyle(0xfff2b0).fillRect(96, 9, 6, 4);      // окно с огнём
    this.makeTexture(g, 'campGate', 122, 26);

    // Завод: две металлические створки поперёк проспекта, прутья, красная звезда
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.3).fillRect(5, 4, 8, 124);
    g.fillStyle(0x4a5058).fillRect(2, 0, 8, 124);
    g.fillStyle(0x6a7078);
    for (let y = 4; y < 120; y += 6) g.fillRect(3, y, 6, 2);
    g.fillStyle(0x2a2e34).fillRect(0, 60, 12, 4);   // стык створок
    g.fillStyle(0xc03030).fillCircle(6, 30, 4).fillCircle(6, 94, 4); // звёзды
    this.makeTexture(g, 'factoryGate', 14, 128);

    // Ж/д ворота: створки над путями
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.3).fillRect(4, 6, 68, 8);
    g.fillStyle(0x4a5058).fillRect(0, 2, 68, 8);
    g.fillStyle(0x6a7078);
    for (let x = 3; x < 66; x += 6) g.fillRect(x, 3, 2, 6);
    g.fillStyle(0xd0b030).fillRect(0, 2, 6, 8).fillRect(62, 2, 6, 8); // жёлтые столбы
    this.makeTexture(g, 'railGate', 72, 16);

    // Насыпь со шпалами и рельсами (кусок на квартал)
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x5a5246).fillRect(0, 0, 44, CITY.tile);
    g.fillStyle(0x4a3a2a);
    for (let y = 2; y < CITY.tile; y += 10) g.fillRect(6, y, 32, 5);
    g.fillStyle(0x9aa0a6).fillRect(13, 0, 3, CITY.tile).fillRect(28, 0, 3, CITY.tile);
    this.makeTexture(g, 'railway', 44, CITY.tile);

    // Тепловоз и вагоны — вид сверху, «нос» вниз (на юг)
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x2e5a3a).fillRect(1, 0, 22, 58);
    g.fillStyle(0xc03030).fillRect(1, 50, 22, 6);   // красная полоса спереди
    g.fillStyle(0x3a6a48).fillRect(4, 6, 16, 38);
    g.fillStyle(0x7a8a90).fillRect(5, 44, 14, 6);   // кабина
    this.makeTexture(g, 'loco', 24, 58);
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x6a4a34).fillRect(1, 0, 22, 52);  // крытый вагон
    g.fillStyle(0x5a3e2a).fillRect(1, 24, 22, 4);
    this.makeTexture(g, 'wagon', 24, 52);
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x2a2a2e).fillRect(1, 2, 22, 48); // цистерна
    g.fillStyle(0x4a4a50).fillRect(5, 2, 14, 48);
    g.fillStyle(0x2a2a2e).fillCircle(12, 26, 4);
    this.makeTexture(g, 'tankcar', 24, 52);
  }

  // Вышка «зоны» вид сверху: четыре опоры, площадка с навесом, часовой — тёмная точка
  makeWatchtowerTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.3).fillRect(12, 12, 32, 32);
    g.lineStyle(3, 0x4a3a28);
    g.lineBetween(6, 6, 18, 18).lineBetween(42, 6, 30, 18).lineBetween(6, 42, 18, 30).lineBetween(42, 42, 30, 30);
    g.fillStyle(0x6a5236).fillRect(12, 12, 24, 24); // площадка
    g.fillStyle(0x3e4a34).fillRect(10, 10, 28, 8);  // навес
    g.fillStyle(0x2a2a2a).fillCircle(24, 26, 4);    // часовой
    g.fillStyle(0xfff2b0).fillCircle(31, 14, 2);    // прожектор
    this.makeTexture(g, 'watchtower', 48, 48);
  }

  // Памятник «Рабочему с шестернёй» (выдуманный) в 3/4: пьедестал и фигура с поднятой шестернёй.
  // Сбитый — пьедестал и лежащая фигура
  // Крупнее прежнего (на площади 260 px фигура читалась бурым пятном): гранитные ступени, высокий
  // постамент с тенью на правой грани, тёмная бронза с бликом слева — силуэт виден на сером граните
  makeMonumentTextures() {
    const W = 80;
    const H = 120;
    const pedestal = (g) => {
      g.fillStyle(0x000000, 0.32).fillEllipse(46, 108, 70, 18);
      g.fillStyle(0x5e6064).fillRect(10, 96, 60, 14);  // ступени
      g.fillStyle(0x86888c).fillRect(10, 94, 60, 4);
      g.fillStyle(0x6e7074).fillRect(16, 90, 48, 6);
      g.fillStyle(0x7a7c80).fillRect(22, 58, 36, 34);  // постамент
      g.fillStyle(0x5e6064).fillRect(52, 58, 6, 34);   // теневая грань
      g.fillStyle(0x9a9ca0).fillRect(20, 54, 40, 6);   // карниз постамента
      g.fillStyle(0x7a6640).fillRect(30, 68, 18, 12);  // бронзовая доска, буквы не читаются — без надписи
      g.fillStyle(0x5a4a30);
      for (let y = 71; y < 79; y += 3) g.fillRect(32, y, 14, 1);
    };
    const bronze = 0x5e4a30;
    const lit = 0x8e7046;
    let g = this.make.graphics({ x: 0, y: 0 }, false);
    pedestal(g);
    g.fillStyle(bronze);
    g.fillRect(33, 28, 13, 22);                          // туловище
    g.fillRect(32, 48, 6, 8).fillRect(41, 48, 6, 8);     // ноги
    g.fillRect(27, 30, 6, 16);                           // опущенная рука
    g.fillRect(43, 12, 5, 20);                           // поднятая рука
    g.fillCircle(39, 23, 6);                             // голова
    g.fillStyle(lit);                                     // блик слева — свет с северо-запада
    g.fillRect(33, 28, 4, 22).fillRect(27, 30, 2, 16).fillRect(32, 48, 2, 8);
    g.fillCircle(37, 21, 3);
    // Шестерня над головой
    g.lineStyle(3, lit).strokeCircle(46, 10, 6);
    g.fillStyle(lit);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.fillRect(46 + Math.cos(a) * 8.5 - 1.5, 10 + Math.sin(a) * 8.5 - 1.5, 3, 3);
    }
    this.makeTexture(g, 'monument', W, H);

    g = this.make.graphics({ x: 0, y: 0 }, false);
    pedestal(g);
    g.fillStyle(0x1e1a14, 0.6).fillCircle(30, 100, 12); // гарь
    g.fillStyle(bronze);                                  // фигура лежит на ступенях
    g.fillRect(40, 98, 34, 10);
    g.fillCircle(74, 103, 6);
    g.fillStyle(lit).fillRect(40, 98, 34, 3);
    g.fillStyle(0x3a3c40).fillRect(36, 54, 10, 5);       // обломанные ноги на постаменте
    this.makeTexture(g, 'monumentFallen', W, H);
  }

  // Кнопка паузы: полупрозрачный круг с латунной окантовкой и две полоски цвета бумаги — в тон бланкам
  makePauseTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.45);
    g.fillCircle(20, 20, 20);
    g.lineStyle(2, 0xb89a52, 0.8);
    g.strokeCircle(20, 20, 19);
    g.fillStyle(0xece4cc);
    g.fillRect(13, 11, 5, 18);
    g.fillRect(22, 11, 5, 18);
    this.makeTexture(g, 'pauseBtn', 40, 40);
  }

  // Город — квадратные кварталы CITY.tile × CITY.tile, по краям дороги.
  // Несколько вариантов; GameScene раскладывает их с поворотами, и стыки всегда сходятся.
  makeCityTiles() {
    const s = CITY.tile;
    const rnd = new Phaser.Math.RandomDataGenerator(['gorky-67']);
    const layouts = [
      // две длинные девятиэтажки и двор между ними
      (g) => {
        this.trees(g, rnd, 70, 140, 260, 100, 9);
      },
      // «буквой Г» и ряд гаражей
      (g) => {
        g.fillStyle(0x5c5f63);
        for (let i = 0; i < 6; i++) g.fillRect(170 + i * 28, 300, 24, 34);
        this.trees(g, rnd, 140, 140, 190, 130, 7);
      },
      // две точечные башни
      (g) => {
        this.trees(g, rnd, 220, 60, 110, 120, 5);
        this.trees(g, rnd, 60, 220, 120, 110, 5);
      },
      // площадь с памятником
      // Советская площадь: гранитная плитка, газоны-партеры по углам, круглая клумба в центре
      // (на неё встаёт памятник), голубые ели по периметру, фонари вдоль сторон
      (g) => {
        g.fillStyle(0x5e6166);
        g.fillRect(70, 70, 260, 260);
        g.lineStyle(1, 0x6a6e73);
        for (let i = 1; i < 10; i++) {
          g.lineBetween(70 + i * 26, 70, 70 + i * 26, 330);
          g.lineBetween(70, 70 + i * 26, 330, 70 + i * 26);
        }
        // Светлая гранитная «дорога» крестом — к центру со всех сторон
        g.fillStyle(0x787b7f).fillRect(186, 70, 28, 260).fillRect(70, 186, 260, 28);
        // Газоны-партеры с каменным бортом
        for (const [x, y] of [[86, 86], [230, 86], [86, 230], [230, 230]]) {
          g.fillStyle(0x8a8c8e).fillRect(x - 2, y - 2, 88, 88);
          g.fillStyle(0x3f5a34).fillRect(x, y, 84, 84);
        }
        // Центр: гранитное кольцо и клумба
        g.fillStyle(0x8a8c8e).fillCircle(200, 200, 42);
        g.fillStyle(0x4c4f53).fillCircle(200, 200, 36);
        g.fillStyle(0x3f5a34).fillCircle(200, 200, 26);
        g.fillStyle(0x6a3a34).fillCircle(200, 200, 14); // тёмно-красные цветы — приглушённые, не «опасность»
        g.fillStyle(0x7a7c80).fillRect(190, 190, 20, 20); // постамент / стела
        // Фонари: столбик с тенью и светлым плафоном
        for (let k = 90; k <= 310; k += 55) {
          for (const [x, y] of [[k, 76], [k, 324], [76, k], [324, k]]) {
            g.fillStyle(0x000000, 0.3).fillRect(x + 1, y + 1, 4, 4);
            g.fillStyle(0xbab6a6).fillRect(x - 2, y - 2, 4, 4);
          }
        }
        for (const [x, y] of [[50, 50], [350, 50], [50, 350], [350, 350], [125, 50], [275, 50], [50, 125], [50, 275], [350, 125], [350, 275], [125, 350], [275, 350]]) {
          this.tree(g, x, y, 11);
        }
      },
      // 4 — завод: бетонный двор, рельсы, штабеля
      (g) => {
        g.fillStyle(0x4a4c4e).fillRect(40, 40, 320, 320); // бетон
        g.lineStyle(2, 0x6e6a60);
        g.lineBetween(46, 190, 354, 190); // рельсы к цехам
        g.lineBetween(46, 198, 354, 198);
        for (let x = 50; x < 354; x += 12) g.fillStyle(0x3a3226).fillRect(x, 186, 4, 16); // шпалы
        g.fillStyle(0x5c5240);
        for (let i = 0; i < 4; i++) g.fillRect(270 + (i % 2) * 34, 250 + Math.floor(i / 2) * 34, 28, 28); // штабеля
      },
      // 5 — завод с лабораторией: бетон и подъезд к площадке люка (площадку рисует Lab)
      (g) => {
        g.fillStyle(0x4a4c4e).fillRect(40, 40, 320, 320);
        g.fillStyle(0x56585a).fillRect(180, 40, 40, 100); // подъезд с севера
        g.fillStyle(0x56585a).fillRect(180, 260, 40, 100);
      },
      // 6 — парк: газон, дорожки крестом, пруд, много деревьев
      (g) => {
        g.fillStyle(0x3f5a34).fillRect(40, 40, 320, 320);
        g.fillStyle(0x6e6a5c);
        g.fillRect(190, 40, 20, 320);
        g.fillRect(40, 190, 320, 20);
        g.fillStyle(0x2c4a5a).fillEllipse(110, 290, 110, 70); // пруд
        g.fillStyle(0x3a6070).fillEllipse(104, 284, 70, 40);
        this.trees(g, rnd, 50, 50, 130, 130, 9);
        this.trees(g, rnd, 220, 50, 130, 130, 9);
        this.trees(g, rnd, 220, 220, 130, 130, 9);
        g.fillStyle(0x7a7468).fillCircle(200, 200, 18); // клумба на перекрёстке дорожек
        g.fillStyle(0x8a3a3a).fillCircle(200, 200, 10);
      },
      // 7 — «зона»: утоптанная земля, плац
      (g) => {
        g.fillStyle(0x4a4636).fillRect(40, 40, 320, 320);
        g.fillStyle(0x56523f).fillRect(60, 130, 280, 36); // плац между рядами бараков
        g.fillStyle(0x56523f).fillRect(60, 229, 280, 36);
      },
      // 8 — ДК: площадь с плиткой перед зданием, клумбы, фонари
      (g) => {
        g.fillStyle(0x5e6166).fillRect(60, 220, 280, 120);
        g.lineStyle(1, 0x6c7075);
        for (let x = 60; x < 340; x += 28) g.lineBetween(x, 220, x, 340);
        for (let y = 220; y < 340; y += 28) g.lineBetween(60, y, 340, y);
        // Клумбы — зелёные партеры с бортом и приглушёнными цветами (красные пятна читались как «опасность»)
        for (const x of [100, 300]) {
          g.fillStyle(0x8a8c8e).fillRoundedRect(x - 32, 258, 64, 44, 8);
          g.fillStyle(0x3f5a34).fillRoundedRect(x - 29, 261, 58, 38, 6);
          g.fillStyle(0x6a3a34).fillRoundedRect(x - 18, 272, 36, 16, 5);
        }
        g.fillStyle(0x787b7f).fillRect(186, 220, 28, 120); // гранитная дорожка к колоннаде
        for (const x of [80, 140, 260, 320]) {
          g.fillStyle(0x000000, 0.3).fillRect(x + 1, 331, 4, 4);
          g.fillStyle(0xbab6a6).fillRect(x - 2, 328, 4, 4); // фонари
        }
        for (const [x, y] of [[50, 50], [350, 50], [50, 220], [350, 220]]) this.tree(g, x, y, 12);
      },
      // 9 — сталинский квартал с закрытым двором: деревья, детская площадка
      (g) => {
        g.fillStyle(0x3a4a34).fillRect(110, 110, 180, 180);
        this.trees(g, rnd, 120, 120, 160, 70, 6);
        g.fillStyle(0x8a6a4a).fillRect(170, 220, 60, 40); // песочница и качели
        g.fillStyle(0xc0a060).fillRect(180, 230, 40, 20);
      },
      // 10 — сталинский квартал «покоем»: двор открыт на юг
      (g) => {
        g.fillStyle(0x3a4a34).fillRect(110, 110, 180, 240);
        this.trees(g, rnd, 120, 120, 160, 200, 8);
      },
      // 11 — лесополоса: сплошь деревья
      (g) => {
        g.fillStyle(0x2f4a2a).fillRect(40, 40, 320, 320);
        for (let i = 0; i < 70; i++) this.tree(g, rnd.between(48, 352), rnd.between(48, 352), rnd.between(10, 16));
      },
      // 12 — сквер: газон, дорожки крест-накрест, фонтан, скамейки
      (g) => {
        g.fillStyle(0x45603a).fillRect(40, 40, 320, 320);
        g.lineStyle(14, 0x6e6a5c);
        g.lineBetween(50, 50, 350, 350);
        g.lineBetween(350, 50, 50, 350);
        g.fillStyle(0x6e6a5c).fillCircle(200, 200, 44);
        g.fillStyle(0x2c4a5a).fillCircle(200, 200, 30); // фонтан
        g.fillStyle(0x7fb0c8).fillCircle(200, 200, 10);
        g.fillStyle(0x5a4632);
        for (const [x, y] of [[150, 120], [250, 280], [120, 250], [280, 150]]) g.fillRect(x - 10, y - 3, 20, 6);
        for (const [x, y] of [[60, 200], [340, 200], [200, 60], [200, 340], [100, 100], [300, 300], [300, 100], [100, 300]]) this.tree(g, x, y, 13);
      },
      // 13 — храм: зелёный квадрат, ограда — каменные столбы и металлические прутья, дорожка к входу
      (g) => {
        g.fillStyle(0x45603a).fillRect(60, 60, 280, 280);
        g.fillStyle(0x7a7468).fillRect(185, 270, 20, 70); // дорожка к ступеням с юга
        for (let i = 0; i <= 14; i++) {
          const k = 60 + i * 20;
          for (const [x, y] of [[k, 60], [k, 340], [60, k], [340, k]]) g.fillStyle(0xb8b0a0).fillRect(x - 4, y - 4, 8, 8); // столбы
        }
        g.lineStyle(2, 0x2a2a2a);
        g.strokeRect(60, 60, 280, 280); // прутья
        g.fillStyle(0x45603a).fillRect(186, 336, 18, 8); // калитка
        for (const [x, y] of [[90, 90], [90, 310], [310, 310], [110, 200], [330, 230]]) this.tree(g, x, y, 13);
      },
      // 14 — телецентр: бетонный двор, тарелки на крыше рисует стиль station
      (g) => {
        g.fillStyle(0x56585a).fillRect(40, 40, 320, 320);
        g.lineStyle(2, 0x7a7c80).strokeRect(44, 44, 312, 312); // ограда
        this.trees(g, rnd, 50, 50, 170, 160, 4);
      },
      // 15 — ТЭЦ: бетон, уголь, градирня-коробка
      (g) => {
        g.fillStyle(0x4a4c4e).fillRect(40, 40, 320, 320);
        g.fillStyle(0x1e1e20).fillEllipse(110, 175, 90, 34); // угольный склад
        g.fillStyle(0x2c2c30).fillEllipse(110, 172, 60, 20);
        g.fillStyle(0x5c5e60).fillRect(240, 150, 90, 40);    // трансформаторы
        g.lineStyle(1, 0x8a8c90);
        for (let x = 248; x < 330; x += 14) g.lineBetween(x, 150, x, 190);
      },
      // 16 — больница: газон, подъезд скорых, машины
      (g) => {
        g.fillStyle(0x45603a).fillRect(130, 80, 140, 80).fillRect(130, 240, 140, 90);
        g.fillStyle(0x6a6d70).fillRect(180, 230, 40, 120);      // подъезд
        this.ambulance(g, 196, 300);
        this.trees(g, rnd, 135, 90, 130, 60, 4);
        this.trees(g, rnd, 135, 250, 40, 70, 3);
      },
      // 17 — поликлиника: газон, скамейки
      (g) => {
        g.fillStyle(0x45603a).fillRect(210, 170, 140, 170);
        this.trees(g, rnd, 220, 180, 120, 150, 6);
        this.ambulance(g, 260, 180);
      },
      // 18 — школа: двор, стадион с беговой дорожкой и футбольным полем
      (g) => {
        g.fillStyle(0x8a4a3a).fillRoundedRect(70, 230, 260, 120, 50); // беговая дорожка
        g.fillStyle(0x4a7a3a).fillRoundedRect(90, 250, 220, 80, 36);  // поле
        g.lineStyle(2, 0xe0e0d0);
        g.strokeRect(130, 262, 140, 56);
        g.lineBetween(200, 262, 200, 318);
        g.strokeCircle(200, 290, 12);
        g.fillStyle(0x6a6d70).fillRect(130, 140, 140, 70);        // школьный двор
        this.trees(g, rnd, 135, 145, 130, 60, 3);
      },
      // 19 — детский сад: веранды, песочницы, качели, забор
      (g) => {
        g.fillStyle(0x4a6a3a).fillRect(60, 60, 280, 280);
        g.lineStyle(2, 0x6a8a5a).strokeRect(60, 60, 280, 280);
        // Веранды — выгоревшая краска: цвет угадывается, но не ярче заражённых и снарядов
        for (const [x, y, c] of [[240, 90, 0x9a6058], [240, 160, 0x5a7a92], [160, 230, 0x9a8a5a], [250, 250, 0x5e8058]]) {
          g.fillStyle(0x000000, 0.3).fillRect(x + 4, y + 4, 40, 26);
          g.fillStyle(c).fillRect(x, y, 40, 26);
          g.fillStyle(0x3a3a34).fillRect(x, y, 40, 3); // кромка крыши веранды
        }
        for (const [x, y] of [[100, 260], [150, 300], [290, 310]]) {
          g.fillStyle(0x6a5236).fillRect(x - 2, y - 2, 26, 26); // деревянный борт
          g.fillStyle(0xa89870).fillRect(x, y, 22, 22);        // песок
        }
        this.trees(g, rnd, 70, 220, 80, 110, 4);
      },
      // 20 — пожарная часть: двор, красные машины
      (g) => {
        g.fillStyle(0x56585a).fillRect(50, 150, 300, 200);
        for (const x of [80, 130, 180]) {
          // Пожарные машины, вид сверху: кабина спереди, лестница на крыше. Красный приглушён —
          // чистый красный в игре означает опасность
          g.fillStyle(0x000000, 0.3).fillRect(x + 4, 174, 28, 60);
          g.fillStyle(0x8e2e26).fillRect(x, 170, 28, 60);
          g.fillStyle(0x2a3540).fillRect(x + 4, 172, 20, 8);   // лобовое
          g.fillStyle(0x9a9a92).fillRect(x + 8, 186, 3, 40).fillRect(x + 17, 186, 3, 40); // лестница
          g.fillStyle(0x9a9a92);
          for (let y = 190; y < 226; y += 6) g.fillRect(x + 8, y, 12, 1);
        }
        this.trees(g, rnd, 260, 200, 80, 130, 4);
      },
      // 21 — милиция: стоянка с машинами (жёлтые с синей полосой)
      (g) => {
        g.fillStyle(0x56585a).fillRect(70, 180, 260, 150);
        for (const x of [90, 140, 190, 240]) {
          g.fillStyle(0xb8a058).fillRect(x, 200, 22, 40); // жёлтый приглушён — жёлтый в игре значит «внимание»
          g.fillStyle(0x2a5aa8).fillRect(x, 216, 22, 4);
          g.fillStyle(0x4a6070).fillRect(x + 3, 204, 16, 8);
        }
        g.lineStyle(1, 0xd0d0c0);
        for (let x = 84; x < 300; x += 50) g.lineBetween(x, 196, x, 246);
        this.trees(g, rnd, 80, 270, 240, 50, 5);
      },
      // 22 — магазины: площадка перед входом, лотки, ящики
      (g) => {
        g.fillStyle(0x6a6d70).fillRect(50, 130, 300, 70);
        g.fillStyle(0x8a6a4a);
        for (let x = 70; x < 330; x += 40) g.fillRect(x, 150, 24, 14); // лотки
        g.fillStyle(0x5a8ab0).fillRect(80, 220, 30, 20).fillRect(300, 230, 26, 18); // ларьки
        this.trees(g, rnd, 60, 250, 280, 90, 7);
      },
      // 23 — свалка: кучи мусора, покрышки, бульдозер
      (g) => {
        g.fillStyle(0x4a4436).fillRect(40, 40, 320, 320);
        for (let i = 0; i < 26; i++) {
          const x = rnd.between(60, 340);
          const y = rnd.between(60, 340);
          g.fillStyle(rnd.pick([0x5a5040, 0x6a6a60, 0x3a3a30, 0x7a6a50])).fillEllipse(x, y, rnd.between(24, 60), rnd.between(16, 40));
        }
        g.lineStyle(3, 0x1a1a1a);
        for (let i = 0; i < 8; i++) g.strokeCircle(rnd.between(70, 330), rnd.between(70, 330), 6); // покрышки
        g.fillStyle(0xd0a020).fillRect(250, 280, 34, 22);  // бульдозер
        g.fillStyle(0x3a3a3a).fillRect(244, 278, 6, 26);
      },
      // 24 — горисполком: гранитная площадь перед зданием, ели, флагштоки
      (g) => {
        g.fillStyle(0x6a6c70).fillRect(50, 180, 300, 170);
        g.lineStyle(1, 0x7a7c80);
        for (let x = 50; x < 350; x += 25) g.lineBetween(x, 180, x, 350);
        for (let y = 180; y < 350; y += 25) g.lineBetween(50, y, 350, y);
        g.fillStyle(0x8a8c90).fillRect(180, 180, 40, 170); // гранитная дорожка к входу
        for (const x of [120, 280]) {
          g.fillStyle(0x2a2418).fillRect(x - 1, 200, 2, 24);
          g.fillStyle(0xb03024).fillRect(x + 1, 200, 12, 7);  // флагштоки
        }
        g.fillStyle(0x24402a);
        for (const [x, y] of [[70, 80], [70, 130], [330, 80], [330, 130]]) g.fillTriangle(x - 10, y + 12, x + 10, y + 12, x, y - 14); // ели
      },
      // 25 — товарный двор: подъездные пути к складу, рампа, контейнеры
      (g) => {
        g.fillStyle(0x4a4c4e).fillRect(40, 40, 320, 320);
        g.fillStyle(0x5a5246).fillRect(338, 40, 30, 320);          // насыпь подъездного пути
        g.fillStyle(0x4a3a2a);
        for (let y = 42; y < 360; y += 10) g.fillRect(342, y, 22, 4);
        g.fillStyle(0x9aa0a6).fillRect(346, 40, 2, 320).fillRect(358, 40, 2, 320);
        g.fillStyle(0x7a7c80).fillRect(330, 50, 8, 300);           // рампа
        const box = [0x6a4a34, 0x3a5a6a, 0x5a6a3a];
        for (let k = 0; k < 6; k++) g.fillStyle(box[k % 3]).fillRect(70 + (k % 2) * 60, 80 + Math.floor(k / 2) * 80, 50, 22); // контейнеры
      },
      // 26 — гаражный кооператив: асфальтовые проезды между рядами
      (g) => {
        g.fillStyle(0x4a4c4e).fillRect(40, 40, 320, 320);
        g.fillStyle(0x3c3e40);
        for (const y of [96, 174, 252, 330]) g.fillRect(50, y, 300, 14);
        g.fillStyle(0x5a5040).fillRect(40, 40, 320, 6);           // забор кооператива
        this.trees(g, rnd, 50, 46, 300, 14, 4);
      },
      // 27–39 — деревня «Ольховка» (уровень 2)
      ...this.villageLayouts(rnd, s),
      // 40–47 — карьер «Гранитный» (уровень 3)
      ...this.quarryLayouts(rnd, s),
    ];

    layouts.forEach((draw, i) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      // Деревня и карьер: ни асфальта, ни тротуаров — трава (пыль) на весь квадрат, дороги кладёт GameScene поверх
      if (i >= VILLAGE_FROM) {
        g.fillStyle(i >= QUARRY_FROM ? Q.dust : V.grass).fillRect(0, 0, s, s);
        draw(g);
        this.makeTexture(g, `city${i}`, s, s);
        return;
      }
      g.fillStyle(P.asphalt);
      g.fillRect(0, 0, s, s);
      // Разметка по краям: половина линии на каждом квартале, вместе — одна линия
      g.fillStyle(P.roadMark);
      for (let d = 10; d < s; d += 40) {
        g.fillRect(d, 0, 20, 1);
        g.fillRect(d, s - 1, 20, 1);
        g.fillRect(0, d, 1, 20);
        g.fillRect(s - 1, d, 1, 20);
      }
      g.fillStyle(P.sidewalk);
      g.fillRect(CITY.road, CITY.road, s - CITY.road * 2, s - CITY.road * 2);
      g.fillStyle(P.yard);
      g.fillRect(CITY.road + 6, CITY.road + 6, s - CITY.road * 2 - 12, s - CITY.road * 2 - 12);
      draw(g);
      // Дома в квартал не запекаются: их рисует GameScene в виде 3/4 (Buildings) — фасад всегда к югу,
      // а квартал поворачивается
      this.makeTexture(g, `city${i}`, s, s);
    });
  }

  // Дерево: тень вправо-вниз (как у домов) и тёмная кромка кроны — иначе на газоне крона сливалась
  tree(g, x, y, r) {
    g.fillStyle(0x000000, 0.32);
    g.fillCircle(x + r * 0.35, y + r * 0.3, r);
    g.fillStyle(0x1e3220);
    g.fillCircle(x, y, r);
    g.fillStyle(P.tree);
    g.fillCircle(x - r * 0.12, y - r * 0.12, r * 0.82);
    g.fillStyle(P.treeLight);
    g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.45);
  }

  // Скорая помощь вид сверху: белая, красная полоса
  ambulance(g, x, y) {
    g.fillStyle(0xf0f0f0).fillRect(x - 10, y - 18, 20, 36);
    g.fillStyle(0xd03030).fillRect(x - 10, y - 2, 20, 4);
    g.fillStyle(0x4a6070).fillRect(x - 7, y - 15, 14, 7);
  }

  trees(g, rnd, x, y, w, h, n) {
    for (let i = 0; i < n; i++) {
      this.tree(g, x + rnd.between(10, w - 10), y + rnd.between(10, h - 10), rnd.between(8, 13));
    }
  }

  // Улица после катастрофы, вид сверху, нос вправо: брошенные легковушки, троллейбус, накрытое тело.
  // Без марок и моделей — обобщённые силуэты.
  makeStreetTextures() {
    const cars = [0x3d6fa8, 0xc9b98a, 0x9c3a33, 0x4f7a4a, 0xd8d4c8];
    cars.forEach((color, i) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x1c1f22);
      for (const [x, y] of [[4, 0], [19, 0], [4, 12], [19, 12]]) g.fillRect(x, y, 6, 2); // колёса
      g.fillStyle(color);
      g.fillRoundedRect(0, 1, 28, 12, 3);
      g.fillStyle(0x24303a);
      g.fillRect(17, 3, 4, 8); // лобовое
      g.fillRect(6, 3, 3, 8);  // заднее
      g.fillStyle(Phaser.Display.Color.ValueToColor(color).lighten(15).color);
      g.fillRect(9, 3, 8, 8);  // крыша
      g.lineStyle(1, 0x15181b);
      g.strokeRoundedRect(0, 1, 28, 12, 3);
      this.makeTexture(g, `car${i}`, 28, 14);
    });

    // Троллейбус: светлый кузов с красной полосой, ряд окон, штанги сорваны с проводов и висят в сторону
    let g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xe6dcc0);
    g.fillRoundedRect(0, 4, 66, 18, 3);
    g.fillStyle(0xb03a2e);
    g.fillRect(0, 11, 66, 4);
    g.fillStyle(0x2a3540);
    for (let x = 8; x < 58; x += 9) g.fillRect(x, 6, 6, 3);
    g.fillRect(58, 6, 6, 14);  // лобовое
    g.fillStyle(0x9aa0a6);
    g.fillRect(14, 8, 30, 10); // оборудование на крыше
    g.lineStyle(2, 0x2a2e33);
    g.lineBetween(14, 10, 46, 1);  // штанги — задраны и сорваны
    g.lineBetween(14, 16, 44, 25);
    g.lineStyle(1, 0x15181b);
    g.strokeRoundedRect(0, 4, 66, 18, 3);
    this.makeTexture(g, 'trolley', 66, 26);

    // Накрытое тело — серо-синяя ткань, без подробностей (тон игры — экшен, не хоррор)
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x6f7c86);
    g.fillEllipse(9, 4, 18, 7);
    g.lineStyle(1, 0x3c4349);
    g.strokeEllipse(9, 4, 18, 7);
    this.makeTexture(g, 'covered', 18, 8);
  }

  // Высокие сооружения, вид сверху. Высоту передаёт длинная тень, которую ставит AirObstacles.
  makeTowerTextures() {
    // Решётчатая радиовышка: сетчатая оболочка-гиперболоид, верхняя площадка, красный огонь
    let g = this.make.graphics({ x: 0, y: 0 }, false);
    const c = 45;
    g.lineStyle(2, 0x9aa3ab);
    for (const r of [40, 31, 22]) g.strokeCircle(c, c, r);
    g.lineStyle(1.5, 0x7d868e);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const b = a + Math.PI / 4; // наклонные стержни — сетка «крест-накрест»
      g.lineBetween(c + Math.cos(a) * 40, c + Math.sin(a) * 40, c + Math.cos(b) * 13, c + Math.sin(b) * 13);
      g.lineBetween(c + Math.cos(b) * 40, c + Math.sin(b) * 40, c + Math.cos(a) * 13, c + Math.sin(a) * 13);
    }
    g.fillStyle(0x5f676e);
    g.fillCircle(c, c, 12);
    g.fillStyle(0xff3b30);
    g.fillCircle(c, c, 4);
    g.lineStyle(2, 0x1c2126);
    g.strokeCircle(c, c, 42);
    this.makeTexture(g, 'towerRadio', 90, 90);

    // Водонапорная башня: круглый бак с кольцами и люком
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x8f9aa3);
    g.fillCircle(30, 30, 27);
    g.fillStyle(0xb4bec6);
    g.fillCircle(30, 30, 20);
    g.lineStyle(2, 0x6c7680);
    g.strokeCircle(30, 30, 13);
    g.fillStyle(0x4e565d);
    g.fillCircle(30, 30, 5);
    g.lineStyle(2, 0x1c2126);
    g.strokeCircle(30, 30, 28);
    this.makeTexture(g, 'towerWater', 60, 60);

    // Колокольня: белый четверик, ярус и зелёный купол со шпилем
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xd9d6cc);
    g.fillRect(3, 3, 38, 38);
    g.fillStyle(0xbcb8ac);
    g.fillRect(9, 9, 26, 26);
    g.fillStyle(0x3d6b4f);
    g.fillCircle(22, 22, 10);
    g.fillStyle(0xe0b84a);
    g.fillCircle(22, 22, 3);
    g.lineStyle(2, 0x1c2126);
    g.strokeRect(2, 2, 40, 40);
    this.makeTexture(g, 'towerBell', 44, 44);

    // Заводская труба: красно-белые кольца и чёрное жерло
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xb8473a);
    g.fillCircle(18, 18, 16);
    g.fillStyle(0xe8e2d6);
    g.fillCircle(18, 18, 12);
    g.fillStyle(0xb8473a);
    g.fillCircle(18, 18, 9);
    g.fillStyle(0x141414);
    g.fillCircle(18, 18, 6);
    g.lineStyle(2, 0x1c2126);
    g.strokeCircle(18, 18, 17);
    this.makeTexture(g, 'towerChimney', 36, 36);
  }

  // ── Деревня «Ольховка» (уровень 2) ─────────────────────────────────────────────────────────
  // Дороги: трасса — выгоревший асфальт, две полосы, белая прерывистая осевая, гравийные обочины;
  // грунтовка — две колеи и трава посередине. Куски 400 × N, длинная сторона по X (как 'avenue')
  makeVillageRoadTextures() {
    const W = CITY.tile;
    const rnd = new Phaser.Math.RandomDataGenerator(['olkhovka-roads']);
    let H = 100;
    let g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(V.grassDark, 0.7).fillRect(0, 0, W, 5).fillRect(0, H - 5, W, 5); // примятая трава
    g.fillStyle(0x5a564c).fillRect(0, 4, W, 8).fillRect(0, H - 12, W, 8);       // гравийные обочины
    for (let i = 0; i < 90; i++) {
      g.fillStyle(rnd.pick([0x6e695e, 0x48443c]));
      g.fillRect(rnd.between(0, W - 2), rnd.pick([rnd.between(4, 10), rnd.between(H - 12, H - 6)]), 2, 2);
    }
    g.fillStyle(0x35383a).fillRect(0, 11, W, H - 22); // асфальт — светлее городского, выгоревший
    // Заплатки и трещины — старая дорога; не у торцов куска, чтобы стыки не были видны
    for (let i = 0; i < 5; i++) g.fillStyle(0x2c2f31).fillRect(rnd.between(20, 330), rnd.between(16, 70), rnd.between(18, 46), rnd.between(8, 16));
    g.lineStyle(1, 0x232527, 0.9);
    for (let i = 0; i < 6; i++) {
      const x = rnd.between(30, 360);
      const y = rnd.between(16, 84);
      g.strokePoints([{ x, y }, { x: x + rnd.between(4, 14), y: y + rnd.between(-6, 6) }, { x: x + rnd.between(14, 28), y: y + rnd.between(-8, 8) }]);
    }
    g.fillStyle(0xa8a498, 0.75).fillRect(0, 15, W, 2).fillRect(0, H - 17, W, 2); // краевые линии
    g.fillStyle(0xc0bcae);
    for (let x = 8; x < W; x += 40) g.fillRect(x, H / 2 - 1, 24, 2);            // осевая, период 40 — стыкуется
    this.makeTexture(g, 'highway', W, H);

    H = 48;
    g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(V.earth, 0.45).fillRect(0, 2, W, H - 4);
    g.fillStyle(V.earth).fillRect(0, 7, W, H - 14);
    // Неровные края — земля проступает в траву; не у торцов куска
    for (let x = 18; x < W - 18; x += rnd.between(10, 18)) {
      g.fillEllipse(x, rnd.pick([6, H - 6]), rnd.between(10, 24), rnd.between(4, 7));
    }
    g.fillStyle(V.rut).fillRect(0, 11, W, 6).fillRect(0, H - 17, W, 6);         // колеи
    g.fillStyle(0x2e2a24, 0.5).fillRect(0, 13, W, 2).fillRect(0, H - 15, W, 2);
    g.fillStyle(V.grassDark).fillRect(0, 19, W, 10);                            // трава между колеями
    g.fillStyle(V.grassLight);
    for (let i = 0; i < 70; i++) g.fillRect(rnd.between(0, W - 1), rnd.between(19, 27), 1, 3);
    for (let i = 0; i < 4; i++) g.fillStyle(0x363c3e, 0.85).fillEllipse(rnd.between(50, 350), rnd.pick([14, H - 14]), rnd.between(14, 26), 6); // лужи в колее
    this.makeTexture(g, 'dirt', W, H);
  }

  // Силосная башня / элеватор в 3/4: бетонный цилиндр со светотенью (свет слева), поясные кольца,
  // металлический купол, лестница по теневой стороне. Основание — на 0.88 высоты кадра
  makeSiloTexture() {
    const W = 60;
    const H = 150;
    const cx = 30;
    const rx = 22;
    const ry = 7;
    const top = 36;
    const base = Math.round(H * 0.88);
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const lerp = (a, b, k) => {
      const ch = (sh) => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k);
      return (ch(16) << 16) | (ch(8) << 8) | ch(0);
    };
    const curve = (x) => ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)); // нижняя дуга эллипса
    g.fillStyle(0x000000, 0.35).fillEllipse(cx + 2, base + 1, rx * 2 + 8, ry * 2 + 6); // пятно у основания
    g.fillStyle(0x56544e).fillEllipse(cx, base + 1, rx * 2 + 6, ry * 2 + 4);         // бетонный цоколь
    // Ствол: столбцы по 2 px, яркость по нормали к свету
    for (let x = cx - rx; x < cx + rx; x += 2) {
      const n = (x + 1 - cx) / rx;
      const k = Phaser.Math.Clamp(0.25 + 0.75 * (Math.sqrt(Math.max(0, 1 - n * n)) * 0.55 - n * 0.6 + 0.2), 0, 1);
      g.fillStyle(lerp(0x4e4c46, 0x9e9a8e, k));
      g.fillRect(x, top, 2, base - top + curve(x + 1));
      // Поясные кольца по дуге
      g.fillStyle(0x000000, 0.28);
      for (let ry0 = top + 14; ry0 < base - 4; ry0 += 16) g.fillRect(x, ry0 + curve(x + 1), 2, 2);
      g.fillStyle(0xffffff, 0.08);
      for (let ry0 = top + 14; ry0 < base - 4; ry0 += 16) g.fillRect(x, ry0 + curve(x + 1) - 1, 2, 1);
    }
    // Потёки ржавчины
    g.fillStyle(0x5a4030, 0.35);
    for (const [x, len] of [[cx - 8, 30], [cx + 4, 46], [cx + 12, 22]]) g.fillRect(x, top + 6, 2, len);
    // Лестница в каркасе — по теневой стороне
    const lx = cx + rx * 0.55;
    g.lineStyle(1, 0x2a2a28, 0.9).lineBetween(lx, top, lx, base + 4).lineBetween(lx + 4, top, lx + 4, base + 3);
    for (let y = top + 2; y < base; y += 4) g.lineBetween(lx, y, lx + 4, y);
    // Купол: верхняя полуось 16 px над краем ствола
    const dome = [];
    for (let i = 0; i <= 16; i++) {
      const t = (i / 16) * Math.PI;
      dome.push({ x: cx + rx * Math.cos(t), y: top - 16 * Math.sin(t) });
    }
    for (let i = 0; i <= 16; i++) {
      const t = Math.PI + (i / 16) * Math.PI;
      dome.push({ x: cx + rx * Math.cos(t), y: top - ry * Math.sin(t) });
    }
    g.fillStyle(0x5e625e).fillPoints(dome, true);
    g.fillStyle(0x7e827c).fillEllipse(cx - 6, top - 6, 22, 14);
    g.fillStyle(0x9a9e96).fillEllipse(cx - 9, top - 9, 8, 5); // блик
    g.lineStyle(1, 0x3a3c3a).strokePoints(dome, true);
    g.fillStyle(0x3a3c3a).fillRect(cx - 3, top - 19, 6, 4);  // люк-вентиляция на макушке
    this.makeTexture(g, 'towerSilo', W, H);
  }

  // Трава с пятнами темнее/светлее: поле не выглядит заливкой. Пятна не заходят за край прямоугольника —
  // стыки кварталов не видны
  vGround(g, rnd, x, y, w, h, color, n, dark = V.grassDark, light = V.grassLight) {
    g.fillStyle(color).fillRect(x, y, w, h);
    for (let i = 0; i < n; i++) {
      const rw = rnd.between(16, 50);
      const rh = rnd.between(10, 30);
      g.fillStyle(rnd.frac() < 0.5 ? dark : light, 0.5);
      g.fillEllipse(rnd.realInRange(x + rw / 2, x + w - rw / 2), rnd.realInRange(y + rh / 2, y + h - rh / 2), rw, rh);
    }
  }

  // Пучки травы — короткие штрихи
  vTufts(g, rnd, x, y, w, h, n, color = V.grassLight) {
    g.fillStyle(color);
    for (let i = 0; i < n; i++) g.fillRect(rnd.between(x, x + w - 1), rnd.between(y, y + h - 3), 1, 3);
  }

  // Штакетник: тень, жердь и торцы досок
  vFence(g, x1, y1, x2, y2) {
    g.lineStyle(2, 0x000000, 0.28).lineBetween(x1 + 2, y1 + 2, x2 + 2, y2 + 2);
    g.lineStyle(2, V.wood).lineBetween(x1, y1, x2, y2);
    const len = Math.hypot(x2 - x1, y2 - y1);
    g.fillStyle(V.woodLight);
    for (let d = 0; d <= len; d += 4) {
      const k = d / len;
      g.fillRect(x1 + (x2 - x1) * k - 0.5, y1 + (y2 - y1) * k - 0.5, 1.5, 1.5);
    }
  }

  // Штакетник вокруг участка; gate — { side: 'n'|'s'|'w'|'e', at: координата середины калитки }
  vFenceRect(g, x, y, w, h, gate = null) {
    const sides = {
      n: [x, y, x + w, y],
      s: [x, y + h, x + w, y + h],
      w: [x, y, x, y + h],
      e: [x + w, y, x + w, y + h],
    };
    for (const [k, [x1, y1, x2, y2]] of Object.entries(sides)) {
      if (gate?.side !== k) {
        this.vFence(g, x1, y1, x2, y2);
        continue;
      }
      const horiz = y1 === y2;
      const a = gate.at - 7;
      const b = gate.at + 7;
      if (horiz) this.vFence(g, x1, y1, a, y1), this.vFence(g, b, y1, x2, y2);
      else this.vFence(g, x1, y1, x1, a), this.vFence(g, x1, b, x2, y2);
    }
  }

  // Загон из жердей: две жерди и столбы
  vRails(g, x1, y1, x2, y2) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const nx = (-(y2 - y1) / len) * 2;
    const ny = ((x2 - x1) / len) * 2;
    g.lineStyle(1, 0x000000, 0.3).lineBetween(x1 + 2, y1 + 2, x2 + 2, y2 + 2);
    g.lineStyle(1, V.woodLight).lineBetween(x1, y1, x2, y2).lineBetween(x1 + nx, y1 + ny, x2 + nx, y2 + ny);
    g.fillStyle(V.woodDark);
    for (let d = 0; d <= len; d += 14) {
      const k = d / len;
      g.fillRect(x1 + (x2 - x1) * k - 1.5, y1 + (y2 - y1) * k - 1.5, 3, 3);
    }
  }

  vRailsRect(g, x, y, w, h) {
    this.vRails(g, x, y, x + w, y);
    this.vRails(g, x + w, y, x + w, y + h);
    this.vRails(g, x, y + h, x + w, y + h);
    this.vRails(g, x, y, x, y + h);
  }

  // Повёрнутый многоугольник: точки в локальных координатах (нос — вправо), угол a
  vPoly(g, cx, cy, a, pts) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    g.fillPoints(pts.map(([x, y]) => ({ x: cx + x * c - y * s, y: cy + x * s + y * c })), true);
  }

  vBox(g, cx, cy, a, x0, y0, w, h) {
    this.vPoly(g, cx, cy, a, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]]);
  }

  // Колея трактора: две параллельные полосы вдоль ломаной
  vRuts(g, pts, gap = 5, color = V.rut, alpha = 0.75, width = 3) {
    for (const side of [-1, 1]) {
      const off = pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const l = Math.hypot(dx, dy) || 1;
        return { x: p[0] - (dy / l) * gap * side, y: p[1] + (dx / l) * gap * side };
      });
      g.lineStyle(width, color, alpha).strokePoints(off, false);
    }
  }

  // Утоптанная тропа/дорожка вдоль ломаной, скруглённая на изломах
  vPath(g, pts, width, color, alpha = 1) {
    g.lineStyle(width, color, alpha).strokePoints(pts.map(([x, y]) => ({ x, y })), false);
    g.fillStyle(color, alpha);
    for (const [x, y] of pts.slice(1, -1)) g.fillCircle(x, y, width / 2);
  }

  // Грядки рядами поперёк участка; ботва — зелёные точки, часть грядок пустая
  vBeds(g, rnd, x, y, w, h, skip = null) {
    for (let by = y + 3; by < y + h - 6; by += 9) {
      const pieces = skip && by + 6 > skip[1] && by < skip[1] + skip[3]
        ? [[x + 3, skip[0] - x - 3], [skip[0] + skip[2], x + w - 3 - skip[0] - skip[2]]]
        : [[x + 3, w - 6]];
      const crop = rnd.pick([0x4e6236, 0x56683a, 0x46582e, null]);
      for (const [bx, bw] of pieces) {
        if (bw < 12) continue;
        g.fillStyle(V.soil).fillRect(bx, by, bw, 6);
        g.fillStyle(0x3a2e20).fillRect(bx, by + 5, bw, 1);
        if (!crop) continue;
        g.fillStyle(crop);
        for (let px = bx + 2; px < bx + bw - 2; px += 4) g.fillCircle(px, by + 2.5, 1.8);
      }
    }
  }

  // Яблоня: круглая крона с тенью и редкие приглушённые яблоки
  vApple(g, rnd, x, y, r) {
    g.fillStyle(0x000000, 0.3).fillCircle(x + r * 0.35, y + r * 0.3, r);
    g.fillStyle(0x263a22).fillCircle(x, y, r);
    g.fillStyle(0x38522e).fillCircle(x - r * 0.1, y - r * 0.1, r * 0.82);
    g.fillStyle(0x48623a).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.42);
    g.fillStyle(0x8a5a34);
    for (let i = 0; i < 4; i++) g.fillCircle(x + rnd.realInRange(-r * 0.6, r * 0.6), y + rnd.realInRange(-r * 0.6, r * 0.6), 1.2);
  }

  // Ель сверху: звезда из лап, тёмная сине-зелёная
  vSpruce(g, x, y, r) {
    const star = (cx, cy, rr) => {
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const d = i % 2 ? rr * 0.55 : rr;
        pts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d });
      }
      g.fillPoints(pts, true);
    };
    g.fillStyle(0x000000, 0.32);
    star(x + r * 0.35, y + r * 0.3, r);
    g.fillStyle(0x1a2c20);
    star(x, y, r);
    g.fillStyle(0x264030);
    star(x - r * 0.1, y - r * 0.1, r * 0.62);
    g.fillStyle(0x32503a).fillCircle(x - r * 0.15, y - r * 0.15, r * 0.18);
  }

  // Берёза: светлая ажурная крона, белый штрих ствола
  vBirch(g, x, y, r) {
    g.fillStyle(0x000000, 0.28).fillCircle(x + r * 0.35, y + r * 0.3, r);
    g.fillStyle(0x3a4a2a).fillCircle(x, y, r);
    g.fillStyle(0x52623a);
    g.fillCircle(x - r * 0.3, y - r * 0.1, r * 0.5).fillCircle(x + r * 0.25, y - r * 0.25, r * 0.45).fillCircle(x, y + r * 0.3, r * 0.45);
    g.fillStyle(0x667644).fillCircle(x - r * 0.35, y - r * 0.35, r * 0.3);
    g.fillStyle(0xbab6a8).fillRect(x + r * 0.25, y + r * 0.35, 1, 3);
  }

  vBush(g, x, y, r) {
    g.fillStyle(0x000000, 0.25).fillCircle(x + 2, y + 2, r);
    g.fillStyle(0x2a3a22).fillCircle(x, y, r);
    g.fillStyle(0x3a4c2c).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.55);
  }

  // Стог сена в 3/4: основание, купол, шест
  vStack(g, x, y, r) {
    g.fillStyle(0x000000, 0.3).fillEllipse(x + r * 0.7, y + r * 0.4, r * 2.4, r * 1.5);
    g.fillStyle(0x6a6040).fillEllipse(x, y, r * 2, r * 1.5);
    g.fillStyle(V.straw).fillCircle(x - r * 0.1, y - r * 0.35, r * 0.85);
    g.fillStyle(0x968a5c).fillCircle(x - r * 0.4, y - r * 0.6, r * 0.38);
    g.lineStyle(1, 0x5a5034, 0.6).lineBetween(x - r * 0.8, y, x + r * 0.7, y + r * 0.15);
    g.lineStyle(1.5, 0x3a3020).lineBetween(x - r * 0.1, y - r * 1.1, x - r * 0.1, y - r * 1.7);
  }

  // Колодец-журавль: сруб, вода, столб и длинный шест с ведром и противовесом
  vWell(g, x, y) {
    g.fillStyle(0x000000, 0.3).fillRect(x - 5, y - 5, 14, 14);
    g.fillStyle(0x5a4a34).fillRect(x - 7, y - 7, 14, 14);
    g.fillStyle(V.woodLight).fillRect(x - 7, y - 7, 14, 2).fillRect(x - 7, y - 7, 2, 14);
    g.fillStyle(0x161c1e).fillRect(x - 4, y - 4, 8, 8);
    g.lineStyle(2, 0x000000, 0.25).lineBetween(x + 4, y + 4, x + 42, y + 22);
    g.lineStyle(2, 0x6e5e42).lineBetween(x, y, x + 38, y + 17);
    g.fillStyle(0x3a2e20).fillCircle(x + 22, y + 10, 2.5);  // столб-развилка
    g.fillStyle(0x50504c).fillRect(x - 2, y - 2, 4, 4);     // ведро
    g.fillStyle(0x4a3c2a).fillRect(x + 35, y + 14, 6, 6);   // противовес
  }

  // Поленница: торцы поленьев
  vWoodpile(g, x, y, w, h) {
    g.fillStyle(0x000000, 0.28).fillRect(x + 2, y + 2, w, h);
    g.fillStyle(0x5a4630).fillRect(x, y, w, h);
    g.fillStyle(0x8a7450);
    for (let py = y + 2; py < y + h - 1; py += 3) for (let px = x + 2; px < x + w - 1; px += 3) g.fillCircle(px, py, 1.1);
  }

  vBench(g, x, y, vertical = false) {
    const [w, h] = vertical ? [4, 14] : [14, 4];
    g.fillStyle(0x000000, 0.3).fillRect(x + 2, y + 2, w, h);
    g.fillStyle(0x6a5438).fillRect(x, y, w, h);
    g.fillStyle(0x8a7454).fillRect(x, y, w, 1);
  }

  // Пятиконечная звезда
  vStar(g, x, y, r, color) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const d = i % 2 ? r * 0.42 : r;
      pts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
    }
    g.fillStyle(color).fillPoints(pts, true);
  }

  // Обелиск павшим в 3/4: ступень, гранёный шпиль (правая грань в тени), звезда наверху. y — основание
  vObelisk(g, x, y) {
    g.fillStyle(0x000000, 0.3).fillEllipse(x + 12, y + 2, 34, 10);
    g.fillStyle(0x5e605e).fillRect(x - 11, y - 6, 22, 9);
    g.fillStyle(0x86887f).fillRect(x - 11, y - 8, 22, 3);
    g.fillStyle(0x9a9a92).fillPoints([{ x: x - 5, y: y - 7 }, { x: x + 5, y: y - 7 }, { x: x + 2, y: y - 38 }, { x: x - 2, y: y - 38 }], true);
    g.fillStyle(0x76766e).fillPoints([{ x, y: y - 7 }, { x: x + 5, y: y - 7 }, { x: x + 2, y: y - 38 }, { x, y: y - 38 }], true);
    this.vStar(g, x, y - 42, 5, 0x9a3028); // тёмно-красная, не «опасность»
  }

  // Доска объявлений на двух столбах: листки без текста
  vBoard(g, x, y) {
    g.fillStyle(0x000000, 0.3).fillRect(x - 8, y + 2, 24, 4);
    g.lineStyle(2, 0x3a2e20).lineBetween(x - 9, y, x - 9, y - 10).lineBetween(x + 9, y, x + 9, y - 10);
    g.fillStyle(0x5a4630).fillRect(x - 12, y - 20, 24, 12);
    g.fillStyle(0x3a2e20).fillRect(x - 13, y - 22, 26, 2);
    g.fillStyle(0xa8a494);
    g.fillRect(x - 10, y - 18, 5, 6).fillRect(x - 3, y - 17, 5, 7).fillRect(x + 4, y - 18, 6, 5);
  }

  // Трактор сверху, нос вправо: большие задние колёса, капот, кабина. Цвет — выгоревший
  vTractor(g, x, y, a, body) {
    g.fillStyle(0x000000, 0.3);
    this.vBox(g, x + 3, y + 3, a, -13, -11, 29, 22);
    g.fillStyle(0x1a1a18);
    this.vBox(g, x, y, a, -14, -12, 12, 6);
    this.vBox(g, x, y, a, -14, 6, 12, 6);
    this.vBox(g, x, y, a, 8, -9, 7, 3);
    this.vBox(g, x, y, a, 8, 6, 7, 3);
    g.fillStyle(body);
    this.vBox(g, x, y, a, -12, -5, 28, 10);
    g.fillStyle(0xffffff, 0.15);
    this.vBox(g, x, y, a, 2, -4, 13, 3);
    g.fillStyle(0x323a40);
    this.vBox(g, x, y, a, -13, -7, 12, 14);
    g.fillStyle(0x8a8c86);
    this.vBox(g, x, y, a, -12, -6, 9, 12);
    g.fillStyle(0x222220);
    this.vBox(g, x, y, a, 5, -5, 2, 2);
  }

  // Комбайн сверху, нос вправо: жатка во всю ширину, бункер, кабина, шнек выгрузки
  vCombine(g, x, y, a) {
    g.fillStyle(0x000000, 0.3);
    this.vBox(g, x + 4, y + 4, a, -24, -14, 44, 28);
    this.vBox(g, x + 4, y + 4, a, 20, -30, 10, 60);
    g.fillStyle(0x1a1a18);
    this.vBox(g, x, y, a, 4, -17, 13, 6);
    this.vBox(g, x, y, a, 4, 11, 13, 6);
    this.vBox(g, x, y, a, -22, -13, 8, 3);
    this.vBox(g, x, y, a, -22, 10, 8, 3);
    g.fillStyle(0x7e4a3a);
    this.vBox(g, x, y, a, -24, -11, 42, 22);
    g.fillStyle(0x5a362a);
    this.vBox(g, x, y, a, -16, -8, 18, 16);
    g.fillStyle(0x3a2a20);
    this.vBox(g, x, y, a, -14, -6, 14, 12);
    g.fillStyle(0x323a40);
    this.vBox(g, x, y, a, 9, -5, 9, 10);
    g.fillStyle(0x9a9c96);
    this.vBox(g, x, y, a, 10, -4, 7, 8);
    g.fillStyle(0x6a6a64);
    this.vBox(g, x, y, a, 20, -29, 9, 58);
    g.fillStyle(0x4a4a46);
    for (let k = -26; k < 28; k += 6) this.vBox(g, x, y, a, 21, k, 7, 1);
    g.fillStyle(0x5e5e58);
    this.vBox(g, x, y, a, -12, -23, 4, 12);
  }

  vBarrel(g, x, y, c) {
    g.fillStyle(0x000000, 0.3).fillCircle(x + 2, y + 2, 5);
    g.fillStyle(c).fillCircle(x, y, 5);
    g.lineStyle(1, 0x1a1a1a, 0.6).strokeCircle(x, y, 5).strokeCircle(x, y, 3);
    g.fillStyle(0x1a1a1a, 0.6).fillCircle(x + 2, y - 1, 1.2);
  }

  // Поле: межа травы по краю (между соседними полями — заметная граница при любом повороте),
  // внутри — ряды культуры и технологическая колея трактора вдоль рядов
  vField(g, rnd, kind) {
    const s = CITY.tile;
    const m = 6; // межа
    this.vTufts(g, rnd, 0, 0, s, m, 60);
    this.vTufts(g, rnd, 0, s - m, s, m, 60);
    this.vTufts(g, rnd, 0, 0, m, s, 60);
    this.vTufts(g, rnd, s - m, 0, m, s, 60);
    const F = s - m * 2;
    if (kind === 'wheat') {
      g.fillStyle(0x787050).fillRect(m, m, F, F);
      for (let i = 0; i < 18; i++) {
        g.fillStyle(rnd.frac() < 0.55 ? 0x847a56 : 0x686044, 0.5);
        const w = rnd.between(40, 110);
        const h = rnd.between(14, 34);
        g.fillEllipse(rnd.realInRange(m + w / 2, s - m - w / 2), rnd.realInRange(m + h / 2, s - m - h / 2), w, h); // волны ветра
      }
      g.fillStyle(0x5c5640, 0.7).fillEllipse(110, 250, 46, 26).fillEllipse(290, 150, 30, 18); // полёгшие пятна
      g.fillStyle(0x625a40, 0.55);
      for (let y = m + 2; y < s - m; y += 4) g.fillRect(m, y, F, 1);
      g.fillStyle(0x6a7a96);
      for (let i = 0; i < 26; i++) g.fillRect(rnd.between(m, s - m - 2), rnd.between(m, s - m - 2), 1.5, 1.5); // васильки
      for (const y of [100, 300]) this.vRuts(g, [[m, y], [s - m, y]], 5, 0x564e36, 0.9, 2);
    } else if (kind === 'potato') {
      g.fillStyle(V.soil).fillRect(m, m, F, F);
      for (let y = m + 2; y < s - m - 4; y += 10) {
        g.fillStyle(0x58483a).fillRect(m, y, F, 5);         // гребни
        g.fillStyle(0x382c20).fillRect(m, y + 6, F, 2);     // борозды
        if (y > 186 && y < 214) continue;                   // колея — ботва выбита
        for (let x = m + 3; x < s - m - 3; x += rnd.between(4, 7)) {
          if (x > 250 && y < 130) continue;                 // угол уже выкопан
          g.fillStyle(rnd.frac() < 0.75 ? 0x46562e : 0x56663a).fillCircle(x, y + 2.5, rnd.realInRange(1.8, 2.8));
        }
      }
      // Выкопанный угол: мешки с картошкой
      for (let i = 0; i < 8; i++) {
        const x = rnd.between(262, 380);
        const y = rnd.between(18, 118);
        g.fillStyle(0x000000, 0.3).fillRect(x + 1, y + 1, 6, 8);
        g.fillStyle(0x7e7056).fillRect(x, y, 6, 8);
        g.fillStyle(0x5a4c38).fillRect(x + 1, y, 4, 1);
      }
      this.vRuts(g, [[m, 200], [s - m, 200]], 5, 0x302418, 0.9, 3);
    } else {
      g.fillStyle(0x4a4230).fillRect(m, m, F, F);
      for (let y = m + 4; y < s - m - 6; y += 12) {
        if (y > 188 && y < 206) continue; // колея между рядами
        g.fillStyle(0x30442a).fillRect(m, y, F, 7);
        g.lineStyle(1, 0x4a6036, 0.9);
        for (let x = m + 2; x < s - m - 4; x += 4) {
          const up = (x >> 2) % 2 ? -1 : 1;
          g.lineBetween(x, y + 3.5, x + 3, y + 3.5 + up * 4);
        }
        g.fillStyle(0x6e6a44);
        for (let x = m + rnd.between(2, 9); x < s - m - 2; x += rnd.between(12, 26)) g.fillRect(x, y + 2, 2, 2); // метёлки
      }
      this.vRuts(g, [[m, 197], [s - m, 197]], 5, 0x342a1c, 0.9, 3);
    }
  }

  // Кварталы 27–39 — индекс в массиве makeCityTiles = номер вида в cityLayout (BUILDINGS, BUILDING_STYLE)
  villageLayouts(rnd, s) {
    return [
      // 27 — избы с огородами. Квартал поворачивается случайно, поэтому он симметричен: улица крестом
      // с кругом посередине (стыкуется с соседями в любом повороте), четыре участка за штакетником по углам
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, V.grass, 30);
        this.vTufts(g, rnd, 0, 0, s, s, 160);
        // Улица: трава, посередине — утоптанные колеи
        g.lineStyle(26, V.earth, 0.55).strokeCircle(200, 200, 66);
        for (const [a, b] of [[[0, 200], [134, 200]], [[266, 200], [400, 200]], [[200, 0], [200, 134]], [[200, 266], [200, 400]]]) {
          this.vPath(g, [a, b], 26, V.earth, 0.55);
          this.vRuts(g, [a, b], 6, V.rut, 0.55, 2);
        }
        g.lineStyle(2, V.rut, 0.55).strokeCircle(200, 200, 60).strokeCircle(200, 200, 72);
        // Участки: в локальных координатах северо-западного, отражаются по осям
        const house = [60, 60, 64, 52]; // пятно избы (как в BUILDINGS[27])
        for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const X = (x, w = 0) => (fx ? s - x - w : x);
          const Y = (y, h = 0) => (fy ? s - y - h : y);
          const hx = X(house[0], house[2]);
          const hy = Y(house[1], house[3]);
          const px = X(14, 130);
          const py = Y(14, 130);
          g.fillStyle(0x4e5836).fillRect(px, py, 130, 130);
          // Двор у избы: от крыши (она поднята на высоту дома) до палисадника
          const yard = [hx - 10, hy - 22, house[2] + 20, house[3] + 40];
          this.vBeds(g, rnd, px, py, 130, 130, yard);
          g.fillStyle(V.earth, 0.6).fillRect(...yard);
          // Палисадник перед фасадом (фасад всегда к югу)
          g.fillStyle(0x3e4a2e).fillRect(hx + 4, hy + house[3] + 4, house[2] - 8, 10);
          g.fillStyle(0x9a7a7a);
          for (let x = hx + 7; x < hx + house[2] - 6; x += 5) g.fillRect(x, hy + house[3] + 7 + (x % 3), 1.5, 1.5);
          this.vFenceRect(g, hx + 4, hy + house[3] + 4, house[2] - 8, 10);
          this.vWoodpile(g, fx ? hx - 12 : hx + house[2] + 5, hy + 10, 7, 30);
          this.vApple(g, rnd, X(32), Y(32), 12);
          this.vApple(g, rnd, X(128), Y(30), 10);
          // Калитка — к поперечной улице
          this.vFenceRect(g, px, py, 130, 130, { side: fy ? 'n' : 's', at: X(116) });
        }
        // Середина: изба на кругу, её палисадник и колодец-журавль у дороги
        g.fillStyle(V.earth, 0.5).fillRect(162, 156, 76, 92);
        g.fillStyle(0x3e4a2e).fillRect(174, 230, 52, 10);
        this.vFenceRect(g, 174, 230, 52, 10);
        this.vWell(g, 86, 232);
        this.vBench(g, 52, 166);
        for (const [x, y] of [[40, 166], [360, 236], [166, 360], [236, 40]]) this.vBirch(g, x, y, 10);
      },
      // 28 — центр деревни: утоптанная площадь перед сельсоветом и клубом, обелиск со звездой в клумбе,
      // доска объявлений, скамейки, тополя за домами
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, V.grass, 26);
        this.vTufts(g, rnd, 0, 0, s, s, 120);
        g.fillStyle(V.packed).fillRect(34, 128, 332, 108);
        for (let x = 44; x < 360; x += 18) {
          g.fillEllipse(x, 128, rnd.between(14, 26), 8).fillEllipse(x + 6, 236, rnd.between(14, 26), 8);
        }
        for (let i = 0; i < 12; i++) g.fillStyle(V.earth, 0.45).fillEllipse(rnd.between(60, 340), rnd.between(140, 226), rnd.between(16, 40), rnd.between(8, 16));
        g.fillStyle(0x363e40, 0.8).fillEllipse(110, 214, 30, 9).fillEllipse(286, 222, 20, 7); // лужи
        this.vPath(g, [[200, 296], [200, 400]], 18, V.packed);
        // Клумба и обелиск между сельсоветом и клубом
        g.fillStyle(0x8a8a82).fillCircle(200, 162, 24);
        g.fillStyle(0x3e4a2e).fillCircle(200, 162, 22);
        g.fillStyle(0x8a5a5a);
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2;
          g.fillCircle(200 + Math.cos(a) * 17, 162 + Math.sin(a) * 17, 1.5);
        }
        this.vObelisk(g, 200, 170);
        this.vBoard(g, 302, 158);
        this.vBoard(g, 96, 158);
        for (const [x, y] of [[140, 146], [246, 146], [60, 226], [326, 226]]) this.vBench(g, x, y);
        // Ящики у магазина
        g.fillStyle(0x000000, 0.3).fillRect(272, 272, 18, 12);
        g.fillStyle(0x6a5a40).fillRect(270, 270, 8, 8).fillRect(279, 270, 8, 8).fillRect(274, 262, 8, 8);
        // Палисадник у крыльца магазина
        this.vFenceRect(g, 150, 300, 40, 12);
        this.vFenceRect(g, 210, 300, 40, 12);
        // Тополя за домами, берёзы по краям
        for (let x = 30; x <= 370; x += 42) this.tree(g, x, 24, rnd.between(9, 12));
        for (const [x, y] of [[22, 300], [24, 360], [100, 350], [300, 352], [376, 300], [378, 362]]) this.vBirch(g, x, y, rnd.between(9, 12));
      },
      // 29 — коровники МТФ: вытоптанная земля, навозные кучи у торцов, загон с кормушками,
      // бетонная площадка под силосной башней, тракторная колея
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, V.grass, 24);
        g.fillStyle(V.earth).fillRect(26, 36, 310, 262);
        for (let i = 0; i < 22; i++) g.fillStyle(V.mud, 0.5).fillEllipse(rnd.between(40, 320), rnd.between(50, 290), rnd.between(20, 50), rnd.between(10, 24));
        g.fillStyle(0x56544e).fillCircle(345, 112, 30);
        g.fillStyle(0x64625c).fillCircle(345, 110, 25);
        this.vRuts(g, [[322, 400], [324, 300], [320, 200], [324, 140], [340, 138]], 5, V.rut, 0.8, 3);
        this.vRuts(g, [[0, 126], [120, 128], [250, 124], [322, 126]], 5, V.rut, 0.7, 3);
        this.vRuts(g, [[0, 216], [140, 214], [322, 216]], 5, V.rut, 0.7, 3);
        for (const y of [81, 171, 261]) {
          g.fillStyle(V.dung).fillEllipse(316, y, 26, 32);
          g.fillStyle(0x4a3c26).fillEllipse(313, y - 4, 16, 18);
          g.fillStyle(V.straw, 0.6);
          for (let i = 0; i < 8; i++) g.fillRect(rnd.between(304, 328), rnd.between(y - 14, y + 12), 3, 1);
        }
        // Загон на выгул
        g.fillStyle(V.mud).fillRect(44, 306, 230, 78);
        for (let i = 0; i < 14; i++) g.fillStyle(V.earth, 0.6).fillEllipse(rnd.between(60, 260), rnd.between(316, 376), rnd.between(10, 30), rnd.between(6, 14));
        for (const [x, y] of [[70, 326], [160, 326], [70, 360], [160, 360]]) {
          g.fillStyle(0x000000, 0.3).fillRect(x + 2, y + 2, 56, 7);
          g.fillStyle(V.woodDark).fillRect(x, y, 56, 7);
          g.fillStyle(V.straw).fillRect(x + 2, y + 2, 52, 3);
        }
        this.vRailsRect(g, 44, 306, 230, 78);
        this.vStack(g, 362, 206, 13);
        this.vStack(g, 366, 256, 11);
        for (const [x, y] of [[24, 20], [370, 370], [300, 380]]) this.vBush(g, x, y, 9);
      },
      // 30 — место сбора у МТФ: вытоптанная грязь вокруг ямы (её рисует Lab), колеи к ней, загон, сарай
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, V.grass, 26);
        this.vTufts(g, rnd, 0, 0, s, s, 100);
        g.fillStyle(V.earth, 0.9).fillCircle(200, 205, 108);
        for (let i = 0; i < 20; i++) {
          const a = rnd.realInRange(0, Math.PI * 2);
          const r = rnd.realInRange(60, 110);
          g.fillStyle(rnd.pick([V.mud, V.earth, V.dung]), 0.6).fillEllipse(200 + Math.cos(a) * r, 205 + Math.sin(a) * r, rnd.between(16, 40), rnd.between(10, 22));
        }
        this.vRuts(g, [[200, 400], [206, 330], [200, 262]], 5, V.rut, 0.85, 3);
        this.vRuts(g, [[400, 236], [320, 226], [262, 214]], 5, V.rut, 0.85, 3);
        this.vRuts(g, [[0, 300], [90, 282], [146, 240]], 5, V.rut, 0.85, 3);
        g.fillStyle(V.earth, 0.7).fillRect(40, 96, 140, 30); // двор у сарая
        for (const [x, y, a] of [[196, 80, 0.1], [200, 88, -0.05], [194, 96, 0.2]]) {
          g.fillStyle(0x000000, 0.3);
          this.vBox(g, x + 2, y + 2, a, -16, -2, 32, 4);
          g.fillStyle(0x7a6648);
          this.vBox(g, x, y, a, -16, -2, 32, 4);
        }
        g.fillStyle(V.mud).fillRect(262, 290, 116, 92);
        this.vRailsRect(g, 262, 290, 116, 92);
        g.fillStyle(V.woodDark).fillRect(290, 330, 50, 7);
        g.fillStyle(V.straw).fillRect(292, 332, 46, 3);
        this.vStack(g, 330, 80, 13);
        this.vStack(g, 362, 132, 10);
        g.fillStyle(V.straw, 0.5);
        for (let i = 0; i < 30; i++) g.fillRect(rnd.between(40, 190), rnd.between(100, 130), 3, 1);
        for (const [x, y] of [[20, 30], [24, 380], [130, 380], [380, 20]]) this.vBush(g, x, y, 10);
      },
      // 31 — машинный двор: убитая земля, плиты перед боксами, масляные пятна, тракторы, комбайн,
      // плуг, бочки ГСМ, цистерна с колонкой, старые покрышки
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, V.grass, 16);
        g.fillStyle(V.earth).fillRect(20, 36, 360, 348);
        for (let i = 0; i < 10; i++) g.fillStyle(V.mud, 0.5).fillEllipse(rnd.between(40, 360), rnd.between(170, 370), rnd.between(20, 50), rnd.between(10, 24));
        g.fillStyle(0x62625c).fillRect(40, 116, 320, 42);
        g.lineStyle(1, 0x3e3e3a, 0.8);
        for (let x = 40; x <= 360; x += 40) g.lineBetween(x, 116, x, 158);
        g.lineBetween(40, 137, 360, 137);
        for (let i = 0; i < 16; i++) g.fillStyle(0x1c1a18, rnd.realInRange(0.35, 0.6)).fillEllipse(rnd.between(40, 360), rnd.between(120, 370), rnd.between(10, 30), rnd.between(6, 16));
        this.vRuts(g, [[200, 400], [196, 300], [200, 160]], 6, V.rut, 0.6, 3);
        this.vTractor(g, 90, 142, -Math.PI / 2 + 0.08, 0x6e4034);
        this.vTractor(g, 150, 144, -Math.PI / 2 - 0.12, 0x45607a);
        this.vTractor(g, 112, 292, 0.5, 0x5a6a3e);
        this.vCombine(g, 260, 300, -0.3);
        // Плуг: рама и диски
        g.fillStyle(0x3e3e3a);
        this.vBox(g, 70, 352, 0.4, -20, -2, 40, 4);
        g.fillStyle(0x6a6a64);
        for (let k = -16; k <= 16; k += 8) this.vBox(g, 70, 352, 0.4, k - 2, 2, 5, 5);
        // Бочки ГСМ
        for (const [x, y, c] of [[340, 236, 0x4a5a3a], [351, 241, 0x4a5a3a], [342, 247, 0x5a4a36], [356, 252, 0x4a5a3a], [334, 258, 0x6a3a2e], [348, 263, 0x4a5a3a]]) this.vBarrel(g, x, y, c);
        // Цистерна на опорах и колонка
        g.fillStyle(0x000000, 0.3).fillRoundedRect(150, 360, 60, 18, 8);
        g.fillStyle(0x3a3a36).fillRect(156, 372, 4, 6).fillRect(198, 372, 4, 6);
        g.fillStyle(0x6e726c).fillRoundedRect(146, 354, 60, 18, 8);
        g.fillStyle(0x8a8e88).fillRect(150, 357, 52, 4);
        g.fillStyle(0x3a3c3a).fillCircle(176, 357, 3);
        g.fillStyle(0x000000, 0.3).fillRect(224, 358, 10, 12);
        g.fillStyle(0x7a7e78).fillRect(222, 355, 10, 12);
        g.fillStyle(0x5a5e58).fillRect(222, 355, 10, 3);
        g.lineStyle(1.5, 0x1e1e1e).strokePoints([{ x: 232, y: 362 }, { x: 238, y: 368 }, { x: 236, y: 376 }]);
        g.fillStyle(0x1c1a18, 0.5).fillEllipse(232, 376, 16, 8);
        g.lineStyle(3, 0x1a1a1a);
        for (const [x, y] of [[372, 300], [366, 318], [374, 334], [364, 350]]) g.strokeCircle(x, y, 6);
      },
      // 32 — пшеница, 33 — картофель, 34 — кукуруза (поворачиваются; межа по краю — стыки читаются как границы полей)
      (g) => this.vField(g, rnd, 'wheat'),
      (g) => this.vField(g, rnd, 'potato'),
      (g) => this.vField(g, rnd, 'corn'),
      // 35 — лес: ели, берёзы и лиственные кроны разного размера; просеки крестом — квартальная сетка
      // лесничества, стыкуется с соседним лесом в любом повороте
      (g) => {
        g.fillStyle(0x22301c).fillRect(0, 0, s, s);
        g.fillStyle(0x3a4628).fillRect(192, 0, 16, s).fillRect(0, 192, s, 16);
        g.fillStyle(0x2e3820, 0.8).fillRect(196, 0, 2, s).fillRect(202, 0, 2, s).fillRect(0, 196, s, 2).fillRect(0, 202, s, 2);
        const list = [];
        for (let i = 0; i < 560; i++) {
          const r = rnd.between(7, 15);
          const x = rnd.realInRange(r, s - r);
          const y = rnd.realInRange(r, s - r);
          if (Math.abs(x - 200) < 8 + r * 0.6 || Math.abs(y - 200) < 8 + r * 0.6) continue;
          list.push({ x, y, r, k: rnd.frac() });
        }
        list.sort((a, b) => a.y - b.y); // южные кроны перекрывают северные
        for (const t of list) {
          if (t.k < 0.45) this.vSpruce(g, t.x, t.y, t.r + 1);
          else if (t.k < 0.7) this.vBirch(g, t.x, t.y, t.r);
          else this.tree(g, t.x, t.y, t.r);
        }
        for (let i = 0; i < 18; i++) {
          const along = rnd.realInRange(10, s - 10);
          const side = rnd.pick([186, 214]);
          if (rnd.frac() < 0.5) this.vBush(g, along, side, rnd.between(4, 6));
          else this.vBush(g, side, along, rnd.between(4, 6));
        }
      },
      // 36 — луг: трава пятнами, стога, кусты, редкие берёзы и цветы
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, V.grass, 60);
        this.vTufts(g, rnd, 0, 0, s, s, 320);
        for (let i = 0; i < 70; i++) {
          g.fillStyle(rnd.pick([0xb0aa98, 0x9a8aa8, 0xa89a62]), 0.6).fillRect(rnd.between(4, s - 6), rnd.between(4, s - 6), 1.5, 1.5);
        }
        for (const [cx, cy] of [[80, 300], [310, 90], [330, 320]]) {
          for (let k = 0; k < 4; k++) this.vBush(g, cx + rnd.between(-16, 16), cy + rnd.between(-12, 12), rnd.between(6, 10));
        }
        for (const [x, y, r] of [[150, 120, 14], [190, 150, 12], [240, 250, 13], [90, 190, 11]]) this.vStack(g, x, y, r);
        this.vBirch(g, 60, 60, 12);
        this.vBirch(g, 346, 220, 11);
      },
      // 37 — разъезд: путь по центру (x = 200, рисует GameScene — полосу не трогаем), к востоку —
      // перрон с навесом, к западу — площадка элеватора с просыпанным зерном и вокзальчик
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, V.grass, 22);
        this.vTufts(g, rnd, 0, 0, 160, s, 80);
        this.vTufts(g, rnd, 280, 0, 120, s, 60);
        g.fillStyle(0x5a564c).fillRect(170, 0, 60, s); // щебень балласта
        // Перрон
        g.fillStyle(0x000000, 0.3).fillRect(236, 44, 34, 320);
        g.fillStyle(0x6e6c66).fillRect(232, 40, 34, 320);
        g.fillStyle(0x9a968a).fillRect(232, 40, 3, 320); // кромка у пути
        g.lineStyle(1, 0x4e4c48, 0.6);
        for (let y = 56; y < 360; y += 16) g.lineBetween(235, y, 266, y);
        g.fillStyle(0x6e6c66).fillTriangle(232, 360, 266, 360, 266, 384).fillTriangle(232, 40, 266, 40, 266, 16); // пандусы
        g.fillStyle(0x000000, 0.3).fillRect(244, 178, 26, 40);
        g.fillStyle(0x52565a).fillRect(240, 172, 26, 40);
        g.fillStyle(0x6a6e70).fillRect(240, 172, 13, 40);
        g.lineStyle(1, 0x3a3c3e).lineBetween(253, 172, 253, 212);
        this.vBench(g, 258, 230, true);
        g.fillStyle(0x3a5a7a).fillRect(244, 112, 18, 6); // табличка без надписи
        g.fillStyle(0x9a9a92).fillRect(244, 112, 18, 1);
        for (const y of [80, 290]) g.fillStyle(0x2a2a2a).fillCircle(262, y, 2);
        // Площадка элеватора
        g.fillStyle(0x5e5c56).fillRect(40, 60, 128, 110);
        for (let i = 0; i < 8; i++) g.fillStyle(V.straw, 0.45).fillEllipse(rnd.between(50, 160), rnd.between(70, 165), rnd.between(10, 30), rnd.between(6, 14));
        for (const x of [90, 150]) g.fillStyle(0x6a6862).fillCircle(x, 112, 26);
        this.vRuts(g, [[0, 148], [40, 146], [120, 150]], 6, V.rut, 0.6, 3);
        g.fillStyle(V.packed).fillRect(40, 300, 130, 18);
        this.vBench(g, 60, 320);
        this.vBirch(g, 24, 270, 11);
        for (const [x, y] of [[320, 60], [350, 160], [310, 300], [360, 360]]) this.vBush(g, x, y, rnd.between(8, 11));
        this.vWoodpile(g, 300, 210, 24, 8);
      },
      // 38 — разрушенная церковь: заросший двор, бурьян, старые липы, кирпичная ограда со столбами —
      // местами обвалена; проломы на западе и востоке — там, где идёт грунтовка
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, 0x434c30, 60, 0x363f28, 0x515a38);
        this.vTufts(g, rnd, 0, 0, s, s, 260, 0x5a6440);
        for (let i = 0; i < 16; i++) g.fillStyle(0x2e3a24, 0.7).fillEllipse(rnd.between(40, 360), rnd.between(40, 360), rnd.between(12, 30), rnd.between(8, 18)); // крапива
        // Дорожка от ворот: плиты в траве
        g.fillStyle(0x5e5a50, 0.75).fillRect(186, 270, 20, 106);
        g.fillStyle(0x434c30);
        for (let i = 0; i < 8; i++) g.fillCircle(rnd.between(186, 206), rnd.between(276, 372), rnd.between(2, 5));
        // Сорванные листы кровли
        for (const [x, y, a] of [[118, 300, 0.4], [278, 236, -0.7], [110, 130, 1.1]]) {
          g.fillStyle(0x000000, 0.3);
          this.vBox(g, x + 2, y + 2, a, -9, -6, 18, 12);
          g.fillStyle(0x4a6458);
          this.vBox(g, x, y, a, -9, -6, 18, 12);
        }
        // Ограда: сегменты между проломами
        const a = 24;
        const b = 376;
        const gaps = { n: [[120, 172]], s: [[180, 212]], w: [[80, 120], [172, 228]], e: [[172, 228], [290, 320]] };
        const wall = (x1, y1, x2, y2) => {
          g.lineStyle(5, 0x000000, 0.3).lineBetween(x1 + 3, y1 + 3, x2 + 3, y2 + 3);
          g.lineStyle(5, 0x8a8478).lineBetween(x1, y1, x2, y2);
          g.lineStyle(1, 0x7a5040, 0.7).lineBetween(x1, y1 + 1, x2, y2 + 1); // кирпич из-под побелки
        };
        const rubble = (x, y, horiz) => {
          for (let i = 0; i < 8; i++) {
            g.fillStyle(rnd.pick([0x8a8478, 0x7a5040, 0x6a6058]));
            g.fillRect(x + (horiz ? rnd.between(-6, 6) : rnd.between(-8, 8)), y + (horiz ? rnd.between(-8, 8) : rnd.between(-6, 6)), 3, 2);
          }
        };
        for (const [side, list] of Object.entries(gaps)) {
          const horiz = side === 'n' || side === 's';
          const at = side === 'n' || side === 'w' ? a : b;
          let from = a;
          for (const [g0, g1] of [...list, [b, b]]) {
            if (g0 > from) {
              if (horiz) wall(from, at, g0, at);
              else wall(at, from, at, g0);
            }
            if (g1 < b && side !== 's') {
              for (let k = g0 + 6; k < g1; k += 12) {
                if (horiz) rubble(k, at, true);
                else rubble(at, k, false);
              }
            }
            from = g1;
          }
        }
        // Столбы ограды и ворот
        g.fillStyle(0xa09a8a);
        for (let k = a; k <= b; k += 44) {
          for (const [x, y] of [[k, a], [k, b], [a, k], [b, k]]) {
            const inGap = (side, v) => gaps[side].some(([g0, g1]) => v > g0 - 4 && v < g1 + 4);
            if ((y === a && inGap('n', x)) || (y === b && x !== a && x !== b && inGap('s', x)) || (x === a && inGap('w', y)) || (x === b && inGap('e', y))) continue;
            g.fillRect(x - 4, y - 4, 8, 8);
          }
        }
        g.fillStyle(0x000000, 0.3).fillRect(173, b - 3, 10, 10).fillRect(213, b - 3, 10, 10);
        g.fillStyle(0xb0aa9a).fillRect(170, b - 6, 10, 10).fillRect(210, b - 6, 10, 10);
        // Старые липы и сирень
        for (const [x, y, r] of [[62, 62, 18], [340, 344, 17], [60, 334, 16], [340, 60, 15]]) this.tree(g, x, y, r);
        for (const [x, y] of [[44, 160], [44, 250], [356, 250], [120, 356], [270, 356], [230, 44]]) this.vBush(g, x, y, rnd.between(8, 11));
      },
      // 39 — сельская школа: штакетник, двор для линейки, турник и брусья, маленькие ворота,
      // пришкольный огород, яблони, берёзы за зданием
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, V.grass, 26);
        this.vTufts(g, rnd, 0, 0, s, s, 120);
        g.fillStyle(V.packed).fillRect(60, 142, 280, 108);
        this.vPath(g, [[200, 384], [200, 250]], 18, V.packed);
        g.fillStyle(0x8a8a82).fillCircle(200, 164, 14);
        g.fillStyle(0x3e4a2e).fillCircle(200, 164, 12);
        g.fillStyle(0x8a6a5a).fillCircle(200, 164, 5);
        // Турник
        const post = (x, y, h) => {
          g.lineStyle(2, 0x000000, 0.3).lineBetween(x, y, x + h * 0.5, y + h * 0.3);
          g.lineStyle(2, 0x3a3a38).lineBetween(x, y, x, y - h);
        };
        post(286, 214, 18);
        post(314, 214, 18);
        g.lineStyle(1.5, 0x8a8c88).lineBetween(286, 196, 314, 196);
        // Брусья
        for (const x of [254, 262]) {
          post(x, 236, 10);
          post(x, 214, 10);
        }
        g.lineStyle(1.5, 0x6a5438).lineBetween(254, 204, 254, 226).lineBetween(262, 204, 262, 226);
        // «Козёл»
        g.fillStyle(0x000000, 0.3).fillRect(326, 232, 16, 7);
        g.fillStyle(0x5a4030).fillRect(322, 226, 16, 7);
        // Футбольные ворота
        g.lineStyle(1.5, 0x9a9c98).strokeRect(70, 176, 8, 30);
        // Огород и сад
        this.vBeds(g, rnd, 30, 288, 220, 86);
        this.vApple(g, rnd, 276, 320, 11);
        this.vApple(g, rnd, 272, 362, 10);
        for (let x = 40; x <= 360; x += 46) this.vBirch(g, x, 30, rnd.between(9, 11));
        this.vFenceRect(g, 16, 16, 368, 368, { side: 's', at: 200 });
      },
    ];
  }

  // ---------- Карьер «Гранитный» (уровень 3) ----------

  // Глубина точки: 'edge' — уступы горизонтальные (глубина = y); 'corner' — скруглённый угол,
  // дуги вокруг (QC, QC), у правого и нижнего края — те же горизонтали/вертикали, что у 41
  qDepth(kind, x, y) {
    if (kind === 'edge') return y;
    if (x < QC && y < QC) return QC - Math.hypot(QC - x, QC - y);
    return Math.min(x, y);
  }

  // Линия уровня глубины D: точки через ~4 px с нормалью вглубь карьера
  qContour(kind, D) {
    const s = CITY.tile;
    const pts = [];
    if (kind === 'edge') {
      for (let x = 0; x <= s; x += 4) pts.push({ x, y: D, nx: 0, ny: 1 });
      return pts;
    }
    const r = Math.max(1, QC - D);
    for (let x = s; x > QC; x -= 4) pts.push({ x, y: D, nx: 0, ny: 1 });
    const n = Math.max(2, Math.ceil((r * Math.PI) / 2 / 4));
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 - (i / n) * (Math.PI / 2);
      const c = Math.cos(a);
      const si = Math.sin(a);
      pts.push({ x: QC + r * c, y: QC + r * si, nx: -c, ny: -si });
    }
    for (let y = QC + 4; y <= s; y += 4) pts.push({ x: D, y, nx: 1, ny: 0 });
    return pts;
  }

  // Всё, что глубже D (многоугольник до края квартала)
  qFillDeeper(g, kind, D, color, alpha = 1) {
    const s = CITY.tile;
    const p = this.qContour(kind, D).map(({ x, y }) => ({ x, y }));
    if (kind === 'edge') p.push({ x: s, y: s }, { x: 0, y: s });
    else p.push({ x: s, y: s });
    g.fillStyle(color, alpha).fillPoints(p, true);
  }

  // Камень: тень вправо-вниз, неровный многоугольник, светлая грань слева-сверху
  qStone(g, rnd, x, y, r, color = rnd.pick(Q.stone)) {
    const n = r > 4 ? 7 : 5;
    const pts = [];
    const a0 = rnd.realInRange(0, Math.PI * 2);
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2;
      const k = rnd.realInRange(0.72, 1.1);
      pts.push({ x: Math.cos(a) * r * k, y: Math.sin(a) * r * k * 0.85 });
    }
    g.fillStyle(0x000000, 0.32).fillPoints(pts.map((p) => ({ x: x + p.x + r * 0.45, y: y + p.y + r * 0.4 })), true);
    g.fillStyle(color).fillPoints(pts.map((p) => ({ x: x + p.x, y: y + p.y })), true);
    if (r >= 3) {
      g.fillStyle(0xffffff, 0.14).fillPoints(pts.map((p) => ({ x: x + p.x * 0.55 - r * 0.22, y: y + p.y * 0.55 - r * 0.22 })), true);
      g.lineStyle(1, 0x26241f, 0.45).strokePoints(pts.map((p) => ({ x: x + p.x, y: y + p.y })), true);
    }
  }

  // Случайная точка внутри квартала с отступом m, удовлетворяющая ok(x, y); null — не нашлась
  qPick(rnd, m, ok, tries = 40) {
    const s = CITY.tile;
    for (let i = 0; i < tries; i++) {
      const x = rnd.realInRange(m, s - m);
      const y = rnd.realInRange(m, s - m);
      if (ok(x, y)) return [x, y];
    }
    return null;
  }

  // Уступы карьера для 40 (угол) и 41 (борт): кромка со светлой губой, тёмный откос со штрихами
  // слоёв, тень на нижнюю площадку, осыпь у подошвы, валуны и колеи на площадках
  qPit(g, rnd, kind) {
    const s = CITY.tile;
    this.vGround(g, rnd, 0, 0, s, s, Q.dust, 26, Q.dustDark, Q.dustLight);
    const levels = [...QD, 9999];
    for (let k = 0; k < QD.length; k++) {
      const D = QD[k];
      const floor = k + 1 < Q.bench.length ? Q.bench[k + 1] : Q.floor;
      this.qFillDeeper(g, kind, D - 1, Q.lip);
      this.qFillDeeper(g, kind, D + 3, Q.face);
      this.qFillDeeper(g, kind, D + QF, floor);
      this.qFillDeeper(g, kind, D + QF, 0x000000, 0.3); // тень откоса на площадку
      this.qFillDeeper(g, kind, D + QF + 4, floor);
      this.qFillDeeper(g, kind, D + QF + 4, 0x000000, 0.14);
      this.qFillDeeper(g, kind, D + QF + 9, floor);
      // Слои гранита на откосе — штрихи поперёк
      const face = this.qContour(kind, D + 4);
      for (let i = 1; i < face.length - 1; i++) {
        if (rnd.frac() < 0.35) continue;
        const p = face[i];
        const l = rnd.realInRange(4, QF - 5);
        g.lineStyle(1, rnd.frac() < 0.7 ? Q.strata : 0x2c2b29, 0.8).lineBetween(p.x, p.y, p.x + p.nx * l, p.y + p.ny * l);
      }
    }
    // Площадки: пятна пыли и мелкий щебень
    const bench = (x, y) => {
      const d = this.qDepth(kind, x, y);
      for (let k = 0; k < QD.length; k++) if (d > QD[k] + QF + 4 && d < levels[k + 1] - 4) return k;
      return -1;
    };
    for (let i = 0; i < 900; i++) {
      const x = rnd.realInRange(2, s - 3);
      const y = rnd.realInRange(2, s - 3);
      const k = bench(x, y);
      if (k < 0 && this.qDepth(kind, x, y) > QD[0]) continue;
      g.fillStyle(rnd.frac() < 0.5 ? 0x8a857a : 0x34332f, 0.45).fillRect(x, y, 1.5, 1.5);
    }
    // Осыпь у подошвы откосов
    for (let k = 0; k < QD.length; k++) {
      const toe = this.qContour(kind, QD[k] + QF + 3);
      for (let i = 0; i < toe.length; i++) {
        if (rnd.frac() < 0.55) continue;
        const p = toe[i];
        const o = rnd.realInRange(0, 9);
        const r = rnd.realInRange(1.2, o < 3 ? 3.5 : 2.2);
        const x = p.x + p.nx * o + rnd.realInRange(-2, 2);
        const y = p.y + p.ny * o;
        if (x < r + 2 || x > s - r - 2 || y < r + 2 || y > s - r - 2) continue;
        this.qStone(g, rnd, x, y, r);
      }
      // Конусы осыпи — светлые языки под откосом
      for (let j = 0; j < 3; j++) {
        const p = toe[rnd.between(2, toe.length - 3)];
        const x = p.x + p.nx * 5;
        const y = p.y + p.ny * 5;
        if (x < 16 || x > s - 16 || y < 16 || y > s - 16) continue;
        for (let m = 0; m < 9; m++) {
          const o = rnd.realInRange(0, 10);
          this.qStone(g, rnd, x + p.nx * o + rnd.between(-8, 8) * (1 - o / 14), y + p.ny * o + rnd.between(-3, 3), rnd.realInRange(1, 2.6 - o / 10));
        }
      }
    }
    // Валуны на площадках
    for (let i = 0; i < 9; i++) {
      const r = rnd.realInRange(4, 8);
      const at = this.qPick(rnd, r + 4, (x, y) => {
        const k = bench(x, y);
        return k >= 0 && bench(x, y - r) === k && bench(x, y + r) === k && bench(x - r, y) === k && bench(x + r, y) === k;
      });
      if (at) this.qStone(g, rnd, at[0], at[1], r);
    }
    // Колеи самосвалов по середине площадок — куски внутри квартала
    for (let k = 1; k < QD.length - 1; k++) {
      if (rnd.frac() < 0.4) continue;
      const mid = this.qContour(kind, (QD[k] + QF + QD[k + 1]) / 2 + 2);
      const a = rnd.between(4, Math.floor(mid.length * 0.4));
      const b = rnd.between(Math.floor(mid.length * 0.6), mid.length - 5);
      this.vRuts(g, mid.slice(a, b).map((p) => [p.x, p.y]), 6, 0x3a3935, 0.35, 3);
    }
  }

  // Технологическая дорога: светлый щебень, колеи, вал-бруствер вдоль бровки
  qRoad(g, rnd, pts, w = 36) {
    this.vPath(g, pts, w + 6, 0x000000, 0.22);
    this.vPath(g, pts, w, Q.gravel);
    // Чем ниже по пандусу, тем темнее — читается спуск
    for (let i = 1; i < pts.length - 1; i++) {
      this.vPath(g, pts.slice(i), w, 0x000000, 0.07);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const nx = -(y2 - y1) / len;
      const ny = (x2 - x1) / len;
      for (let d = 0; d < len; d += 3) {
        const t = d / len;
        const o = rnd.realInRange(-w / 2 + 2, w / 2 - 2);
        g.fillStyle(rnd.frac() < 0.5 ? 0x9a9384 : 0x6e695e, 0.6).fillRect(x1 + (x2 - x1) * t + nx * o, y1 + (y2 - y1) * t + ny * o, 1.5, 1.5);
      }
      // Бруствер по одной стороне — гряда камней
      for (let d = 4; d < len; d += rnd.between(6, 10)) {
        const t = d / len;
        this.qStone(g, rnd, x1 + (x2 - x1) * t + nx * (w / 2 + 3), y1 + (y2 - y1) * t + ny * (w / 2 + 3), rnd.realInRange(1.4, 2.4), 0x6a665c);
      }
    }
    this.vRuts(g, pts, 9, 0x5e584c, 0.7, 4);
    this.vRuts(g, pts, 9, 0x4e493f, 0.5, 1.5);
  }

  // Ж/д путь по вертикали во всю высоту квартала (шпалы с шагом 10 — стыкуется сам с собой)
  qTrackBed(g, x) {
    g.fillStyle(Q.ballast).fillRect(x - 16, 0, 32, CITY.tile);
    g.fillStyle(0x4c4840, 0.8).fillRect(x - 16, 0, 2, CITY.tile).fillRect(x + 14, 0, 2, CITY.tile);
  }

  qSleepers(g, x) {
    g.fillStyle(Q.sleeper);
    for (let y = 2; y < CITY.tile; y += 10) g.fillRect(x - 16, y, 32, 5);
  }

  qRails(g, x) {
    g.fillStyle(0x2a2a28, 0.5).fillRect(x - 8, 0, 3, CITY.tile).fillRect(x + 7, 0, 3, CITY.tile);
    g.fillStyle(Q.rail).fillRect(x - 9, 0, 3, CITY.tile).fillRect(x + 6, 0, 3, CITY.tile);
  }

  // Стрелочный съезд между путями: S-кривая (плавный отвод и примыкание), те же слои — балласт, шпалы, рельсы
  qCrossover(g, x1, y1, x2, y2, layer) {
    const n = 24;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const e = t * t * (3 - 2 * t);
      const de = 6 * t * (1 - t);
      const tx = (x2 - x1) * de;
      const ty = y2 - y1;
      const l = Math.hypot(tx, ty);
      pts.push({ x: x1 + (x2 - x1) * e, y: y1 + ty * t, nx: -ty / l, ny: tx / l, a: Math.atan2(ty, tx) });
    }
    if (layer === 'bed') g.lineStyle(32, Q.ballast).strokePoints(pts, false);
    if (layer === 'sleepers') {
      g.fillStyle(Q.sleeper);
      for (let i = 1; i < n; i++) this.vBox(g, pts[i].x, pts[i].y, pts[i].a, -2.5, -16, 5, 32);
    }
    if (layer === 'rails') {
      for (const o of [-7.5, 7.5]) g.lineStyle(3, Q.rail).strokePoints(pts.map((p) => ({ x: p.x + p.nx * o, y: p.y + p.ny * o })), false);
    }
  }

  // Вагоны вид сверху: крытый (крыша с рёбрами) и хоппер с щебнем
  qBoxcar(g, x, y, len) {
    g.fillStyle(0x000000, 0.32).fillRect(x - 11, y + 4, 27, len);
    g.fillStyle(0x5e4636).fillRect(x - 13, y, 26, len);
    g.fillStyle(0x6c5242).fillRect(x - 13, y, 13, len);
    g.lineStyle(1, 0x46342a, 0.9);
    for (let k = y + 6; k < y + len - 2; k += 7) g.lineBetween(x - 13, k, x + 13, k);
    g.fillStyle(0x3a2c22).fillRect(x - 13, y, 26, 3).fillRect(x - 13, y + len - 3, 26, 3);
    g.fillStyle(0x2a2a28).fillRect(x - 2, y - 3, 4, 3).fillRect(x - 2, y + len, 4, 3); // сцепки
  }

  qHopper(g, rnd, x, y, len) {
    g.fillStyle(0x000000, 0.32).fillRect(x - 11, y + 4, 27, len);
    g.fillStyle(0x4e5244).fillRect(x - 13, y, 26, len);
    g.fillStyle(0x3a3e34);
    for (let k = y + 4; k < y + len - 2; k += 9) g.fillRect(x - 13, k, 2, 4).fillRect(x + 11, k, 2, 4); // стойки
    g.fillStyle(0x6e6b64).fillRect(x - 10, y + 3, 20, len - 6);
    for (let i = 0; i < len * 1.4; i++) {
      g.fillStyle(rnd.pick([0x8a867c, 0x5a5751, 0x7a766e]), 0.9).fillRect(x - 9 + rnd.frac() * 17, y + 4 + rnd.frac() * (len - 9), 2, 2);
    }
    g.fillStyle(0x2a2a28).fillRect(x - 2, y - 3, 4, 3).fillRect(x - 2, y + len, 4, 3);
  }

  // Красный флажок на шесте — «опасно», тень вправо-вниз
  qFlag(g, x, y) {
    g.lineStyle(1.5, 0x000000, 0.3).lineBetween(x, y, x + 8, y + 5);
    g.fillStyle(0x2a2a28).fillCircle(x, y, 1.5);
    g.lineStyle(1.5, 0x3a3a36).lineBetween(x, y, x, y - 12);
    g.fillStyle(0xb8322a).fillTriangle(x, y - 12, x + 9, y - 9, x, y - 6);
    g.fillStyle(0x7a1e18).fillTriangle(x, y - 9, x + 9, y - 9, x, y - 6);
  }

  // Колючка на бетонных столбах: столбы, три нитки, шипы
  qWire(g, x1, y1, x2, y2) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    g.lineStyle(1, 0x000000, 0.22).lineBetween(x1 + 3, y1 + 3, x2 + 3, y2 + 3);
    for (const o of [-1.5, 0, 1.5]) g.lineStyle(1, 0x2e2e2b, 0.75).lineBetween(x1 - uy * o, y1 + ux * o, x2 - uy * o, y2 + ux * o);
    g.lineStyle(1, 0x2e2e2b, 0.6);
    for (let d = 3; d < len; d += 6) {
      const x = x1 + ux * d;
      const y = y1 + uy * d;
      g.lineBetween(x - 1.5, y - 1.5, x + 1.5, y + 1.5);
    }
    for (let d = 0; d <= len; d += 20) {
      const x = x1 + ux * d;
      const y = y1 + uy * d;
      g.fillStyle(0x000000, 0.3).fillRect(x - 1, y - 1, 6, 4);
      g.fillStyle(0x8a8880).fillRect(x - 2, y - 2, 4, 4);
    }
  }

  // Обвалованный склад: земляной вал с травой, бетонный портал с дверью на юг, вентиляционные трубы
  qBunker(g, rnd, x, y, w, h) {
    g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 6, y + 6, w, h, 22);
    g.fillStyle(0x56553f).fillRoundedRect(x, y, w, h, 22);
    g.fillStyle(0x66644a).fillRoundedRect(x + 4, y + 3, w - 18, h - 16, 18); // освещённый склон
    g.fillStyle(0x5c5b44).fillRoundedRect(x + 16, y + 14, w - 32, h - 30, 10); // плоский верх
    g.fillStyle(0x484a36, 0.8);
    for (let i = 0; i < 26; i++) g.fillRect(x + rnd.between(6, w - 8), y + rnd.between(4, h - 10), 1, 3); // трава
    for (const k of [0.3, 0.7]) {
      g.fillStyle(0x000000, 0.35).fillCircle(x + w * k + 2, y + h * 0.42 + 2, 3);
      g.fillStyle(0x6a6c66).fillCircle(x + w * k, y + h * 0.42, 3);
      g.fillStyle(0x2a2a28).fillCircle(x + w * k, y + h * 0.42, 1.5);
    }
    // Портал: подпорные стенки клином, дверь, бетонная площадка
    const cx = x + w / 2;
    const b = y + h;
    g.fillStyle(Q.concrete).fillTriangle(cx - 26, b + 2, cx - 14, b - 14, cx - 14, b + 2).fillTriangle(cx + 26, b + 2, cx + 14, b - 14, cx + 14, b + 2);
    g.fillStyle(0x8e8c84).fillRect(cx - 15, b - 16, 30, 6);
    g.fillStyle(0x6a6862).fillRect(cx - 14, b - 10, 28, 12);
    g.fillStyle(0x464c44).fillRect(cx - 10, b - 9, 20, 11);
    g.lineStyle(1, 0x2e322c).lineBetween(cx, b - 9, cx, b + 2);
    g.fillStyle(0x9a988e).fillRect(cx - 18, b + 2, 36, 10);
    g.fillStyle(0x000000, 0.15).fillRect(cx - 18, b + 2, 36, 2);
  }

  // Трансформатор: бак, радиаторы по бокам, три ввода на изоляторах
  qTransformer(g, x, y) {
    g.fillStyle(0x56544c).fillRect(x - 30, y - 24, 60, 48); // маслоприёмник с бортом
    g.fillStyle(0x6c6a62).fillRect(x - 27, y - 21, 54, 42);
    g.fillStyle(0x000000, 0.32).fillRect(x - 15, y - 10, 36, 28);
    g.fillStyle(0x3e4a3e);
    for (let k = -14; k <= 12; k += 4) g.fillRect(x - 24, y + k - 1, 8, 2).fillRect(x + 16, y + k - 1, 8, 2); // рёбра радиаторов
    g.fillStyle(0x4e5c4c).fillRect(x - 18, y - 13, 36, 26);
    g.fillStyle(0x5c6a58).fillRect(x - 18, y - 13, 36, 7);
    g.lineStyle(1, 0x2a3228).strokeRect(x - 18, y - 13, 36, 26);
    g.fillStyle(0x3e4a3e).fillEllipse(x - 10, y + 6, 10, 7); // расширитель
    for (const dx of [-10, 0, 10]) {
      g.fillStyle(0x000000, 0.3).fillCircle(x + dx + 2, y - 6, 3);
      g.fillStyle(0x9c988c).fillCircle(x + dx, y - 8, 3);
      g.fillStyle(0x6a6860).fillCircle(x + dx, y - 8, 1.2);
    }
  }

  // Стальной портал: две решётчатые стойки и ригель с гирляндами изоляторов
  qPortal(g, x1, x2, y) {
    g.lineStyle(4, 0x000000, 0.25).lineBetween(x1 + 6, y + 6, x2 + 6, y + 6);
    g.lineStyle(1, 0x6a6c6a);
    g.lineBetween(x1, y - 3, x2, y - 3).lineBetween(x1, y + 3, x2, y + 3);
    for (let x = x1; x < x2; x += 6) g.lineBetween(x, y - 3, x + 6, y + 3);
    for (const x of [x1, x2]) {
      g.fillStyle(0x000000, 0.3).fillRect(x - 2, y - 2, 10, 10);
      g.fillStyle(0x5a5c5a).fillRect(x - 4, y - 4, 8, 8);
      g.lineStyle(1, 0x7a7c7a).strokeRect(x - 4, y - 4, 8, 8).lineBetween(x - 4, y - 4, x + 4, y + 4);
    }
    g.fillStyle(0xa8a498);
    for (let x = x1 + 22; x < x2 - 10; x += 32) for (let k = 0; k < 4; k++) g.fillCircle(x, y + 5 + k * 2.5, 1.4);
  }

  // Кабельный лоток: бетонный жёлоб с плитами-крышками
  qTrench(g, x1, y1, x2, y2) {
    g.lineStyle(8, 0x5a5852).lineBetween(x1, y1, x2, y2);
    g.lineStyle(6, 0x86847c).lineBetween(x1, y1, x2, y2);
    const len = Math.hypot(x2 - x1, y2 - y1);
    g.fillStyle(0x5a5852);
    for (let d = 10; d < len; d += 10) g.fillRect(x1 + ((x2 - x1) * d) / len - 0.5, y1 + ((y2 - y1) * d) / len - 0.5, 1, 1);
  }

  // Кварталы 40–47 — карьер «Гранитный»; индекс в массиве makeCityTiles = номер вида в cityLayout
  quarryLayouts(rnd, s) {
    const calm = (x, y, r, c = 200, h = 90) => Math.abs(x - c) < h + r && Math.abs(y - c) < h + r;
    return [
      // 40 — угол карьера (северо-западный): бровка сверху и слева, уступы дугами вниз-вправо;
      // правый край стыкуется с 41, нижний — с 41, повёрнутым к западу
      (g) => {
        this.qPit(g, rnd, 'corner');
        this.vTufts(g, rnd, 4, 4, 40, 40, 14, Q.dry);
        for (const [x, y] of [[24, 30], [34, 140], [150, 26], [30, 260], [270, 30]]) this.qStone(g, rnd, x, y, rnd.realInRange(2, 4));
      },
      // 41 — борт карьера (северный): бровка сверху, уступы горизонталями вниз; съезд — пандус
      // по диагонали с бровки на нижнюю площадку
      (g) => {
        this.qPit(g, rnd, 'edge');
        this.vTufts(g, rnd, 8, 4, s - 16, 40, 30, Q.dry);
        this.qRoad(g, rnd, [[34, 30], [150, 118], [276, 214], [352, 300]]);
        g.fillStyle(0x6e695e, 0.45).fillEllipse(350, 316, 64, 36); // разворотная площадка внизу
        g.fillStyle(Q.gravel, 0.3).fillEllipse(40, 26, 56, 28);
        for (let x = 12; x < s - 12; x += rnd.between(30, 60)) this.qStone(g, rnd, x, 44 + rnd.between(-2, 2), rnd.realInRange(2.5, 4), 0x6e6a60); // бруствер по бровке
      },
      // 42 — дно карьера: тёмная площадка, лужи, развал горной массы после взрыва, сетка скважин,
      // следы бурового станка, упавшие глыбы. Центр (~180 px) спокойный — там встаёт яма «Объекта»
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, Q.floor, 34, 0x3a3936, 0x4e4c48);
        for (let i = 0; i < 700; i++) {
          g.fillStyle(rnd.frac() < 0.5 ? 0x5e5c56 : 0x2e2d2a, 0.5).fillRect(rnd.realInRange(1, s - 3), rnd.realInRange(1, s - 3), 1.5, 1.5);
        }
        // Мокрые пятна и лужи — по углам и краям, не в центре
        for (const [x, y, w, h] of [[66, 70, 70, 30], [330, 96, 50, 24], [92, 340, 56, 22], [312, 344, 80, 30], [40, 210, 30, 50]]) {
          g.fillStyle(0x2e3234, 0.55).fillEllipse(x, y, w + 18, h + 12);
          g.fillStyle(Q.water).fillEllipse(x, y, w, h);
          g.lineStyle(1, 0x5a6462, 0.5).strokeEllipse(x, y, w, h);
          g.fillStyle(0x66727a, 0.3).fillEllipse(x - w * 0.15, y - h * 0.15, w * 0.45, h * 0.2);
        }
        // Развалы горной массы — кучи щебня с глыбами
        for (const [cx, cy, r] of [[330, 220, 34], [190, 50, 30], [210, 352, 26]]) {
          // Неровный бугор: тень, склон, освещённая верхушка, глыбы крупнее к подошве
          const n = 12;
          const rim = [];
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const k = rnd.realInRange(0.75, 1.15);
            rim.push({ x: cx + Math.cos(a) * r * 1.2 * k, y: cy + Math.sin(a) * r * 0.85 * k });
          }
          g.fillStyle(0x000000, 0.3).fillPoints(rim.map((p) => ({ x: p.x + 6, y: p.y + 5 })), true);
          g.fillStyle(0x52504a).fillPoints(rim, true);
          g.fillStyle(0x605d56).fillPoints(rim.map((p) => ({ x: cx - 4 + (p.x - cx) * 0.6, y: cy - 4 + (p.y - cy) * 0.6 })), true);
          g.fillStyle(0x6c6962).fillPoints(rim.map((p) => ({ x: cx - 6 + (p.x - cx) * 0.3, y: cy - 6 + (p.y - cy) * 0.3 })), true);
          for (let i = 0; i < 34; i++) {
            const a = rnd.realInRange(0, Math.PI * 2);
            const d = Math.sqrt(rnd.frac());
            this.qStone(g, rnd, cx + Math.cos(a) * d * r * 1.15, cy + Math.sin(a) * d * r * 0.8, rnd.realInRange(1.5, 2 + d * 3.5));
          }
        }
        // Сетка взрывных скважин: кольца выбуренной мелочи и тёмные устья
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 3; j++) {
            const x = 30 + i * 18 + (j % 2) * 9;
            const y = 118 + j * 18;
            g.fillStyle(0x6a6760, 0.8).fillCircle(x, y, 4);
            g.fillStyle(0x1c1c1a).fillCircle(x, y, 1.8);
          }
        }
        // Следы бурового станка — гусеницы с грунтозацепами вдоль сетки
        for (const o of [-9, 9]) {
          g.fillStyle(0x34332f, 0.6).fillRect(18, 176 + o - 3, 92, 6);
          g.fillStyle(0x4a4844, 0.6);
          for (let x = 20; x < 108; x += 4) g.fillRect(x, 176 + o - 3, 1.5, 6);
        }
        // Упавшие глыбы
        for (const [x, y, r] of [[360, 160, 9], [52, 280, 10], [290, 30, 7], [370, 290, 8], [140, 380, 7]]) this.qStone(g, rnd, x, y, r);
        // Мелкие камни вне центра
        for (let i = 0; i < 60; i++) {
          const at = this.qPick(rnd, 8, (x, y) => !calm(x, y, 4));
          if (at) this.qStone(g, rnd, at[0], at[1], rnd.realInRange(1.2, 3));
        }
      },
      // 43 — отвалы породы: плоские террасы-курганы, промоины на склонах, колеи по верху, редкий бурьян
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, Q.dust, 30, Q.dustDark, Q.dustLight);
        this.vTufts(g, rnd, 0, 0, s, s, 70, Q.dry);
        for (const [cx, cy, rx, ry] of [[136, 128, 104, 82], [290, 286, 90, 76], [312, 82, 56, 42]]) {
          const n = 16;
          const base = [];
          const top = [];
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const k = rnd.realInRange(0.86, 1.08);
            base.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
            const t = 0.58 * rnd.realInRange(0.92, 1.05);
            top.push({ x: cx - 4 + Math.cos(a) * rx * t, y: cy - 4 + Math.sin(a) * ry * t });
          }
          g.fillStyle(0x000000, 0.28).fillPoints(base.map((p) => ({ x: p.x + 8, y: p.y + 7 })), true);
          g.fillStyle(0x5a5246).fillPoints(base, true); // склон
          g.fillStyle(0x6a6152, 0.9).fillPoints(base.map((p) => ({ x: p.x - (p.x - cx) * 0.12 - 4, y: p.y - (p.y - cy) * 0.12 - 4 })), true);
          // Промоины: тёмная борозда со светлой кромкой от верха к подошве
          for (let i = 0; i < n; i++) {
            if (rnd.frac() < 0.55) continue;
            const a = top[i];
            const b = base[i];
            const line = [a];
            for (let k = 1; k < 4; k++) line.push({ x: a.x + ((b.x - a.x) * k) / 4 + rnd.between(-4, 4), y: a.y + ((b.y - a.y) * k) / 4 + rnd.between(-4, 4) });
            line.push({ x: b.x + rnd.between(-3, 3), y: b.y + rnd.between(-3, 3) });
            g.fillStyle(0x6a6152, 0.7).fillCircle(line[4].x, line[4].y, 5); // вынос у подошвы
            g.lineStyle(2.5, 0x433d34, 0.8).strokePoints(line, false);
            g.lineStyle(1, 0x7a7060, 0.5).strokePoints(line.map((p) => ({ x: p.x - 2, y: p.y - 1 })), false);
          }
          g.fillStyle(0x857a66).fillPoints(top.map((p) => ({ x: p.x - 1, y: p.y - 1 })), true); // освещённая бровка
          g.fillStyle(0x746b5a).fillPoints(top, true); // плоский верх
          for (let i = 0; i < 40; i++) g.fillStyle(rnd.pick([0x8a8070, 0x5e564a]), 0.6).fillRect(cx - rx * 0.4 + rnd.frac() * rx * 0.8, cy - ry * 0.4 + rnd.frac() * ry * 0.7, 2, 2);
          // Свежие кучки разгрузки самосвалов — неровный ряд по одной стороне верха
          const side = rnd.between(0, n - 1);
          for (let k = 0; k < 5; k++) {
            const p = top[(side + k) % n];
            const x = p.x + (cx - p.x) * 0.25 + rnd.between(-2, 2);
            const y = p.y + (cy - p.y) * 0.25 + rnd.between(-2, 2);
            g.fillStyle(0x000000, 0.25).fillEllipse(x + 2, y + 2, 13, 10);
            g.fillStyle(0x6a6252).fillEllipse(x, y, 13, 10);
            g.fillStyle(0x80766a).fillEllipse(x - 1.5, y - 1.5, 6, 5);
          }
          for (let i = 0; i < 12; i++) this.qStone(g, rnd, base[i % n].x + rnd.between(-6, 6), base[i % n].y + rnd.between(-4, 6), rnd.realInRange(1.5, 3.5));
        }
        this.vRuts(g, [[60, 120], [120, 104], [200, 120]], 7, 0x5e5648, 0.6, 3);
        this.vRuts(g, [[40, 300], [120, 260], [200, 250]], 7, Q.rut, 0.4, 3);
        for (const [x, y] of [[40, 380], [210, 220], [380, 160], [30, 30], [372, 380]]) {
          g.fillStyle(Q.dryDark).fillCircle(x, y, 5).fillCircle(x + 4, y + 2, 4);
          g.fillStyle(Q.dry).fillCircle(x - 1, y - 1, 2.5);
        }
      },
      // 44 — станционные пути: полоса x 170–230 — чистый балласт (по ней идёт магистраль); по бокам
      // подъездные пути со стрелками, крытые вагоны и хопперы с щебнем, пост ЭЦ
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, Q.dust, 22, Q.dustDark, Q.dustLight);
        g.fillStyle(Q.ballast).fillRect(170, 0, 60, s);
        const tracks = [48, 108, 270, 318, 366];
        const xovers = [[48, 200, 108, 368], [270, 26, 318, 190], [318, 214, 366, 380]];
        for (const x of tracks) this.qTrackBed(g, x);
        for (const c of xovers) this.qCrossover(g, ...c, 'bed');
        for (let i = 0; i < 260; i++) {
          g.fillStyle(rnd.pick([0x6a665c, 0x48443c]), 0.6).fillRect(rnd.realInRange(0, s - 2), rnd.realInRange(0, s - 2), 1.5, 1.5);
        }
        for (const x of tracks) this.qSleepers(g, x);
        for (const c of xovers) this.qCrossover(g, ...c, 'sleepers');
        for (const x of tracks) this.qRails(g, x);
        for (const c of xovers) this.qCrossover(g, ...c, 'rails');
        // Стрелочные переводы: тумбочка с фонарём у начала съезда
        for (const [x, y] of [[28, 206], [128, 362], [252, 32], [338, 186], [298, 220], [386, 374]]) {
          g.fillStyle(0x000000, 0.3).fillRect(x - 1, y - 1, 6, 6);
          g.fillStyle(0x3a3c3a).fillRect(x - 3, y - 3, 6, 6);
          g.fillStyle(0x8a8c7a).fillCircle(x, y, 1.5);
        }
        // Вагоны
        this.qBoxcar(g, 48, 18, 84);
        this.qBoxcar(g, 48, 108, 84);
        this.qHopper(g, rnd, 108, 24, 58);
        this.qHopper(g, rnd, 108, 88, 58);
        this.qHopper(g, rnd, 270, 200, 58);
        this.qHopper(g, rnd, 270, 264, 58);
        this.qHopper(g, rnd, 270, 328, 58);
        this.qBoxcar(g, 366, 26, 84);
        // Просыпанный щебень у пустого пути
        for (let i = 0; i < 30; i++) this.qStone(g, rnd, 318 + rnd.between(-18, 18), rnd.between(60, 220), rnd.realInRange(1, 2.5), 0x7a766e);
        // Пост ЭЦ: кирпичная будка с шиферной крышей, фасад к югу
        g.fillStyle(0x000000, 0.3).fillRect(134, 184, 32, 34);
        g.fillStyle(0x6e4c3e).fillRect(130, 198, 30, 14); // южная стена
        g.fillStyle(0x3a4450).fillRect(134, 202, 8, 6).fillRect(148, 202, 8, 6);
        g.fillStyle(0x5e6066).fillRect(128, 178, 34, 22); // крыша
        g.fillStyle(0x6c6e74).fillRect(128, 178, 34, 11);
        g.lineStyle(1, 0x4a4c50).lineBetween(128, 189, 162, 189);
        g.fillStyle(0x4a3a30).fillRect(152, 180, 4, 5); // печная труба
        // Релейные шкафы, штабель старых шпал
        for (const y of [240, 252]) {
          g.fillStyle(0x000000, 0.3).fillRect(142, y + 2, 14, 9);
          g.fillStyle(0x6a6e66).fillRect(140, y, 14, 9);
        }
        for (let k = 0; k < 4; k++) {
          g.fillStyle(0x000000, 0.25).fillRect(134, 300 + k * 6 + 2, 30, 5);
          g.fillStyle(k % 2 ? 0x4a3a2a : 0x54442e).fillRect(132, 300 + k * 6, 30, 5);
        }
        this.vTufts(g, rnd, 126, 0, 40, s, 40, Q.dry);
        this.vTufts(g, rnd, 0, 0, 30, s, 14, Q.dry);
      },
      // 45 — склад взрывчатки: колючка на бетонных столбах, контрольно-следовая полоса, два
      // обвалованных хранилища, будка охраны и ворота на юге, красные флажки; центр (~120 px) пуст
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, Q.dust, 28, Q.dustDark, Q.dustLight);
        this.vTufts(g, rnd, 0, 0, s, s, 80, Q.dry);
        const a = 28;
        const b = 372;
        g.fillStyle(0x625c4e).fillRect(a, a, b - a, b - a);
        g.fillStyle(0x4e4636).fillRect(a + 4, a + 4, b - a - 8, 8).fillRect(a + 4, b - 12, b - a - 8, 8).fillRect(a + 4, a + 4, 8, b - a - 8).fillRect(b - 12, a + 4, 8, b - a - 8); // вспаханная полоса
        g.fillStyle(0x625c4e).fillRect(186, b - 14, 28, 14);
        // Проезды от ворот к центру и к хранилищам
        this.vPath(g, [[200, b], [200, 200]], 22, 0x77705f);
        this.vPath(g, [[115, 150], [200, 168], [285, 150]], 18, 0x77705f);
        this.vRuts(g, [[200, b], [200, 260]], 5, Q.rut, 0.5, 2);
        g.fillStyle(0x77705f).fillRect(150, 150, 100, 100); // площадка под штабель
        g.lineStyle(1, 0x5e584a, 0.8).strokeRect(150, 150, 100, 100);
        this.qBunker(g, rnd, 54, 46, 122, 84);
        this.qBunker(g, rnd, 224, 46, 122, 84);
        // Песок и пожарный щит у хранилищ — без надписей
        for (const x of [70, 310]) {
          g.fillStyle(0x000000, 0.3).fillRect(x + 2, 170, 20, 12);
          g.fillStyle(0x8a7a58).fillRect(x, 168, 20, 12);
          g.fillStyle(0x9a8a64).fillRect(x + 2, 170, 16, 8);
        }
        // Молниеотводы: мачта с длинной тенью
        for (const [x, y] of [[44, 200], [356, 200]]) {
          g.lineStyle(2, 0x000000, 0.25).lineBetween(x, y, x + 34, y + 20);
          g.fillStyle(0x4a4a46).fillRect(x - 3, y - 3, 6, 6);
          g.lineStyle(1, 0x7a7a74).strokeRect(x - 3, y - 3, 6, 6);
        }
        // Ограда с воротами на юге
        this.qWire(g, a, a, b, a);
        this.qWire(g, a, a, a, b);
        this.qWire(g, b, a, b, b);
        this.qWire(g, a, b, 182, b);
        this.qWire(g, 218, b, b, b);
        g.fillStyle(0x000000, 0.3).fillRect(178, b - 2, 9, 9).fillRect(216, b - 2, 9, 9);
        g.fillStyle(0x9a988e).fillRect(176, b - 4, 8, 8).fillRect(216, b - 4, 8, 8);
        g.lineStyle(1.5, 0x4e524c).strokeRect(184, b - 2, 15, 4).strokeRect(201, b - 2, 15, 4);
        g.lineStyle(1, 0x4e524c).lineBetween(184, b - 2, 199, b + 2).lineBetween(201, b + 2, 216, b - 2);
        // Будка охраны у ворот, фасад к югу
        g.fillStyle(0x000000, 0.3).fillRect(244, 330, 22, 26);
        g.fillStyle(0x6a6a5c).fillRect(240, 342, 20, 10);
        g.fillStyle(0x3a4450).fillRect(244, 344, 6, 5);
        g.fillStyle(0x56604e).fillRect(238, 326, 24, 18);
        g.fillStyle(0x64705a).fillRect(238, 326, 24, 8);
        // Красные флажки по углам и у ворот
        for (const [x, y] of [[a + 8, a + 8], [b - 8, a + 8], [a + 8, b - 8], [b - 8, b - 8], [172, b - 8], [228, b - 8], [115, 142], [285, 142]]) this.qFlag(g, x, y);
        for (const [x, y] of [[16, 16], [384, 384], [384, 20], [14, 380]]) this.qStone(g, rnd, x, y, 3);
      },
      // 46 — пустырь: утоптанная пыль, следы шин, сухая трава, камни, старая покрышка, гнутая труба
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, Q.dust, 50, Q.dustDark, Q.dustLight);
        this.vTufts(g, rnd, 0, 0, s, s, 160, Q.dry);
        this.vTufts(g, rnd, 0, 0, s, s, 60, Q.dryDark);
        this.vRuts(g, [[30, 330], [120, 250], [230, 210], [330, 80]], 7, Q.rut, 0.45, 4);
        this.vRuts(g, [[40, 90], [140, 120], [210, 180]], 5, Q.rut, 0.35, 3);
        for (let i = 0; i < 8; i++) {
          const x = rnd.between(30, 370);
          const y = rnd.between(30, 370);
          g.fillStyle(Q.dryDark).fillCircle(x, y, 4).fillCircle(x + 3, y + 2, 3);
          g.fillStyle(Q.dry).fillCircle(x - 1, y - 1, 2);
        }
        for (let i = 0; i < 40; i++) this.qStone(g, rnd, rnd.between(8, 392), rnd.between(8, 392), rnd.realInRange(1.2, 3.5));
        for (const [x, y] of [[300, 300], [90, 200]]) this.qStone(g, rnd, x, y, rnd.realInRange(6, 9));
        // Старая покрышка самосвала
        g.lineStyle(5, 0x000000, 0.25).strokeCircle(282, 136, 11);
        g.lineStyle(5, 0x1e1e1c).strokeCircle(280, 134, 11);
        g.lineStyle(1, 0x3a3a36).strokeCircle(280, 134, 11);
        // Гнутая ржавая труба
        const pipe = [{ x: 96, y: 330 }, { x: 140, y: 318 }, { x: 160, y: 296 }];
        g.lineStyle(5, 0x000000, 0.25).strokePoints(pipe.map((p) => ({ x: p.x + 3, y: p.y + 3 })), false);
        g.lineStyle(5, Q.rust).strokePoints(pipe, false);
        g.lineStyle(1, 0x8a6a50).strokePoints(pipe.map((p) => ({ x: p.x - 1, y: p.y - 1.5 })), false);
        // Обломки бетона
        g.fillStyle(0x000000, 0.25).fillRect(332, 52, 16, 10);
        g.fillStyle(Q.concrete).fillRect(330, 50, 16, 10);
        g.fillStyle(0x5a5852).fillRect(330, 50, 2, 10);
      },
      // 47 — подстанция: щебёночный двор, порталы, три трансформатора в маслоприёмниках, кабельные
      // лотки, ОПУ, бетонная ограда с «ромбиками» и ворота на юге
      (g) => {
        this.vGround(g, rnd, 0, 0, s, s, Q.dust, 20, Q.dustDark, Q.dustLight);
        g.fillStyle(0x64625c).fillRect(24, 24, 352, 352);
        for (let i = 0; i < 1400; i++) g.fillStyle(rnd.pick([0x76746c, 0x52504a, 0x6c6a62]), 0.7).fillRect(rnd.realInRange(26, 372), rnd.realInRange(26, 372), 1.5, 1.5);
        g.fillStyle(0x6e6a5c).fillRect(184, 300, 32, 76); // проезд
        this.qTrench(g, 50, 306, 350, 306);
        for (const x of [100, 200, 300]) this.qTrench(g, x, 230, x, 306);
        this.qTrench(g, 350, 306, 350, 340);
        for (const x of [100, 200, 300]) this.qTransformer(g, x, 200);
        // Провода от портала к вводам
        g.lineStyle(1, 0x2a2a28, 0.8);
        for (const x of [100, 200, 300]) for (const dx of [-10, 0, 10]) g.lineBetween(x + dx * 1.6, 112, x + dx, 192);
        g.lineStyle(1, 0x2a2a28, 0.6);
        for (const dx of [-10, 0, 10]) g.lineBetween(36, 100 + dx, 364, 100 + dx);
        this.qPortal(g, 50, 350, 100);
        this.qPortal(g, 60, 150, 270);
        this.qPortal(g, 250, 340, 270);
        // ОПУ — пульт управления, плоская крыша, фасад к югу
        g.fillStyle(0x000000, 0.3).fillRect(296, 326, 66, 40);
        g.fillStyle(0x7a786e).fillRect(290, 346, 64, 14);
        g.fillStyle(0x3a4450);
        for (let x = 296; x < 350; x += 12) g.fillRect(x, 349, 7, 6);
        g.fillStyle(0x5c5c58).fillRect(288, 320, 68, 28);
        g.lineStyle(1, 0x74746e).strokeRect(288, 320, 68, 28);
        // Ограда из бетонных плит с «ромбиками»
        const fence = (x1, y1, x2, y2) => {
          g.lineStyle(4, 0x000000, 0.28).lineBetween(x1 + 3, y1 + 3, x2 + 3, y2 + 3);
          g.lineStyle(4, 0x8a887e).lineBetween(x1, y1, x2, y2);
          const len = Math.hypot(x2 - x1, y2 - y1);
          g.fillStyle(0x6a685e);
          for (let d = 4; d < len; d += 8) {
            const x = x1 + ((x2 - x1) * d) / len;
            const y = y1 + ((y2 - y1) * d) / len;
            g.fillTriangle(x - 2, y, x, y - 1.5, x + 2, y).fillTriangle(x - 2, y, x, y + 1.5, x + 2, y);
          }
        };
        fence(22, 22, 378, 22);
        fence(22, 22, 22, 378);
        fence(378, 22, 378, 378);
        fence(22, 378, 180, 378);
        fence(220, 378, 378, 378);
        g.fillStyle(0x5a5e5a).fillRect(180, 376, 40, 4);
        g.lineStyle(1, 0x3a3e3a).lineBetween(200, 376, 200, 380);
        g.fillStyle(0xd0b030).fillRect(178, 374, 4, 8).fillRect(218, 374, 4, 8); // жёлтые столбы ворот
        for (const [x, y] of [[10, 200], [390, 120], [200, 392]]) this.qStone(g, rnd, x, y, 3);
      },
      // 48 — борт карьера без съезда: те же уступы, что у 41 (стыкуется с 40/41/42 по всем краям);
      // съезд остаётся только на паре бортов, иначе восемь одинаковых пандусов читаются узором
      (g) => {
        this.qPit(g, rnd, 'edge');
        this.vTufts(g, rnd, 8, 4, s - 16, 40, 30, Q.dry);
        for (let x = 12; x < s - 12; x += rnd.between(30, 60)) this.qStone(g, rnd, x, 44 + rnd.between(-2, 2), rnd.realInRange(2.5, 4), 0x6e6a60); // бруствер по бровке
      },
    ];
  }

  makeTexture(g, key, w, h) {
    // PNG из Blender уже загружен в preload — примитивы не нужны
    if (!this.textures.exists(key)) g.generateTexture(key, w, h);
    g.destroy();
  }
}
