import { CITY } from './config.js';

// Дома в каждом виде квартала: [x, y, ширина, высота] в координатах текстуры квартала.
// По этой таблице BootScene рисует кварталы, а GameScene ищет крыши для ящиков снабжения.
export const BUILDINGS = [
  // две длинные девятиэтажки и двор между ними
  [
    [60, 66, 280, 56],
    [60, 262, 280, 56],
  ],
  // «буквой Г»
  [
    [60, 60, 280, 56],
    [60, 116, 56, 224],
  ],
  // две точечные башни
  [
    [70, 70, 100, 100],
    [230, 230, 100, 100],
  ],
  // площадь с памятником — домов нет
  [],
];

// Центры крыш квартала в координатах мира. Квартал повёрнут на quarter × 90° вокруг своего центра.
export function roofCenters(variant, quarter, tileX, tileY) {
  const half = CITY.tile / 2;
  const a = (quarter * Math.PI) / 2;
  const cos = Math.round(Math.cos(a));
  const sin = Math.round(Math.sin(a));
  return BUILDINGS[variant].map(([x, y, w, h]) => {
    const lx = x + w / 2 - half;
    const ly = y + h / 2 - half;
    return { x: tileX + half + lx * cos - ly * sin, y: tileY + half + lx * sin + ly * cos };
  });
}
