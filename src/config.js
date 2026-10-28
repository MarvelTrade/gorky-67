// Все балансные числа — только здесь.

export const WORLD = {
  width: 4000,
  height: 4000,
  gridStep: 100,
  bgColor: 0x2c3a24,
  gridColor: 0x3a4a30,
};

export const PLAYER = {
  maxSpeed: 320,        // px/с
  accel: 6,             // насколько быстро скорость догоняет желаемую (1/с), меньше = больше инерции
  turnSpeed: 7,         // скорость поворота носа (рад/с)
  arriveRadius: 60,     // начинает тормозить ближе этого расстояния до точки касания
  stopRadius: 6,        // считаем, что прилетел
  rotorSpeed: 40,       // рад/с, чисто визуал
  hitRadius: 18,
  maxHp: 100,
  invulnTime: 0.6,      // с неуязвимости после получения урона
};

export const GUN = {
  damage: 10,
  fireRate: 7,          // выстрелов в секунду
  range: 420,           // дальность поиска цели
  bulletSpeed: 900,
  bulletLife: 0.6,      // с
  spread: 0.06,         // разброс, рад
  muzzleOffset: 34,     // от центра вертолёта до носа
};

export const ENEMIES = {
  infantry: {
    hp: 20,
    speed: 55,
    speedJitter: 15,    // ± к скорости, чтобы толпа не слипалась в точку
    damage: 10,         // урон игроку при касании
    radius: 9,
    color: 0xc0503c,
  },
};

export const SPAWN = {
  interval: 1.0,        // с между пачками
  batch: 4,             // врагов за пачку
  margin: 80,           // насколько за краем экрана появляются
  maxEnemies: 300,      // размер пула
};

export const POOLS = {
  bullets: 120,
};
