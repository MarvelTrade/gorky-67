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
};
