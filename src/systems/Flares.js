import { UPGRADES } from '../config.js';
import { DEPTH } from '../depth.js';
import { sfx } from './Sfx.js';

// Тепловые ловушки (улучшение). Раз в cooldown секунд вертолёт отстреливает ловушки по бокам:
// они сбивают вражеские снаряды в радиусе — снаряды зениток, танков и пули вездеходов.
// Плевки «Объекта» не сбиваются. level = 0, пока улучшение не взято.
export class Flares {
  constructor(scene, player, shells) {
    this.scene = scene;
    this.player = player;
    this.shells = shells;
    this.level = 0;
    this.timer = 0;
    this.kills = 0;

    // Яркие оранжевые искры, падающие вниз
    this.sparks = scene.add
      .particles(0, 0, 'spark', {
        emitting: false,
        lifespan: { min: 500, max: 900 },
        speed: { min: 40, max: 150 },
        gravityY: 260,
        scale: { start: 1.8, end: 0 },
        tint: [0xffb030, 0xff7a1a, 0xffe080],
        blendMode: 'ADD',
      })
      .setDepth(DEPTH.enemyShells + 1);
    // Кольцо радиуса сбития — одно на весь забег
    this.ring = scene.add.circle(0, 0, 10).setStrokeStyle(3, 0xffb030, 0.9).setVisible(false).setDepth(DEPTH.enemyShells);
  }

  get radius() {
    return UPGRADES.flares.radius[this.level - 1];
  }

  update(dt) {
    if (this.level === 0) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = UPGRADES.flares.cooldown[this.level - 1];
    this.fire();
  }

  fire() {
    const s = this.player.sprite;
    for (const side of [-1, 1]) {
      const a = s.rotation + (side * Math.PI) / 2;
      this.sparks.explode(10, s.x + Math.cos(a) * 24, s.y + Math.sin(a) * 24);
    }

    const r = this.radius;
    for (const shell of this.shells.getChildren()) {
      if (!shell.active || shell.source === 'boss') continue;
      if ((shell.x - s.x) ** 2 + (shell.y - s.y) ** 2 > r * r) continue;
      this.sparks.explode(3, shell.x, shell.y);
      shell.kill();
      this.kills++;
    }

    this.scene.tweens.killTweensOf(this.ring);
    this.ring.setPosition(s.x, s.y).setRadius(r).setScale(0.3).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: this.ring,
      scale: 1,
      alpha: 0,
      duration: 350,
      onComplete: () => this.ring.setVisible(false),
    });
    sfx.play('flare');
  }
}
