import { PALETTE as P } from '../config.js';

// Враги карьера (уровень 3): заражённые горняки, взрывник с динамитом, карьерный самосвал с породой,
// шагающий экскаватор, брошенный валун и штабель взрывчатки. Вид сверху, нос — вправо (+x).

function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// Жёлтое свечение «Зари» под заражённым — то же, что у городских
function glow(g, x, y, r) {
  g.fillStyle(P.glow, 0.35).fillCircle(x, y, r);
  g.fillStyle(P.glow, 0.2).fillCircle(x, y, r * 0.72);
}

// Горняк: брезентовая роба со светоотражающей полосой, заражённое лицо, каска с фонарём
function miner(g, hands = true) {
  glow(g, 13, 13, 13);
  if (hands) {
    g.fillStyle(0x3e4650).fillRect(14, 7, 8, 3).fillRect(14, 16, 8, 3);
    g.fillStyle(P.infected).fillRect(21, 7, 3, 3).fillRect(21, 16, 3, 3); // кисти
  }
  g.fillStyle(0x3e4650).fillEllipse(11, 13, 12, 18);
  g.lineStyle(1, 0x161a20, 0.9).strokeEllipse(11, 13, 12, 18);
  g.fillStyle(0x9a9c94).fillRect(8, 5, 2, 16); // светоотражающая полоса
  g.fillStyle(0xfff0b0, 0.22).fillTriangle(19, 13, 26, 8, 26, 18); // луч фонаря — впереди лица
  g.fillStyle(P.infectedHead).fillCircle(15, 13, 4);
  // Каска — на затылке, лицо видно; фонарь на лбу
  g.fillStyle(0xd8b030).fillEllipse(11, 13, 7, 10);
  g.fillStyle(0xf0cc48).fillEllipse(10, 12, 3.5, 5);
  g.lineStyle(1, 0x5a4410).strokeEllipse(11, 13, 7, 10);
  g.fillStyle(0xfff4c8).fillCircle(14, 13, 1.5);
  g.fillStyle(0xffffff).fillRect(17, 10.5, 2, 1).fillRect(17, 14.5, 2, 1); // глаза
}

// Колесо карьерного гиганта: шина с грунтозацепами
function tyre(g, x, y, w, h) {
  g.fillStyle(0x161614).fillRoundedRect(x, y, w, h, 2);
  g.fillStyle(0x34342e);
  for (let k = x + 1; k < x + w - 1; k += 3) g.fillRect(k, y, 1.5, h);
}

export function makeQuarryTextures(scene) {
  // Заражённый горняк
  tex(scene, 'miner', 26, 26, (g) => miner(g));

  // Взрывник: обнимает связку красных шашек, бикфордов шнур с яркой искрой — «опасно»
  tex(scene, 'blaster', 26, 26, (g) => {
    miner(g, false);
    g.fillStyle(0x3e4650).fillRect(14, 6, 6, 3).fillRect(14, 17, 6, 3); // руки обхватывают связку
    g.fillStyle(0x000000, 0.35).fillRect(16, 8, 7, 11);
    g.fillStyle(0xc8281e);
    for (let y = 7; y < 19; y += 3) g.fillRect(15, y, 7, 2.5); // шашки
    g.fillStyle(0xe85040);
    for (let y = 7; y < 19; y += 3) g.fillRect(15, y, 7, 1);
    g.fillStyle(0x1a1a1a).fillRect(17, 7, 1.5, 12).fillRect(20, 7, 1.5, 12); // изолента
    g.fillStyle(P.infected).fillRect(19, 5, 3, 3).fillRect(19, 18, 3, 3);
    g.lineStyle(1, 0x2a2a28).lineBetween(22, 9, 23, 5); // шнур
    // Искра
    g.fillStyle(0xffd040, 0.55).fillCircle(23, 4, 3.5);
    g.lineStyle(1, 0xfff080);
    g.lineBetween(23, 0.5, 23, 7.5).lineBetween(19.5, 4, 26, 4).lineBetween(21, 2, 25, 6).lineBetween(25, 2, 21, 6);
    g.fillStyle(0xffffff).fillCircle(23, 4, 1.5);
  });

  // Карьерный самосвал: огромные шины, жёлто-оранжевый кузов в грязи, кабина спереди слева,
  // кузов с породой и заражёнными в ней
  tex(scene, 'dumptruck', 64, 40, (g) => {
    g.fillStyle(0x000000, 0.3).fillRoundedRect(4, 4, 58, 34, 4);
    tyre(g, 4, 0, 18, 6); // сдвоенные задние
    tyre(g, 4, 34, 18, 6);
    tyre(g, 44, 0, 14, 6); // передние
    tyre(g, 44, 34, 14, 6);
    // Рама и капот
    g.fillStyle(0x8a6418).fillRect(40, 8, 22, 24);
    g.fillStyle(0xc89028).fillRect(44, 16, 16, 16);
    g.fillStyle(0x2a2418).fillRect(60, 18, 3, 12); // решётка радиатора
    g.fillStyle(0xfff0b0).fillRect(61, 15, 2, 2).fillRect(61, 31, 2, 2); // фары
    // Кузов с козырьком над кабиной
    g.fillStyle(0x6a4a14).fillRect(2, 3, 46, 34);
    g.fillStyle(0xc89028).fillRect(3, 4, 44, 32);
    g.fillStyle(0xa87820).fillRect(40, 4, 8, 12); // козырёк
    g.fillStyle(0x6a5a3e, 0.7).fillRect(3, 30, 44, 3).fillRect(18, 4, 3, 32); // грязные полосы
    g.fillStyle(0x6a5a3e, 0.45).fillRect(3, 9, 30, 2);
    // Порода в кузове
    g.fillStyle(0x6e6a64).fillRect(6, 7, 33, 26);
    const rocks = [[9, 10, 4], [16, 9, 3], [24, 11, 4], [33, 9, 3], [11, 20, 3], [30, 22, 4], [20, 28, 3], [9, 29, 3], [35, 29, 3], [26, 18, 2]];
    for (const [x, y, r] of rocks) {
      g.fillStyle(0x3a3834).fillCircle(x + 1, y + 1, r);
      g.fillStyle(0x8e8a80).fillCircle(x, y, r);
      g.fillStyle(0xa8a498).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.45);
    }
    // Заражённые в породе
    for (const [x, y] of [[17, 18], [28, 13], [14, 27]]) {
      g.fillStyle(P.glow, 0.45).fillCircle(x, y, 5);
      g.fillStyle(P.infectedHead).fillCircle(x, y, 3);
      g.fillStyle(0xffffff).fillRect(x + 1, y - 1.5, 1.5, 1).fillRect(x + 1, y + 1, 1.5, 1);
    }
    g.fillStyle(P.infected).fillRect(22, 18, 4, 2); // рука из кузова
    // Кабина спереди слева, под козырьком
    g.fillStyle(0x7a5a18).fillRect(48, 3, 12, 11);
    g.fillStyle(0xd8a030).fillRect(49, 4, 10, 9);
    g.fillStyle(0x3a4a58).fillRect(56, 5, 3, 7); // лобовое стекло
    g.fillStyle(P.infectedHead).fillCircle(52, 8.5, 2.2); // водитель
    g.lineStyle(1, 0x3a2a0a, 0.9).strokeRect(2, 3, 46, 34);
  });

  // Шагающий экскаватор: опорная база, лыжи-«ноги», поворотная платформа, длинная стрела с ковшом
  tex(scene, 'excavator', 70, 70, (g) => {
    g.fillStyle(0x000000, 0.3).fillCircle(25, 38, 21);
    g.fillStyle(0x2e2e2a).fillCircle(22, 35, 20); // опорная база
    g.lineStyle(1, 0x4a4a44).strokeCircle(22, 35, 20).strokeCircle(22, 35, 16);
    // Лыжи шагающего хода
    for (const y of [2, 58]) {
      g.fillStyle(0x000000, 0.3).fillRect(10, y + 3, 28, 10);
      g.fillStyle(0x3a3a34).fillRect(8, y, 28, 10);
      g.fillStyle(0x4c4c44).fillRect(8, y, 28, 3);
      g.fillStyle(0x5a4a2a).fillRect(18, y + (y < 30 ? 10 : -4), 8, 4); // эксцентрик
    }
    // Стрела: решётчатая, сужается к концу; канаты к А-раме
    g.fillStyle(0x000000, 0.3).fillTriangle(36, 34, 36, 44, 62, 40);
    g.fillStyle(0xb89a44).fillTriangle(32, 30, 32, 40, 60, 36).fillTriangle(32, 30, 60, 34, 60, 36);
    g.lineStyle(1, 0x6a5418).lineBetween(32, 30, 60, 34).lineBetween(32, 40, 60, 36);
    g.lineStyle(1, 0x6a5418);
    for (let x = 34; x < 58; x += 4) g.lineBetween(x, 30.5 + (x - 32) * 0.14, x + 4, 39.5 - (x - 32) * 0.14);
    g.fillStyle(0x4a4a44).fillCircle(60, 35, 2); // головной блок
    g.lineStyle(1, 0x1a1a18, 0.9).lineBetween(26, 32, 60, 35).lineBetween(26, 38, 60, 35);
    // Ковш на канатах, с зубьями и породой
    g.fillStyle(0x000000, 0.3).fillRect(56, 30, 12, 14);
    g.fillStyle(0x4a4a44).fillRect(54, 28, 12, 14);
    g.fillStyle(0x5e5e56).fillRect(54, 28, 12, 4);
    g.fillStyle(0x7a766e).fillRect(56, 32, 8, 8);
    g.fillStyle(0x2a2a26);
    for (let y = 29; y < 42; y += 3) g.fillRect(66, y, 3, 2);
    // Платформа с машинным отделением
    g.fillStyle(0x000000, 0.3).fillRect(7, 23, 30, 28);
    g.fillStyle(0x6a5418).fillRect(3, 20, 32, 30);
    g.fillStyle(0xa88a34).fillRect(4, 21, 30, 28);
    g.fillStyle(0xb89a44).fillRect(4, 21, 30, 9);
    g.fillStyle(0x5a4a24).fillRect(3, 23, 6, 24); // противовес
    g.fillStyle(0x7a4a2a, 0.75).fillRect(12, 43, 9, 4).fillRect(22, 22, 5, 3).fillRect(4, 30, 4, 7); // ржавчина
    g.fillStyle(0x6a5a30);
    for (const x of [12, 17, 22]) g.fillRect(x, 31, 3, 9); // жалюзи
    g.fillStyle(0x3a3a34).fillCircle(26, 44, 2); // выхлоп
    // Кабина спереди слева, заражённый машинист
    g.fillStyle(0x8a7028).fillRect(27, 20, 9, 10);
    g.fillStyle(0x3a4a58).fillRect(33, 21, 3, 8);
    g.fillStyle(P.glow, 0.5).fillCircle(30, 25, 3.5);
    g.fillStyle(P.infectedHead).fillCircle(30, 25, 2);
  });

  // Брошенный валун: серый, тёмный контур — читается как снаряд
  // Глыба — серая, а уступы тоже серые: красный ореол, как у снарядов оцепления, — видно на лету
  tex(scene, 'boulder', 24, 24, (g) => {
    g.fillStyle(0xff2d55, 0.35).fillCircle(12, 12, 12);
    g.fillStyle(0xff2d55, 0.55).fillCircle(12, 12, 9.5);
    g.translateCanvas(3, 3);
    const pts = [[9, 1.5], [14.5, 4], [16.5, 9.5], [13.5, 15], [7.5, 16.5], [2.5, 12.5], [1.5, 6]];
    g.fillStyle(0x9a968c).fillPoints(pts.map(([x, y]) => ({ x, y })), true);
    g.fillStyle(0xc4c0b4).fillPoints([{ x: 5, y: 4 }, { x: 10, y: 3 }, { x: 11, y: 7 }, { x: 5, y: 9 }], true);
    g.fillStyle(0x6a665e).fillPoints([{ x: 13, y: 10 }, { x: 15, y: 10 }, { x: 13, y: 14.5 }, { x: 8, y: 15 }], true);
    g.lineStyle(1, 0x4a4842).lineBetween(8, 9, 12, 12);
    g.lineStyle(1.5, 0x161614).strokePoints(pts.map(([x, y]) => ({ x, y })), true);
  });

  // Штабель взрывчатки: ящики с красными косыми полосами, бочки с красным пояском, брезент
  tex(scene, 'explosives', 60, 44, (g) => {
    g.fillStyle(0x000000, 0.3).fillRect(6, 7, 52, 36);
    const crate = (x, y, w, h) => {
      g.fillStyle(0x4a3c26).fillRect(x, y, w, h);
      g.fillStyle(0x7a6644).fillRect(x + 1, y + 1, w - 2, h - 2);
      g.lineStyle(1, 0x5a4a30).lineBetween(x + 1, y + h / 2, x + w - 1, y + h / 2);
      g.fillStyle(0xc0302a);
      g.fillTriangle(x + 2, y + h - 1, x + 6, y + h - 1, x + w * 0.45, y + 1);
      g.fillTriangle(x + w * 0.45, y + 1, x + w * 0.45 + 4, y + 1, x + 6, y + h - 1);
      g.fillTriangle(x + w * 0.5, y + h - 1, x + w * 0.5 + 4, y + h - 1, x + w - 2, y + 1);
    };
    crate(3, 3, 18, 14);
    crate(21, 3, 18, 14);
    crate(3, 18, 18, 14);
    crate(21, 18, 18, 14);
    crate(10, 30, 18, 12);
    for (const [x, y] of [[46, 9], [52, 19], [45, 27], [52, 35]]) {
      g.fillStyle(0x000000, 0.3).fillCircle(x + 1.5, y + 1.5, 6);
      g.fillStyle(0x5a6248).fillCircle(x, y, 6);
      g.lineStyle(2, 0xc0302a).strokeCircle(x, y, 4);
      g.lineStyle(1, 0x2a2e22).strokeCircle(x, y, 6);
      g.fillStyle(0x2a2e22).fillCircle(x + 2, y - 2, 1.2);
    }
    g.fillStyle(0x4e5640, 0.9).fillTriangle(30, 31, 40, 31, 36, 42); // край брезента
  });

  // Он же после взрыва: воронка, гарь, обломки досок и разорванная бочка
  tex(scene, 'explosivesBroken', 60, 44, (g) => {
    g.fillStyle(0x1a1816, 0.55).fillEllipse(30, 22, 58, 42);
    g.fillStyle(0x6a6050).fillEllipse(30, 22, 44, 32); // вывороченный грунт
    g.fillStyle(0x3a342c).fillEllipse(30, 23, 34, 24);
    g.fillStyle(0x221e1a).fillEllipse(31, 24, 22, 15);
    g.fillStyle(0x7a7060, 0.7).fillEllipse(24, 14, 14, 5);
    g.fillStyle(0x4a3c26);
    for (const [x, y, w, h] of [[4, 6, 10, 3], [46, 4, 9, 2], [50, 32, 8, 3], [6, 34, 7, 2], [40, 38, 6, 2], [16, 2, 5, 2]]) g.fillRect(x, y, w, h);
    g.fillStyle(0xc0302a, 0.8).fillRect(5, 6, 3, 3).fillRect(51, 32, 3, 3); // обрывки полос
    g.lineStyle(2, 0x5a6248).beginPath().arc(48, 18, 5, 0.6, 4.4).strokePath(); // разорванная бочка
    g.fillStyle(0xff8a2a, 0.5).fillCircle(28, 25, 2).fillCircle(35, 21, 1.5); // тлеющие угли
  });

  // Автобус смены (маленький, как районный): кремово-оранжевый, ряд окон, в окнах — головы рабочих в касках
  tex(scene, 'workbus', 46, 24, (g) => {
    g.fillStyle(0x000000, 0.25).fillRect(3, 4, 42, 19);
    g.fillStyle(0x161a14).fillRect(8, 1, 7, 3).fillRect(32, 1, 7, 3).fillRect(8, 20, 7, 3).fillRect(32, 20, 7, 3);
    g.fillStyle(0xe8dcb8).fillRect(2, 3, 42, 18); // кузов
    g.fillStyle(0xd86a2a).fillRect(2, 3, 42, 4).fillRect(2, 17, 42, 4); // оранжевые борта
    g.fillStyle(0xc8bc98).fillRect(6, 8, 30, 8); // крыша
    g.fillStyle(0x6a6a5a).fillRect(14, 9, 6, 6); // люк
    g.fillStyle(0x3a4a58).fillRect(38, 5, 5, 14); // лобовое
    for (let x = 6; x < 36; x += 6) {
      g.fillStyle(0x3a4a58).fillRect(x, 4, 4, 2).fillRect(x, 18, 4, 2); // окна по бортам
      g.fillStyle(0xf0c020).fillCircle(x + 2, 5, 1.2).fillCircle(x + 2, 19, 1.2); // каски в окнах
    }
    g.fillStyle(P.glow).fillRect(43, 5, 2, 3).fillRect(43, 16, 2, 3); // фары
    g.fillStyle(P.glow, 0.6).fillCircle(26, 12, 2);
    g.lineStyle(1, 0x5a4a30, 0.9).strokeRect(2, 3, 42, 18);
  });
}
