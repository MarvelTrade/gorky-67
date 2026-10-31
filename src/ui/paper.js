// Общий стиль экранов — «канцелярия 1983 года», как стартовое меню (MenuScene):
// бумага, машинописный шрифт, выцветший красный штамп, хаки и латунь.
// Здесь только цвета и сборка простых деталей; раскладку каждый экран делает сам.

export const FONT = 'monospace';   // машинка
export const PAPER = 0xe6dcc0;      // бумага карточки «дела»
export const PAPER_HI = 0xf0e8d0;   // бумага под пальцем
export const PAPER_DIM = 0xd2c7a6;  // графа бланка, пожелтевший лист
export const EDGE = 0x8a7a5a;       // обрез листа, линовка
export const INK = '#2a2418';       // машинописные чернила
export const INK_SOFT = '#5a5040';  // бледная копирка
export const INK_FAINT = '#8a7a5a'; // недоступное — почти стёрто
export const PEN = '#23408a';       // шариковая ручка: то, что «вписано» в бланк
export const RED = 0xb03024;        // штамп
export const RED_CSS = '#b03024';
export const GREEN_INK = 0x3d6b34;  // штамп «выжил» — зелёный значит «выход» (Иттен)
export const KHAKI = 0x3a4128;      // хаки — фон плашек поверх игры
export const BRASS = 0xb89a52;      // латунь — рамки
export const LIGHT = '#e6dcc0';     // текст цвета бумаги на тёмном

// Кнопки — те же, что в меню: зелёная «главная» и серая с латунной/стальной обводкой
export const BTN = {
  main: { fill: 0x6b8f3a, stroke: 0xc8e08a },
  brass: { fill: 0x3a4148, stroke: 0xf2c94c },
  plain: { fill: 0x3a4148, stroke: 0x8a949c },
  quiet: { fill: 0x3a3f36, stroke: 0x6a7060 },
};

// Категории улучшений на бумаге: чернильные варианты оружие / защита / манёвр.
// Яркие LEVELUP.categories рассчитаны на тёмный фон и на бумаге не читаются
export const CAT_INK = {
  weapon: { color: 0xa8461c, text: '#8a3410' },
  defense: { color: 0x3d6b34, text: '#2e5527' },
  move: { color: 0x2f5f86, text: '#244a6a' },
};

// Лист бумаги с тенью: { shadow, paper, lines } — добавить в сцену или контейнер.
// drawSheet ставит его по прямоугольнику и рисует линовку; вызывать только из layout
export function makeSheet(scene) {
  const shadow = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.35).setOrigin(0);
  const paper = scene.add.rectangle(0, 0, 10, 10, PAPER).setOrigin(0).setStrokeStyle(2, EDGE);
  const lines = scene.add.graphics();
  return { shadow, paper, lines, parts: [shadow, paper, lines] };
}

// opts: header — y красной черты под грифом (от верха листа), rule — шаг линовки (0 — без неё)
export function drawSheet(sheet, x, y, w, h, opts = {}) {
  const { header = 26, rule = 22 } = opts;
  sheet.shadow.setPosition(x + 5, y + 5).setSize(w, h);
  sheet.paper.setPosition(x, y).setSize(w, h);
  const g = sheet.lines.clear();
  if (header) g.lineStyle(1, RED, 0.4).lineBetween(x + 10, y + header, x + w - 10, y + header);
  if (rule) {
    g.lineStyle(1, EDGE, 0.22);
    for (let ly = y + header + rule; ly < y + h - 6; ly += rule) g.lineBetween(x + 10, ly, x + w - 10, ly);
  }
}

// Штамп: текст в рамке, повёрнутые вместе. color — число (0xb03024)
export function makeStamp(scene, text, size = 16, color = RED, angle = -8) {
  const css = `#${color.toString(16).padStart(6, '0')}`;
  const label = scene.add
    .text(0, 0, text, { fontFamily: FONT, fontSize: `${size}px`, color: css, fontStyle: 'bold', padding: { x: 8, y: 3 } })
    .setOrigin(0.5);
  const frame = scene.add.rectangle(0, 0, label.width, label.height).setStrokeStyle(size >= 24 ? 4 : 3, color);
  const c = scene.add.container(0, 0, [frame, label]).setAngle(angle).setAlpha(0.88);
  Object.assign(c, { label, frame });
  return c;
}
