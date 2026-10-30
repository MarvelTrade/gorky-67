import * as Phaser from 'phaser';
import { BREAKDOWN } from '../config.js';
import { DEPTH } from '../depth.js';
import { t } from '../i18n/index.js';
import { sfx } from './Sfx.js';

// Поломки подбитого вертолёта. В кабине двое: Вова стреляет, Иван рулит и чинит.
// При попадании, когда брони мало, может начаться пожар (горит, теряет броню, пока Иван не потушит)
// или заглохнуть двигатель (вертолёт еле ползёт). Если рядом толпа — Иван чинит быстрее:
// поломка — это напряжение, а не смерть без шанса.
export class Breakdowns {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.fire = 0;     // с до конца пожара; 0 — не горит
    this.stall = 0;    // с до запуска двигателя
    this.cooldown = 0; // с до следующей возможной поломки
    this.stats = { fires: 0, stalls: 0 };
    this.flames = scene.add
      .particles(0, 0, 'puff', {
        emitting: false,
        lifespan: { min: 250, max: 450 },
        speedX: { min: -20, max: 20 },
        speedY: { min: -60, max: -20 },
        scale: { start: 1.2, end: 0.2 },
        alpha: { start: 0.95, end: 0 },
        tint: [0xffe08a, 0xffa040, 0xff5a1f],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.rotor + 0.5);
    this.smoke = scene.add
      .particles(0, 0, 'puff', {
        emitting: false,
        lifespan: { min: 700, max: 1100 },
        speedX: { min: -10, max: 10 },
        speedY: { min: -30, max: -10 },
        scale: { start: 1, end: 3 },
        alpha: { start: 0.45, end: 0 },
        tint: 0x2c2c2c,
      })
      .setDepth(DEPTH.rotor + 0.4);
    this.emitT = 0;
    scene.events.on('player-hurt', () => this.onHit());
  }

  get engineMul() {
    return this.stall > 0 ? BREAKDOWN.stallSpeed : 1;
  }

  onHit() {
    const p = this.player;
    const B = BREAKDOWN;
    if (!p.alive || this.cooldown > 0 || p.hp / p.maxHp > B.below) return;
    const r = Math.random();
    if (r < B.fireChance && this.fire <= 0) {
      this.fire = this.crowd() ? B.fireTimeCrowd : B.fireTime;
      this.stats.fires++;
      this.say('ivan_fire');
      sfx.play('fire');
    } else if (r < B.fireChance + B.stallChance && this.stall <= 0) {
      this.stall = this.crowd() ? B.stallTimeCrowd : B.stallTime;
      this.stats.stalls++;
      sfx.play('stall');
      this.say(this.crowd() ? 'ivan_stall_crowd' : 'ivan_stall');
    } else return;
    this.cooldown = B.cooldown;
  }

  // Толпа рядом — Иван торопится
  crowd() {
    const p = this.player;
    const r2 = BREAKDOWN.crowdRadius ** 2;
    let n = 0;
    for (const e of this.scene.enemies.getChildren()) {
      if (e.active && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < r2 && ++n >= BREAKDOWN.crowdCount) return true;
    }
    return false;
  }

  say(key) {
    this.scene.events.emit('radio', t(key), 'ivan', true);
  }

  update(dt) {
    const p = this.player;
    this.cooldown -= dt;
    if (!p.alive) {
      this.fire = 0;
      this.stall = 0;
      return;
    }
    if (this.fire > 0) {
      this.fire -= dt;
      // Огонь жжёт мимо неуязвимости, но не добивает: последний 1 HP — за врагами
      p.hp = Math.max(1, p.hp - BREAKDOWN.fireDps * dt);
      if (this.fire <= 0) this.say('ivan_fire_out');
    }
    if (this.stall > 0) {
      this.stall -= dt;
      if (this.stall <= 0) this.say('ivan_engine_ok');
    }
    // Пламя и дым — с корпуса; при заглохшем двигателе — только дым
    this.emitT -= dt;
    if ((this.fire > 0 || this.stall > 0) && this.emitT <= 0) {
      this.emitT = 0.05;
      const x = p.look.x - Math.cos(p.sprite.rotation) * 12;
      const y = p.look.y - Math.sin(p.sprite.rotation) * 12;
      if (this.fire > 0) this.flames.emitParticleAt(x, y, 2);
      this.smoke.emitParticleAt(x, y, 1);
    }
  }
}
