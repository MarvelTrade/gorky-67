// Порядок отрисовки слоёв
export const DEPTH = {
  ground: 0,
  gems: 5,
  enemies: 10,
  shadow: 15,
  towerShadow: 16,
  bullets: 20,
  wires: 29,            // провода на высоте полёта: под вертолётом, над врагами
  towers: 34,           // высокие сооружения выше вертолёта и винта
  enemyShells: 32,      // выше вертолёта — снаряд не должен прятаться под ним
  player: 30,
  rotor: 31,
  banner: 100,
};
