import * as Phaser from 'phaser';
import { PLAYER } from '../config.js';
import { DEPTH } from '../depth.js';

// Вертолёт игрока. Управление:
//  - палец/мышь зажаты → летит к точке под пальцем; отпустил → зависает
//  - WASD/стрелки → летит в направлении, имеют приоритет над пальцем
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

    this.rotor = scene.add.image(x, y, 'rotor');
    this.rotor.setDepth(DEPTH.rotor);

    // Копия, чтобы улучшения меняли её, а не конфиг
    this.stats = { ...PLAYER };
    this.maxHp = PLAYER.maxHp;
    this.hp = this.maxHp;
    this.invuln = 0;

    this.target = null;
    this.desired = new Phaser.Math.Vector2();

    this.keys = scene.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');

    const input = scene.input;
    input.on('pointerdown', this.onPointer, this);
    input.on('pointermove', this.onPointer, this);
    input.on('pointerup', this.onPointerUp, this);
    input.on('pointerupoutside', this.onPointerUp, this);
    input.on('gameout', this.onPointerUp, this);
  }

  onPointer(pointer) {
    if (!pointer.isDown) return;
    // Точку храним в экранных координатах: держишь палец на месте —
    // вертолёт продолжает лететь, а камера едет за ним.
    this.target = { x: pointer.x, y: pointer.y };
  }

  onPointerUp() {
    if (!this.scene.input.activePointer.isDown) this.target = null;
  }

  // После паузы: палец/клавиши могли отпустить, пока сцена не слушала ввод
  resetInput() {
    this.target = null;
    this.scene.input.keyboard.resetKeys();
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
  takeDamage(amount) {
    if (this.invuln > 0 || !this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invuln = PLAYER.invulnTime;
    this.scene.cameras.main.shake(120, 0.006);
    if (!this.alive) this.scene.events.emit('player-died');
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
    const k = 1 - Math.exp(-PLAYER.accel * dt);
    const v = this.body.velocity;
    this.body.setVelocity(v.x + (desired.x - v.x) * k, v.y + (desired.y - v.y) * k);

    // Нос — в сторону движения
    const speed = this.body.velocity.length();
    if (speed > 20) {
      const aim = Math.atan2(this.body.velocity.y, this.body.velocity.x);
      s.rotation = Phaser.Math.Angle.RotateTo(s.rotation, aim, PLAYER.turnSpeed * dt);
    }

    // Мигание во время неуязвимости
    if (this.invuln > 0) {
      this.invuln -= dt;
      s.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 20) % 2 ? 0.35 : 1);
    }

    this.shadow.setPosition(s.x + 18, s.y + 26).setRotation(s.rotation);
    this.rotor.setPosition(s.x, s.y);
    this.rotor.rotation += PLAYER.rotorSpeed * dt;
  }
}
