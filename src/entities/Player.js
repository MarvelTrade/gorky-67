import * as Phaser from 'phaser';
import { PLAYER, CONTROLS, FX } from '../config.js';
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

    // Копия, чтобы улучшения меняли её, а не конфиг
    this.stats = { ...PLAYER };
    this.maxHp = PLAYER.maxHp;
    this.hp = this.maxHp;
    this.invuln = 0;

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
  revive(hpFraction, invulnTime) {
    this.hp = Math.ceil(this.maxHp * hpFraction);
    this.invuln = invulnTime;
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

  get alive() {
    return this.hp > 0;
  }

  // Урон с неуязвимостью после попадания, чтобы толпа не сжигала HP за кадр
  // cause — кто ударил (для замеров причины смерти)
  takeDamage(amount, cause) {
    if (this.invuln > 0 || !this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invuln = PLAYER.invulnTime;
    this.scene.events.emit('player-hurt', amount);
    const shake = cause === 'infantry' ? FX.infectedShake : FX.hitShake;
    this.scene.cameras.main.shake(shake.duration, shake.intensity);
    sfx.play('hit');
    if (!this.alive) this.scene.events.emit('player-died', cause);
  }

  readKeyboard() {
    const k = this.keys;
    const x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    return { x, y };
  }

  update(dt) {
    const s = this.sprite;
    const desired = this.desired.set(0, 0);
    const key = this.readKeyboard();

    if (key.x || key.y) {
      desired.set(key.x, key.y).normalize().scale(this.stats.maxSpeed);
    } else if (this.stick) {
      const dx = this.stick.x - this.stick.ax;
      const dy = this.stick.y - this.stick.ay;
      const len = Math.hypot(dx, dy);
      if (len > CONTROLS.deadZone) {
        const speed = this.stats.maxSpeed * Math.min(1, len / CONTROLS.stickRadius);
        desired.set(dx / len, dy / len).scale(speed);
      }
    } else if (this.target) {
      const world = this.scene.cameras.main.getWorldPoint(this.target.x, this.target.y);
      const dx = world.x - s.x;
      const dy = world.y - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist > PLAYER.stopRadius) {
        const speed = this.stats.maxSpeed * Math.min(1, dist / PLAYER.arriveRadius);
        desired.set(dx / dist, dy / dist).scale(speed);
      }
    }

    // Инерция: скорость плавно догоняет желаемую
    const k = 1 - Math.exp(-this.stats.accel * dt);
    const v = this.body.velocity;
    this.body.setVelocity(v.x + (desired.x - v.x) * k, v.y + (desired.y - v.y) * k);

    // Нос — в сторону движения
    const speed = this.body.velocity.length();
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
    this.rotor.rotation += PLAYER.rotorSpeed * dt;
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
  }
}
