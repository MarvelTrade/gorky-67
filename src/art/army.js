import { PALETTE as P } from '../config.js';

// Техника города до танков: милицейская машина и бронетранспортёр оцепления. Вид сверху, нос — вправо.
// Марок и моделей нет — выдуманные силуэты. Рисуются один раз (GameScene, есть — пропускает)

function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// Платформа эшелона сверху (вагон рисуется носом на юг, в поезде — переворачивается): рама, борта, колёса
function flatcar(g) {
  g.fillStyle(0x161a14).fillRect(0, 6, 3, 8).fillRect(21, 6, 3, 8).fillRect(0, 38, 3, 8).fillRect(21, 38, 3, 8);
  g.fillStyle(0x5a5a52).fillRect(2, 0, 20, 52);
  g.fillStyle(0x4a4a42);
  for (let y = 4; y < 52; y += 8) g.fillRect(3, y, 18, 2); // доски настила
  g.lineStyle(1, 0x2a2a26).strokeRect(2, 0, 20, 52);
}

export function makeArmyTextures(scene) {
  // Эшелон: пустая платформа и платформы с морским контейнером трёх цветов
  tex(scene, 'flatcar', 24, 52, (g) => flatcar(g));
  [0xa04a30, 0x2f5a8a, 0x3a6a48].forEach((col, i) =>
    tex(scene, `flatcarBox${i}`, 24, 52, (g) => {
      flatcar(g);
      g.fillStyle(col).fillRect(3, 4, 18, 44);
      g.fillStyle(0x000000, 0.18);
      for (let y = 6; y < 46; y += 4) g.fillRect(3, y, 18, 1); // гофра
      g.lineStyle(1, 0x1a1a16, 0.8).strokeRect(3, 4, 18, 44);
      g.fillStyle(0xffffff, 0.12).fillRect(4, 5, 4, 42);
    })
  );
  // Вагон с пушкой: бронированный короб, мешки с песком; башня — отдельной картинкой (gunTurret)
  tex(scene, 'gunwagon', 24, 52, (g) => {
    flatcar(g);
    g.fillStyle(P.army).fillRect(3, 8, 18, 36);
    g.lineStyle(2, P.armyDark).strokeRect(3, 8, 18, 36);
    g.fillStyle(0x8a7a5a);
    for (let y = 3; y < 50; y += 5) g.fillRect(1, y, 3, 4).fillRect(20, y, 3, 4); // мешки по бортам
    g.fillStyle(0xd8d8d0).fillRect(3, 40, 18, 2); // полоса опознавания
    g.fillStyle(0xb03024).fillRect(10, 12, 4, 4); // красная звезда-пятно
  });
  tex(scene, 'gunTurret', 26, 18, (g) => {
    g.fillStyle(P.armyDark).fillRect(9, 7, 17, 4); // ствол
    g.fillStyle(0x4a5c3c).fillCircle(9, 9, 8);
    g.lineStyle(1.5, P.armyDark).strokeCircle(9, 9, 8);
    g.fillStyle(0x2e3a26).fillCircle(7, 9, 3);
  });
  // Милиция: жёлтый легковой с синей полосой, мигалка на крыше, пятна «Зари»
  tex(scene, 'police', 34, 20, (g) => {
    g.fillStyle(P.glow, 0.3).fillEllipse(17, 10, 34, 20);
    g.fillStyle(0x161a14).fillRect(6, 1, 6, 2).fillRect(22, 1, 6, 2).fillRect(6, 17, 6, 2).fillRect(22, 17, 6, 2);
    g.fillStyle(0xe8c840).fillRect(2, 3, 30, 14); // кузов
    g.fillStyle(0x2a5aa8).fillRect(2, 9, 30, 2); // синяя полоса
    g.fillStyle(0x3a4a58).fillRect(20, 4, 5, 12).fillRect(7, 4, 3, 12); // стёкла
    g.fillStyle(0xd8b830).fillRect(11, 4, 9, 12); // крыша
    g.fillStyle(0x3a7cff).fillRect(14, 5, 3, 4); // мигалка: синий…
    g.fillStyle(0xff3a3a).fillRect(14, 11, 3, 4); // …и красный
    g.fillStyle(0xffffff, 0.8).fillRect(15, 6, 1, 2).fillRect(15, 12, 1, 2);
    g.fillStyle(P.glow).fillRect(31, 4, 2, 3).fillRect(31, 13, 2, 3); // фары
    g.fillStyle(P.glow, 0.7).fillCircle(5, 6, 1.5);
    g.lineStyle(1, 0x5a4a10, 0.9).strokeRect(2, 3, 30, 14);
  });
  // Бронетранспортёр: восемь колёс, лодочный корпус, башенка с крупнокалиберным стволом вперёд
  tex(scene, 'btr', 56, 34, (g) => {
    g.fillStyle(0x161a14);
    for (const x of [8, 18, 34, 44]) g.fillRect(x, 0, 7, 5).fillRect(x, 29, 7, 5);
    g.fillStyle(P.army);
    g.fillPoints(
      [
        { x: 2, y: 8 }, { x: 40, y: 4 }, { x: 52, y: 11 }, { x: 52, y: 23 }, { x: 40, y: 30 }, { x: 2, y: 26 },
      ],
      true
    );
    g.lineStyle(2, P.armyDark).strokePoints(
      [
        { x: 2, y: 8 }, { x: 40, y: 4 }, { x: 52, y: 11 }, { x: 52, y: 23 }, { x: 40, y: 30 }, { x: 2, y: 26 },
      ],
      true
    );
    g.fillStyle(P.armyDark).fillRect(6, 11, 14, 12); // моторный отсек — сзади, решётки
    g.fillStyle(0x1e2618);
    for (let y = 12; y < 23; y += 3) g.fillRect(7, y, 12, 1);
    g.fillStyle(0x2e3a26).fillRect(36, 8, 6, 4).fillRect(36, 22, 6, 4); // люки
    g.fillStyle(0xd8d8d0).fillRect(23, 6, 3, 22); // белая полоса опознавания
    g.fillStyle(P.armyDark).fillRect(30, 15, 26, 4); // ствол
    g.fillStyle(0x4a5c3c).fillCircle(30, 17, 7); // башенка
    g.lineStyle(1.5, P.armyDark).strokeCircle(30, 17, 7);
    g.fillStyle(P.glow, 0.7).fillCircle(14, 8, 1.8).fillCircle(44, 25, 1.6); // пятна «Зари»
  });
}
