import * as Phaser from 'phaser';
import { WORLD, SPAWN, POOLS } from '../config.js';
import { DEPTH } from '../depth.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Projectile } from '../entities/Projectile.js';
import { MachineGun } from '../entities/MachineGun.js';
import { WaveSpawner } from '../systems/WaveSpawner.js';
import { platform } from '../platform/platform.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.drawGround();

    this.player = new Player(this, WORLD.width / 2, WORLD.height / 2);

    this.enemies = this.physics.add.group({
      classType: Enemy,
      maxSize: SPAWN.maxEnemies,
      runChildUpdate: true,
    });
    this.bullets = this.physics.add.group({
      classType: Projectile,
      maxSize: POOLS.bullets,
      runChildUpdate: true,
    });

    this.gun = new MachineGun(this, this.player, this.bullets, this.enemies);
    this.spawner = new WaveSpawner(this, this.enemies, this.player);

    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
      if (!bullet.active || !enemy.active) return;
      bullet.kill();
      enemy.hit(bullet.damage);
    });
    this.physics.add.overlap(this.player.sprite, this.enemies, (_, enemy) => {
      this.player.takeDamage(enemy.damage);
    });

    this.kills = 0;
    this.events.on('enemy-killed', () => this.kills++);
    // Временно, до экрана итогов (шаг 5): смерть = перезапуск забега
    this.events.once('player-died', () => this.time.delayedCall(600, () => this.scene.restart()));

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);

    // Временный отладочный текст, пока нет UIScene (шаг 5)
    this.debugText = this.add
      .text(10, 10, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(DEPTH.debug);

    platform.gameplayStart();
    // scene.events переживает restart — снимаем свои подписки
    this.events.once('shutdown', () => {
      this.events.off('enemy-killed');
      this.events.off('player-died');
      platform.gameplayStop();
    });
  }

  // Сетка, чтобы было видно движение. Позже заменим на нормальную землю.
  drawGround() {
    const g = this.add.graphics().setDepth(DEPTH.ground);
    g.fillStyle(WORLD.bgColor);
    g.fillRect(0, 0, WORLD.width, WORLD.height);
    g.lineStyle(2, WORLD.gridColor);
    for (let x = 0; x <= WORLD.width; x += WORLD.gridStep) g.lineBetween(x, 0, x, WORLD.height);
    for (let y = 0; y <= WORLD.height; y += WORLD.gridStep) g.lineBetween(0, y, WORLD.width, y);
  }

  update(time, delta) {
    if (!this.player.alive) return;
    const dt = delta / 1000;
    this.player.update(dt);
    this.gun.update(dt);
    this.spawner.update(dt);

    this.debugText.setText(
      `HP ${this.player.hp}/${this.player.maxHp}  убито ${this.kills}  ` +
        `врагов ${this.enemies.countActive()}  FPS ${Math.round(this.game.loop.actualFps)}`
    );
  }
}
