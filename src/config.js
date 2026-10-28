// Все балансные числа — только здесь.

export const RUN = {
  duration: 300,        // с — продержался столько, значит выжил
  endDelay: 1.0,        // с между смертью/победой и экраном итогов
  gameOverInputDelay: 0.8, // с, пока «Ещё раз» не нажимается — чтобы не перезапустить зажатым пальцем
};

export const CONTROLS = {
  touchJoystick: true,  // палец = плавающий джойстик; false — вертолёт летит к пальцу, как к мыши
  stickRadius: 60,      // px: дальше от центра — полная скорость
  deadZone: 8,          // px: меньше — стоим на месте
};

// На маленьких экранах камера отдаляется, чтобы по короткой стороне было видно
// хотя бы столько мира. Иначе на вертикальном телефоне зенитки стреляют из-за края.
export const VIEW = {
  minShortSide: 520,
};

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
  magnetRadius: 90,     // с какого расстояния кристаллы летят к вертолёту
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

// behavior: chase — идёт на игрока, dash — рывками, turret — стоит и стреляет, boss — мини-босс
export const ENEMIES = {
  infantry: {
    behavior: 'chase',
    hp: 20,
    speed: 55,
    speedJitter: 15,    // ± к скорости, чтобы толпа не слипалась в точку
    damage: 10,         // урон игроку при касании
    xp: 1,              // ценность выпадающего кристалла
    radius: 9,
    color: 0xc0503c,
  },
  jeep: {
    behavior: 'dash',
    hp: 15,
    speed: 0,           // между рывками катится по инерции
    speedJitter: 0,
    dashSpeed: 300,     // направление фиксируется в начале рывка — можно увернуться
    dashTime: 0.7,
    pauseTime: 0.6,
    pauseDrag: 4,       // насколько быстро тормозит между рывками (1/с)
    damage: 12,
    xp: 2,
    radius: 11,
    color: 0xb8a040,
  },
  aa: {
    behavior: 'turret',
    hp: 60,
    speed: 0,
    speedJitter: 0,
    fireInterval: 2.2,  // с между выстрелами
    range: 520,         // стреляет, только если игрок ближе
    shellSpeed: 170,    // снаряды медленные — от них надо уворачиваться
    shellDamage: 12,
    shellLife: 4,
    damage: 10,
    xp: 4,
    radius: 15,
    color: 0x7a6a5a,
  },
  // Мини-босс: большая зенитная установка, медленно ползёт к игроку
  boss: {
    behavior: 'boss',
    hp: 5000,
    speed: 28,
    speedJitter: 0,
    damage: 20,
    xp: 0,
    radius: 40,
    color: 0x5a4a3e,
    volleyInterval: 1.3,  // прицельный залп
    volleyCount: 3,
    volleySpread: 0.25,   // рад между снарядами залпа
    burstInterval: 3.2,   // кольцо снарядов во все стороны
    burstCount: 16,
    shellSpeed: 190,
    shellDamage: 14,
    shellLife: 5,
  },
};

// Босс появляется в начале 5-й минуты недалеко от игрока, чтобы его было видно.
// Убил босса — победа сразу; не убил, но дожил до конца RUN.duration — тоже победа.
export const BOSS_SPAWN = {
  at: 240,              // с от начала забега
  dist: 380,            // расстояние от игрока
};

// Волны: каждые WAVE_LENGTH секунд — следующая. Для каждого типа — пачка раз в interval секунд.
// hpMul растит живучесть врагов, чтобы улучшения не делали игру слишком лёгкой.
export const WAVE_LENGTH = 60;
export const WAVES = [
  { hpMul: 1.0, infantry: { interval: 1.0, batch: 4 } },
  { hpMul: 1.2, infantry: { interval: 1.0, batch: 5 }, jeep: { interval: 3.0, batch: 2 } },
  { hpMul: 1.5, infantry: { interval: 0.9, batch: 6 }, jeep: { interval: 2.5, batch: 3 }, aa: { interval: 7, batch: 1 } },
  { hpMul: 1.9, infantry: { interval: 0.8, batch: 7 }, jeep: { interval: 2.0, batch: 3 }, aa: { interval: 5, batch: 1 } },
  { hpMul: 2.4, infantry: { interval: 0.7, batch: 8 }, jeep: { interval: 1.6, batch: 4 }, aa: { interval: 4, batch: 2 } },
];

export const SPAWN = {
  margin: 80,           // насколько за краем экрана появляются
  despawnDist: 1400,    // враги дальше этого от игрока возвращаются в пул (без опыта)
  maxEnemies: 300,      // размер пула
};

export const POOLS = {
  bullets: 120,
  shells: 150,
  missiles: 24,
  gems: 400,
};

export const XP = {
  base: 5,              // опыта до 2-го уровня
  perLevel: 4,          // +столько к требованию за каждый следующий уровень
  pickupRadius: 22,
  gemStartSpeed: 120,   // скорость кристалла в момент «захвата» магнитом
  gemAccel: 1400,       // px/с², чтобы кристалл догонял летящий вертолёт
};

// Самонаводящиеся ракеты (открываются улучшением)
export const MISSILE = {
  cooldown: 2.5,        // с между залпами
  damage: 40,
  splash: 55,           // радиус взрыва
  speed: 380,
  turnRate: 5,          // рад/с
  life: 2.5,
  range: 650,           // радиус поиска цели
};

export const UPGRADES = {
  damageMul: 1.25,
  fireRateMul: 1.2,
  speedMul: 1.1,
  magnetAdd: 45,
  hpAdd: 25,            // и к максимуму, и лечение на столько же
  missileCooldownMul: 0.85, // со 2-го уровня ракет: залп чаще
  maxLevel: { damage: 5, fireRate: 5, speed: 4, magnet: 4, hp: 5, missile: 4 },
};

export const LEVELUP = {
  inputDelay: 0.35,     // с, пока карточки не кликаются (чтобы не выбрать случайно отпущенным пальцем)
};
