import * as Phaser from 'phaser';
import { HUD_GAUGES, PLAYER, CONTROLS, FX, SPIN, ARRIVAL, LAST_STAND } from '../config.js';
import { sfx } from '../systems/Sfx.js';
import { DEPTH } from '../depth.js';

// Вертолёт игрока. Управление:
//  - палец → плавающий джойстик: где коснулся, там центр; отпустил → зависает
//  - мышь зажата → летит к точке под курсором
//  - WASD/стрелки → летит в направлении, имеют приоритет над остальным
export class Player {
  constructor(scene, x, y) {
    this.scene = scene;

    // Тень на земле — смещена, вертолёт «висит» в воздухе
    this.shadow = scene.add.image(x, y, 'heli').setTint(0x000000).setAlpha(0.35).setScale(0.9);
    this.shadow.setDepth(DEPTH.shadow);

    this.sprite = scene.physics.add.sprite(x, y, 'heli');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setCircle(PLAYER.hitRadius, 35 - PLAYER.hitRadius, 24 - PLAYER.hitRadius);
    this.sprite.setDepth(DEPTH.player);
    this.body = this.sprite.body;
    // Физика — у невидимого sprite, видно — look: его можно сжимать для наклонов, не трогая тело столкновений
    this.sprite.setVisible(false);
    this.look = scene.add.image(x, y, 'heli').setDepth(DEPTH.player);
    this.tilt = { pitch: 0, roll: 0, t: Math.random() * 10, vx: 0, vy: 0, rot: 0 };

    this.rotor = scene.add.image(x, y, 'rotor');
    this.rotor.setDepth(DEPTH.rotor);
    // Реактивные ускорители: появляются, когда ход вырос до HUD_GAUGES.boostAt; пламя — по скорости
    this.pods = scene.add.image(x, y, 'jetPods').setDepth(DEPTH.player + 0.01).setVisible(false);
    this.flames = [0, 1].map(() => scene.add.image(x, y, 'jetFlame').setOrigin(1, 0.5).setDepth(DEPTH.player - 0.01).setVisible(false));

    // Копия, чтобы улучшения меняли её, а не конфиг
    this.stats = { ...PLAYER };
    this.maxHp = PLAYER.maxHp;
    this.hp = this.maxHp;
    this.invuln = 0;
    this.reserve = LAST_STAND.zones.map((z) => z.pool); // скрытый запас по зонам, доли maxHp (см. LAST_STAND)
    this.stillT = 0; // сколько секунд висит на месте
    this.autopilot = null; // прилёт в начале уровня: { points, i }

    this.target = null; // точка под мышью, в экранных координатах
    this.stick = null; // { id, ax, ay, x, y } — джойстик пальца, тоже в экранных координатах
    this.desired = new Phaser.Math.Vector2();

    this.keys = scene.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');

    const input = scene.input;
    input.on('pointerdown', this.onPointer, this);
    input.on('pointermove', this.onPointer, this);
    input.on('pointerup', this.onPointerUp, this);
    input.on('pointerupoutside', this.onPointerUp, this);
    input.on('gameout', () => (this.target = null));
  }

  onPointer(pointer) {
    if (!pointer.isDown) return;
    if (pointer.wasTouch && CONTROLS.touchJoystick) {
      // Второй палец джойстик не перехватывает
      if (this.stick && this.stick.id !== pointer.id) return;
      // Центр — там, где палец оказался первым; в том числе после паузы, если палец не отпускали
      if (!this.stick) this.stick = { id: pointer.id, ax: pointer.x, ay: pointer.y };
      this.stick.x = pointer.x;
      this.stick.y = pointer.y;
      return;
    }
    // Точку храним в экранных координатах: держишь мышь на месте —
    // вертолёт продолжает лететь, а камера едет за ним.
    this.target = { x: pointer.x, y: pointer.y };
  }

  onPointerUp(pointer) {
    if (this.stick && this.stick.id === pointer.id) this.stick = null;
    if (!this.scene.input.activePointer.isDown) this.target = null;
  }

  // После паузы: палец/клавиши могли отпустить, пока сцена не слушала ввод
  resetInput() {
    this.target = null;
    this.stick = null;
    this.scene.input.keyboard.resetKeys();
  }

  hide() {
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.look.setVisible(false);
    this.rotor.setVisible(false);
    this.shadow.setVisible(false);
  }

  // «Воскреснуть»: снова виден, часть брони и временная неуязвимость
  // Прилёт: точки маршрута в координатах мира (см. ARRIVAL). Без урона; ввод игрока — сразу его управление
  fly(points) {
    this.autopilot = { points, i: 0 };
  }

  revive(hpFraction, invulnTime) {
    this.hp = Math.ceil(this.maxHp * hpFraction);
    this.reserve = LAST_STAND.zones.map((z) => z.pool);
    this.invuln = invulnTime;
    this.crashing = false; // после «карусели» — снова в воздухе
    this.spin = 0;
    this.look.setScale(1);
    this.rotor.setScale(1);
    this.shadow.setScale(0.9);
    this.body.enable = true;
    this.body.setVelocity(0, 0);
    this.look.setVisible(true).setAlpha(1);
    this.rotor.setVisible(true);
    this.shadow.setVisible(true);
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  // Скорость с учётом поломок: заглохший двигатель — еле ползёт
  get maxSpeed() {
    return this.stats.maxSpeed * (this.scene.breakdowns?.engineMul ?? 1);
  }

  get alive() {
    return this.hp > 0;
  }

  // Урон с неуязвимостью после попадания, чтобы толпа не сжигала HP за кадр
  // cause — кто ударил (для замеров причины смерти)
  takeDamage(amount, cause) {
    if (this.invuln > 0 || this.autopilot || !this.alive) return;
    this.hp = Math.max(0, this.hp - this.shownDamage(amount));
    this.invuln = PLAYER.invulnTime;
    this.scene.events.emit('player-hurt', amount);
    const shake = cause === 'infantry' ? FX.infectedShake : FX.hitShake;
    this.scene.cameras.main.shake(shake.duration, shake.intensity);
    sfx.play('hit');
    if (!this.alive) this.scene.events.emit('player-died', cause);
  }

  // Сколько урона дойдёт до полоски брони (см. LAST_STAND). Каждая зона — свой отрезок полоски: от
  // своего порога до порога следующей (25% → 3%, 3% → 0). В отрезке на полоску идёт доля
  // отрезок/(отрезок + запас), остальное забирает скрытый запас, пока он не кончится. Выше порогов —
  // честный урон. Висит на месте дольше stillFor — тоже честный
  shownDamage(amount) {
    if (this.stillT >= LAST_STAND.stillFor) return amount;
    const max = this.maxHp;
    let hp = this.hp;
    let left = amount;
    LAST_STAND.zones.forEach((z, i) => {
      const line = z.at * max;
      const floor = (LAST_STAND.zones[i + 1]?.at ?? 0) * max;
      // Выше отрезка — без скидки
      if (hp > line) {
        const d = Math.min(left, hp - line);
        hp -= d;
        left -= d;
      }
      if (left <= 0 || hp <= floor) return;
      if (this.reserve[i] > 0) {
        const band = line - floor;
        const share = band / (band + z.pool * max);
        // Сколько «сырого» урона уйдёт в этот отрезок: до нижнего порога или пока не кончится запас
        const raw = Math.min(left, (hp - floor) / share, (this.reserve[i] * max) / (1 - share));
        hp -= raw * share;
        this.reserve[i] -= (raw * (1 - share)) / max;
        left -= raw;
      }
      // Запас кончился посреди отрезка — дальше по нему честно
      const d = Math.min(left, Math.max(0, hp - floor));
      hp -= d;
      left -= d;
    });
    hp -= left;
    return this.hp - Math.max(0, hp);
  }

  readKeyboard() {
    const k = this.keys;
    const x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    return { x, y };
  }

  update(dt) {
    const s = this.sprite;
    if (this.crashing) {
      this.updateCrash(dt);
      return;
    }
    const desired = this.desired.set(0, 0);
    const key = this.readKeyboard();
    // Игрок взялся за управление — автопилот прилёта отдаёт его сразу
    if (this.autopilot && (key.x || key.y || this.stick || this.target)) this.autopilot = null;

    if (this.autopilot) {
      const ap = this.autopilot;
      const pt = ap.points[ap.i];
      const dx = pt.x - s.x;
      const dy = pt.y - s.y;
      const dist = Math.hypot(dx, dy);
      const last = ap.i === ap.points.length - 1;
      if (dist < (last ? PLAYER.stopRadius * 4 : ARRIVAL.reach)) {
        ap.i++;
        if (ap.i >= ap.points.length) this.autopilot = null;
      } else {
        const fast = this.maxSpeed * ARRIVAL.speedMul;
        const speed = last ? fast * Math.min(1, dist / ARRIVAL.brake) : fast;
        desired.set(dx / dist, dy / dist).scale(speed);
      }
    } else if (key.x || key.y) {
      desired.set(key.x, key.y).normalize().scale(this.maxSpeed);
    } else if (this.stick) {
      const dx = this.stick.x - this.stick.ax;
      const dy = this.stick.y - this.stick.ay;
      const len = Math.hypot(dx, dy);
      if (len > CONTROLS.deadZone) {
        const speed = this.maxSpeed * Math.min(1, len / CONTROLS.stickRadius);
        desired.set(dx / len, dy / len).scale(speed);
      }
    } else if (this.target) {
      const world = this.scene.cameras.main.getWorldPoint(this.target.x, this.target.y);
      const dx = world.x - s.x;
      const dy = world.y - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist > PLAYER.stopRadius) {
        const speed = this.maxSpeed * Math.min(1, dist / PLAYER.arriveRadius);
        desired.set(dx / dist, dy / dist).scale(speed);
      }
    }

    // Инерция: скорость плавно догоняет желаемую
    const k = 1 - Math.exp(-this.stats.accel * dt);
    const v = this.body.velocity;
    this.body.setVelocity(v.x + (desired.x - v.x) * k, v.y + (desired.y - v.y) * k);

    // Нос — в сторону движения
    const speed = this.body.velocity.length();
    // Висит на месте — копится; полетел — сброс (см. LAST_STAND)
    this.stillT = speed < LAST_STAND.stillSpeed ? this.stillT + dt : 0;
    if (speed > 20) {
      const aim = Math.atan2(this.body.velocity.y, this.body.velocity.x);
      s.rotation = Phaser.Math.Angle.RotateTo(s.rotation, aim, this.stats.turnSpeed * dt);
    }

    // Мигание во время неуязвимости
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.look.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 20) % 2 ? 0.35 : 1);
    }

    this.shadow.setPosition(s.x + 18, s.y + 26).setRotation(s.rotation);
    this.updateTilt(dt);
    // «Карусель»: сколько накрутили за последние секунды в одну сторону (со знаком —
    // рысканье носа влево-вправо взаимно гасится, считаются только круги)
    this.spin = (this.spin ?? 0) * Math.exp(-dt / SPIN.tau) + Phaser.Math.Angle.Wrap(s.rotation - (this.lastRot ?? s.rotation));
    this.lastRot = s.rotation;
    if (Math.abs(this.spin) > SPIN.limit && this.alive) this.scene.events.emit('spin-crash');
    this.rotor.rotation += PLAYER.rotorSpeed * dt;
  }

  // Падение после «карусели»: управление не слушается, вертолёт крутит и опускает к тени
  // «Карусель»: сел, постоял, взлетел. На земле неуязвим — это шутка, а не смерть
  crash() {
    this.crashing = true;
    this.crashPhase = 'land';
    this.crashT = 0;
    this.invuln = 99;
  }

  takeOff() {
    this.crashPhase = 'up';
    this.crashT = 0;
  }

  updateCrash(dt) {
    const s = this.sprite;
    this.crashT += dt;
    // k: 0 — в воздухе, 1 — на земле. Садится 1.2 с, взлетает 1 с
    const up = this.crashPhase === 'up';
    const k = up ? Math.max(0, 1 - this.crashT / SPIN.takeOff) : Math.min(1, this.crashT / 1.2);
    this.body.setVelocity(this.body.velocity.x * 0.9, this.body.velocity.y * 0.9);
    if (!up) s.rotation += (1 - k) * 9 * dt;
    if (up && k === 0) {
      // Снова в воздухе: управление вернулось, короткая неуязвимость, счётчик кругов с нуля
      this.crashing = false;
      this.spin = 0;
      this.lastRot = s.rotation;
      this.invuln = SPIN.invulnAfter;
      this.look.setScale(1);
      this.rotor.setScale(1);
      this.shadow.setScale(0.9);
      return;
    }
    this.look.setPosition(s.x + 18 * k, s.y + 26 * k).setRotation(s.rotation).setScale(1 - 0.15 * k).setAlpha(1);
    this.shadow.setPosition(s.x + 18, s.y + 26).setRotation(s.rotation).setScale(0.9 + 0.1 * k);
    this.rotor.setPosition(this.look.x, this.look.y).setScale(1 - 0.15 * k);
    this.rotor.rotation += PLAYER.rotorSpeed * (1 - k) * dt;
  }

  // Наклоны: ускорение вдоль носа — тангаж, поворот и боковое ускорение — крен, на месте — покачивание
  updateTilt(dt) {
    const T = PLAYER.tilt;
    const s = this.sprite;
    const tl = this.tilt;
    const v = this.body.velocity;
    tl.t += dt;
    if (dt > 0) {
      const ax = (v.x - tl.vx) / dt;
      const ay = (v.y - tl.vy) / dt;
      const fx = Math.cos(s.rotation);
      const fy = Math.sin(s.rotation);
      const along = ax * fx + ay * fy;     // > 0 — разгон, < 0 — торможение
      const side = -ax * fy + ay * fx;     // вбок
      const turn = Phaser.Math.Angle.Wrap(s.rotation - tl.rot) / dt;
      // На месте воздух покачивает; в полёте покачивание стихает
      const calm = Math.max(0, 1 - v.length() / 60);
      const pitchT = Phaser.Math.Clamp(along / T.accelRef, -1, 1) + calm * T.idlePitch * Math.sin(tl.t * 1.3 + 1);
      const rollT = Phaser.Math.Clamp(turn / T.turnRef + side / T.accelRef, -1, 1) + calm * T.idleRoll * Math.sin(tl.t * 1.9);
      const k = 1 - Math.exp(-T.follow * dt);
      tl.pitch += (pitchT - tl.pitch) * k;
      tl.roll += (rollT - tl.roll) * k;
      tl.calm = calm;
    }
    tl.vx = v.x;
    tl.vy = v.y;
    tl.rot = s.rotation;

    const fx = Math.cos(s.rotation);
    const fy = Math.sin(s.rotation);
    const drift = (tl.calm ?? 0) * T.idleDrift;
    const x = s.x + Math.sin(tl.t * 0.9) * drift;
    const y = s.y + Math.cos(tl.t * 1.2) * drift;
    // Спрайт смотрит вправо: scaleX — вдоль носа (тангаж), scaleY — поперёк (крен)
    this.look
      .setPosition(x, y)
      .setRotation(s.rotation + tl.roll * T.rollYaw)
      .setScale(1 - Math.abs(tl.pitch) * T.pitchSquash, 1 - Math.abs(tl.roll) * T.rollSquash);
    // Диск винта наклоняется вместе с корпусом: смещён вперёд при разгоне, вбок при крене
    const shift = T.rotorShift;
    this.rotor.setPosition(x + fx * tl.pitch * shift - fy * tl.roll * shift, y + fy * tl.pitch * shift + fx * tl.roll * shift);
    this.updateBoosters(x, y, fx, fy);
  }

  // Ускорители по бортам: гондолы — в такт корпусу; пламя назад, длиннее на полном ходу, дрожит
  updateBoosters(x, y, fx, fy) {
    const on = this.stats.maxSpeed / PLAYER.maxSpeed >= HUD_GAUGES.boostAt && this.alive && !this.crashing;
    if (this.pods.visible !== on) {
      this.pods.setVisible(on);
      for (const f of this.flames) f.setVisible(on);
    }
    if (!on) return;
    this.pods.setPosition(x, y).setRotation(this.look.rotation).setScale(this.look.scaleX, this.look.scaleY);
    const v = Math.min(1, this.body.velocity.length() / this.maxSpeed);
    const flick = 0.85 + Math.random() * 0.3;
    this.flames.forEach((f, i) => {
      const side = i ? 1 : -1;
      // Сопла — у задней кромки гондол: 14 px назад от центра, 17 px вбок
      f.setPosition(x - fx * 14 - fy * 17 * side, y - fy * 14 + fx * 17 * side)
        .setRotation(this.look.rotation)
        .setScale((0.4 + v * 0.9) * flick, 0.8 + v * 0.3)
        .setAlpha(0.5 + v * 0.5);
    });
  }
}
