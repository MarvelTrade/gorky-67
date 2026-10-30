import * as Phaser from 'phaser';
import { FX, PALETTE } from '../config.js';
import { DEPTH } from '../depth.js';

// Визуальные эффекты боя: взрывы частицами, всплывающие цифры урона, тряска.
// Эмиттеры создаются один раз — частицы внутри них переиспользуются.
export class Fx {
  constructor(scene) {
    this.scene = scene;

    // Облачко «Зари» от заражённых
    this.puff = scene.add
      .particles(0, 0, 'puff', {
        emitting: false,
        lifespan: { min: 350, max: 550 },
        speed: { min: 15, max: 70 },
        scale: { start: 0.8, end: 2.2 },
        alpha: { start: 0.75, end: 0 },
        tint: PALETTE.glow,
      })
      .setDepth(DEPTH.enemies + 1);

    // Обломки и искры техники
    this.debris = scene.add
      .particles(0, 0, 'spark', {
        emitting: false,
        lifespan: { min: 250, max: 500 },
        speed: { min: 80, max: 240 },
        scale: { start: 1.4, end: 0 },
        rotate: { min: 0, max: 360 },
        tint: [0xffa040, 0xffe080, 0x6a6a6a, PALETTE.army],
      })
      .setDepth(DEPTH.bullets);

    // Дым после техники
    this.smoke = scene.add
      .particles(0, 0, 'puff', {
        emitting: false,
        lifespan: { min: 600, max: 900 },
        speed: { min: 10, max: 40 },
        scale: { start: 1.2, end: 3 },
        alpha: { start: 0.55, end: 0 },
        tint: 0x3a3a3a,
      })
      .setDepth(DEPTH.enemies + 1);

    // Картинки для прыжков заражённых — фиксированный пул, без создания объектов в бою
    this.hops = [];
    for (let i = 0; i < FX.hopPool; i++) {
      this.hops.push(scene.add.image(0, 0, 'infantry').setDepth(DEPTH.enemies + 1).setVisible(false));
    }

    // Надпись над вертолётом при подборе ящика — одна, переиспользуется
    this.popupText = scene.add
      .text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.banner - 1)
      .setVisible(false);

    this.numbers = [];
    if (FX.damageNumbers) {
      for (let i = 0; i < FX.damageNumberPool; i++) {
        this.numbers.push(
          scene.add
            .text(0, 0, '', {
              fontFamily: 'sans-serif',
              fontSize: '14px',
              fontStyle: 'bold',
              color: '#ffffff',
              stroke: '#000000',
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.banner - 1)
            .setActive(false)
            .setVisible(false)
        );
      }
      this.nextNumber = 0;
    }
  }

  enemyDeath(enemy) {
    const { x, y } = enemy;
    switch (enemy.type) {
      case 'infantry':
        this.puff.explode(7, x, y);
        break;
      case 'jeep':
        this.puff.explode(4, x, y);
        this.debris.explode(12, x, y);
        this.smoke.explode(4, x, y);
        break;
      case 'aa':
        this.debris.explode(16, x, y);
        this.smoke.explode(6, x, y);
        break;
      case 'tank':
        this.debris.explode(26, x, y);
        this.smoke.explode(9, x, y);
        this.shake(FX.heavyShake);
        break;
      case 'boss':
        this.puff.explode(30, x, y);
        this.debris.explode(30, x, y);
        this.shake(FX.bossShake);
        break;
    }
  }

  // Цифра над врагом. Пул фиксированный: если все заняты — берём самую старую.
  damageNumber(x, y, amount, big = false) {
    if (!FX.damageNumbers) return;
    const n = this.numbers[this.nextNumber];
    this.nextNumber = (this.nextNumber + 1) % this.numbers.length;
    this.scene.tweens.killTweensOf(n);
    // Цвет — тинтом по белому тексту: setColor перерисовывал бы текст на каждое попадание
    n.setText(String(Math.round(amount)))
      .setPosition(x + Phaser.Math.Between(-6, 6), y - 10)
      .setTint(big ? 0xffd040 : 0xffffff)
      .setScale(big ? 1.3 : 1)
      .setAlpha(1)
      .setActive(true)
      .setVisible(true);
    this.scene.tweens.add({
      targets: n,
      y: n.y - 28,
      alpha: 0,
      duration: FX.damageNumberLife * 1000,
      ease: 'quad.out',
      onComplete: () => n.setActive(false).setVisible(false),
    });
  }

  // Свободная картинка для прыжка или null — тогда заражённый просто не прыгает
  takeHop() {
    const img = this.hops.find((h) => !h.visible);
    if (img) img.setVisible(true);
    return img ?? null;
  }

  popup(x, y, text, color) {
    const p = this.popupText;
    this.scene.tweens.killTweensOf(p);
    p.setText(text).setColor(color).setPosition(x, y - 40).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: p,
      y: y - 80,
      alpha: 0,
      delay: 500,
      duration: 700,
      onComplete: () => p.setVisible(false),
    });
  }

  shake({ duration, intensity }) {
    this.scene.cameras.main.shake(duration, intensity);
  }
}
