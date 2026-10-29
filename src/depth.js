// Порядок отрисовки слоёв
export const DEPTH = {
  ground: 0,
  gems: 5,
  enemies: 10,
  shadow: 15,
  bullets: 20,
  enemyShells: 32,      // выше вертолёта — снаряд не должен прятаться под ним
  player: 30,
  rotor: 31,
  banner: 100,
};
