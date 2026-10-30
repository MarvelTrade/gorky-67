import * as Phaser from 'phaser';
import { PALETTE as P, CITY } from '../config.js';

// Отрендеренные в Blender спрайты (tools/blender/make_sprites.py → public/sprites/<ключ>.png).
// Если PNG есть — он заменяет текстуру из примитивов с тем же ключом и размером.
const BLENDER_SPRITES = ['heli', 'rotor', 'infantry', 'jeep', 'aa', 'tank', 'boss'];
const TOWER_SPRITES = ['towerRadio', 'towerWater', 'towerBell', 'towerChimney'];

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
    this.makeIndustryTextures();
    this.makeMonumentTextures();
    this.makePauseTexture();
    this.makeTowerTextures();
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

  // Кнопка паузы: полупрозрачный круг и две полоски
  makePauseTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.45);
    g.fillCircle(20, 20, 20);
    g.lineStyle(2, 0xffffff, 0.6);
    g.strokeCircle(20, 20, 19);
    g.fillStyle(0xffffff);
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
    ];

    layouts.forEach((draw, i) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
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

  makeTexture(g, key, w, h) {
    // PNG из Blender уже загружен в preload — примитивы не нужны
    if (!this.textures.exists(key)) g.generateTexture(key, w, h);
    g.destroy();
  }
}
