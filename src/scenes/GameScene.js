import * as Phaser from 'phaser';
import { WORLD } from '../config.js';
import { Player } from '../entities/Player.js';
import { platform } from '../platform/platform.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.drawGround();

    this.player = new Player(this, WORLD.width / 2, WORLD.height / 2);

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);

    platform.gameplayStart();
    this.events.once('shutdown', () => platform.gameplayStop());
  }

  // Сетка, чтобы было видно движение. Позже заменим на нормальную землю.
  drawGround() {
    const g = this.add.graphics();
    g.fillStyle(WORLD.bgColor);
    g.fillRect(0, 0, WORLD.width, WORLD.height);
    g.lineStyle(2, WORLD.gridColor);
    for (let x = 0; x <= WORLD.width; x += WORLD.gridStep) g.lineBetween(x, 0, x, WORLD.height);
    for (let y = 0; y <= WORLD.height; y += WORLD.gridStep) g.lineBetween(0, y, WORLD.width, y);
  }

  update(time, delta) {
    this.player.update(delta / 1000);
  }
}
