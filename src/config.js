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

// Реплики «Берёзы» при смене волны — поверх игры, без паузы
export const RADIO = {
  duration: 3,          // с на экране; 2 с не хватало, чтобы прочитать строку на ходу
  fade: 0.3,            // с на появление и исчезновение
};

// «Сочность»: частицы, тряска, цифры урона
export const FX = {
  damageNumbers: true,  // всплывающие цифры урона
  damageNumberPool: 40, // сколько цифр одновременно на экране максимум
  damageNumberLife: 0.55, // с
  hitShake: { duration: 120, intensity: 0.006 },   // игрок получил урон
  heavyShake: { duration: 260, intensity: 0.011 }, // погиб танк
  bossShake: { duration: 500, intensity: 0.015 },  // погиб «Объект»
  deathShake: { duration: 300, intensity: 0.012 }, // погиб игрок
};

// Звуки синтезируются WebAudio — файлов нет, лицензий не нужно
export const SFX = {
  volume: 0.45,
  minGap: { shot: 0.06, pickup: 0.035, explosion: 0.05, hit: 0.2 }, // с между одинаковыми звуками
};

// Замеры забегов: localStorage, кнопка «Скопировать статистику» на экране итогов
export const TELEMETRY = {
  maxRuns: 100,         // сколько последних забегов хранить
};

export const BRIEFING = {
  typeSpeed: 70,        // символов в секунду
  inputDelay: 0.3,      // с, пока тап не срабатывает
};

export const WORLD = {
  width: 4000,
  height: 4000,
};

// Город из квадратных кварталов; WORLD должен делиться на tile без остатка
export const CITY = {
  tile: 400,
  road: 34,             // ширина половины дороги по краю квартала
  variants: 4,          // сколько видов кварталов рисует BootScene
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

// Палитра на примитивах: серые панельки, тёмно-зелёная техника, ядовито-жёлтое свечение заражённых
export const PALETTE = {
  asphalt: 0x2e3134,
  roadMark: 0x8a8670,
  sidewalk: 0x55585c,
  yard: 0x3c403a,
  panel: 0x80858b,      // крыши панельных домов
  panelDark: 0x4e5257,
  tree: 0x2e4a2a,
  treeLight: 0x3d5c36,
  army: 0x3a4a30,       // техника оцепления
  armyDark: 0x26301f,
  glow: 0xe0ff30,       // свечение «Зари»
  infected: 0x6b7350,   // кожа заражённых
};

// Ключи — внутренние имена типов (и текстур):
//   infantry — заражённые, jeep — заражённый вездеход, aa — зенитная установка оцепления,
//   tank — танк оцепления, boss — «Объект».
// behavior: chase — идёт на игрока, dash — рывками, turret — стоит и стреляет,
//   tank — ползёт и стреляет по прямой, boss — мини-босс.
export const ENEMIES = {
  infantry: {
    behavior: 'chase',
    hp: 20,
    speed: 55,
    speedJitter: 15,    // ± к скорости, чтобы толпа не слипалась в точку
    damage: 10,         // урон игроку при касании
    xp: 1,              // ценность выпадающего кристалла
    radius: 9,
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
    shellTexture: 'shell',
    damage: 10,
    xp: 4,
    radius: 15,
  },
  // Медленный, толстый; поворачивает корпус к игроку не сразу и стреляет туда, куда смотрит
  tank: {
    behavior: 'tank',
    hp: 180,
    speed: 22,
    speedJitter: 4,
    turnRate: 0.9,      // рад/с — от выстрела можно уйти вбок
    fireInterval: 3,
    range: 600,
    aimTolerance: 0.25, // рад: стреляет, только если почти навёлся
    shellSpeed: 300,    // быстрее зенитки, но строго по прямой
    shellDamage: 18,
    shellLife: 3,
    shellTexture: 'tankShell',
    damage: 15,
    xp: 6,
    radius: 18,
  },
  // «Объект»: огромный мутант из лаборатории, медленно ползёт к игроку и плюётся «Зарёй»
  boss: {
    behavior: 'boss',
    hp: 5000,
    speed: 28,
    speedJitter: 0,
    damage: 20,
    xp: 0,
    radius: 40,
    volleyInterval: 1.3,  // прицельный залп
    volleyCount: 3,
    volleySpread: 0.25,   // рад между снарядами залпа
    burstInterval: 3.2,   // кольцо снарядов во все стороны
    burstCount: 16,
    shellSpeed: 190,
    shellDamage: 14,
    shellLife: 5,
    shellTexture: 'spit',
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
  { hpMul: 1.5, infantry: { interval: 0.9, batch: 6 }, jeep: { interval: 2.5, batch: 3 }, aa: { interval: 7, batch: 1 }, tank: { interval: 14, batch: 1 } },
  { hpMul: 1.9, infantry: { interval: 0.8, batch: 7 }, jeep: { interval: 2.0, batch: 3 }, aa: { interval: 5, batch: 1 }, tank: { interval: 11, batch: 1 } },
  { hpMul: 2.4, infantry: { interval: 0.7, batch: 8 }, jeep: { interval: 1.6, batch: 4 }, aa: { interval: 4, batch: 2 }, tank: { interval: 9, batch: 2 } },
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
  // Замер ботом (шаг 9): при старой кривой (5, +4) первый уровень был на 6-й секунде,
  // а все 27 уровней улучшений заканчивались к 3:44. Плавная кривая с высоким стартом
  // (45, +5) давала первый уровень вовремя, но к 2:15 только 7-й уровень и полный пул врагов.
  // Поэтому первый уровень отдельно, дальше — дешевле.
  first: 45,            // опыта до 2-го уровня — он приходит на ~20-й секунде
  base: 20,             // опыта до 3-го уровня
  perLevel: 6,          // +столько к требованию за каждый следующий уровень
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
