import * as Phaser from 'phaser';
import { PALETTE as P, CITY } from '../config.js';
import { BUILDINGS } from '../cityLayout.js';

// Отрендеренные в Blender спрайты (tools/blender/make_sprites.py → public/sprites/<ключ>.png).
// Если PNG есть — он заменяет текстуру из примитивов с тем же ключом и размером.
const BLENDER_SPRITES = ['heli', 'rotor', 'infantry', 'jeep', 'aa', 'tank', 'boss'];

// Генерирует текстуры из примитивов; часть заменяется PNG из Blender.
// Все спрайты смотрят вправо (угол 0).
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    for (const key of BLENDER_SPRITES) this.load.image(key, `sprites/${key}.png`);
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
    this.makePauseTexture();
    this.makeTowerTextures();
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
      (g) => {
        g.fillStyle(0x5e6166);
        g.fillRect(70, 70, 260, 260);
        g.lineStyle(2, 0x6c7075);
        for (let i = 1; i < 6; i++) {
          g.lineBetween(70 + i * 43, 70, 70 + i * 43, 330);
          g.lineBetween(70, 70 + i * 43, 330, 70 + i * 43);
        }
        g.fillStyle(P.panelDark);
        g.fillCircle(200, 200, 30);
        g.fillStyle(P.panel);
        g.fillRect(190, 190, 20, 20);
        for (const [x, y] of [[50, 50], [350, 50], [50, 350], [350, 350], [200, 50], [50, 200], [350, 200], [200, 350]]) {
          this.tree(g, x, y, 11);
        }
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
      // Дома — из общей таблицы, по ней же GameScene находит крыши
      for (const [x, y, w, h] of BUILDINGS[i]) this.building(g, x, y, w, h);
      this.makeTexture(g, `city${i}`, s, s);
    });
  }

  // Панельный дом сверху: тень, крыша с подъездными секциями и выходами на крышу
  building(g, x, y, w, h) {
    g.fillStyle(0x000000, 0.28);
    g.fillRect(x + 8, y + 8, w, h);
    g.fillStyle(P.panel);
    g.fillRect(x, y, w, h);
    g.lineStyle(2, P.panelDark);
    g.strokeRect(x, y, w, h);
    const long = w >= h;
    const len = long ? w : h;
    const sections = Math.max(1, Math.round(len / 46));
    const step = len / sections;
    g.lineStyle(1, P.panelDark, 0.7);
    for (let i = 1; i < sections; i++) {
      if (long) g.lineBetween(x + i * step, y, x + i * step, y + h);
      else g.lineBetween(x, y + i * step, x + w, y + i * step);
    }
    g.fillStyle(P.panelDark);
    for (let i = 0; i < sections; i++) {
      const cx = long ? x + (i + 0.5) * step : x + w / 2;
      const cy = long ? y + h / 2 : y + (i + 0.5) * step;
      g.fillRect(cx - 4, cy - 4, 8, 8);
    }
  }

  tree(g, x, y, r) {
    g.fillStyle(P.tree);
    g.fillCircle(x, y, r);
    g.fillStyle(P.treeLight);
    g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.5);
  }

  trees(g, rnd, x, y, w, h, n) {
    for (let i = 0; i < n; i++) {
      this.tree(g, x + rnd.between(10, w - 10), y + rnd.between(10, h - 10), rnd.between(8, 13));
    }
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
