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

export function makeArmyTextures(scene) {
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
