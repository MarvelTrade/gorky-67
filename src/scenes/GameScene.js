import * as Phaser from 'phaser';
import { WORLD, SPAWN, POOLS, XP, RUN, VIEW, CITY, FX, ADS } from '../config.js';
import { DEPTH } from '../depth.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Projectile, EnemyShell } from '../entities/Projectile.js';
import { Missile } from '../entities/Missile.js';
import { XPGem } from '../entities/XPGem.js';
import { MachineGun } from '../entities/MachineGun.js';
import { MissileLauncher } from '../entities/MissileLauncher.js';
import { WaveSpawner } from '../systems/WaveSpawner.js';
import { Upgrades } from '../systems/Upgrades.js';
import { Fx } from '../systems/Fx.js';
import { sfx } from '../systems/Sfx.js';
import { recordRun } from '../systems/Telemetry.js';
import { platform } from '../platform/platform.js';
import { t } from '../i18n/index.js';

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
    this.shells = this.physics.add.group({
      classType: EnemyShell,
      maxSize: POOLS.shells,
      runChildUpdate: true,
    });
    this.missileGroup = this.physics.add.group({
      classType: Missile,
      maxSize: POOLS.missiles,
      runChildUpdate: true,
    });
    this.gems = this.add.group({
      classType: XPGem,
      maxSize: POOLS.gems,
      runChildUpdate: true,
    });

    this.gun = new MachineGun(this, this.player, this.bullets, this.enemies);
    this.missiles = new MissileLauncher(this, this.player, this.missileGroup, this.enemies);
    this.spawner = new WaveSpawner(this, this.enemies, this.player);
    this.upgrades = new Upgrades(this);
    this.fx = new Fx(this);

    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
      if (!bullet.active || !enemy.active) return;
      if (bullet.only?.active && enemy !== bullet.only) return;
      bullet.kill();
      enemy.hit(bullet.damage);
    });
    this.physics.add.overlap(this.missileGroup, this.enemies, (missile, enemy) => {
      // Ракета, наведённая на «Объект», не взрывается о толпу по пути
      if (missile.target === this.boss && this.boss?.active && enemy !== this.boss) return;
      missile.explode();
    });
    // Причину урона запоминаем для замеров: «тип врага» или «тип:shell»
    this.physics.add.overlap(this.player.sprite, this.enemies, (_, enemy) => {
      this.player.takeDamage(enemy.damage, enemy.type);
    });
    this.physics.add.overlap(this.player.sprite, this.shells, (_, shell) => {
      if (!shell.active) return;
      shell.kill();
      this.player.takeDamage(shell.damage, `${shell.source}:shell`);
    });

    this.kills = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = XP.first;
    this.pendingLevels = 0;
    this.ended = false;
    this.dying = false; // вертолёт сбит, ждём решения «Воскреснуть»
    this.revived = false; // воскрешение — один раз за забег
    this.banners = []; // надписи на экране — следующая встаёт ниже
    this.boss = null;
    this.bossKilled = false;
    this.picks = []; // выбранные улучшения по порядку — для замеров
    this.firstLevelUpAt = null;

    this.events.on('enemy-hit', (enemy, damage) => this.fx.damageNumber(enemy.x, enemy.y, damage, damage >= 40));
    this.events.on('enemy-killed', (enemy) => {
      this.kills++;
      this.fx.enemyDeath(enemy);
      if (enemy.type !== 'infantry') sfx.play('explosion');
      if (enemy === this.boss) {
        this.onBossKilled(enemy);
        return;
      }
      const gem = this.gems.get();
      if (gem) gem.drop(enemy.x, enemy.y, enemy.cfg.xp, this.player);
    });
    this.events.on('boss-spawned', (boss) => {
      this.boss = boss;
      this.banner(t('bossIncoming'), '#ff6a5a');
      this.cameras.main.shake(400, 0.008);
    });
    this.events.on('xp-collected', (value) => {
      sfx.play('pickup');
      this.addXp(value);
    });
    this.events.on('explosion', (x, y, r) => {
      this.explosionFx(x, y, r);
      sfx.play('explosion');
    });
    this.events.on('wave-changed', (n) => this.banner(t(`wave_${n}`)));
    this.events.on('resume', () => {
      this.player.resetInput();
      platform.gameplayStart();
      // Набралось сразу несколько уровней — следующий выбор после короткой передышки
      if (this.pendingLevels > 0) this.time.delayedCall(150, () => this.openLevelUp());
    });
    this.events.on('player-died', (cause) => this.onPlayerDied(cause));

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.fitZoom();
    this.scale.on('resize', this.fitZoom, this);

    this.scene.launch('UIScene');

    platform.gameplayStart();
    // scene.events переживает restart — снимаем свои подписки
    this.events.once('shutdown', () => {
      for (const e of ['enemy-hit', 'enemy-killed', 'xp-collected', 'explosion', 'wave-changed', 'boss-spawned', 'resume', 'player-died']) this.events.off(e);
      this.scale.off('resize', this.fitZoom, this);
      this.scene.stop('UIScene');
      platform.gameplayStop();
    });
  }

  fitZoom() {
    const { width, height } = this.scale;
    this.cameras.main.setZoom(Math.min(1, Math.min(width, height) / VIEW.minShortSide));
  }

  // Вертолёт сбит: взрыв, затем — предложение воскреснуть (если можно) или итоги
  onPlayerDied(cause) {
    if (this.ended || this.dying) return;
    this.dying = true;
    // Уровень и смерть могли случиться в одном кадре — выбор улучшения уже не нужен
    this.scene.stop('LevelUpScene');
    this.scene.resume();
    platform.gameplayStop();
    // Надписи волн не должны просвечивать под экраном «Воскреснуть» (требование 1.10.3)
    for (const b of [...this.banners]) {
      this.tweens.killTweensOf(b);
      this.removeBanner(b);
    }
    const p = this.player;
    p.hide();
    this.explosionFx(p.x, p.y, 70);
    this.fx.debris.explode(24, p.x, p.y);
    this.fx.shake(FX.deathShake);
    sfx.play('explosion');

    this.time.delayedCall(RUN.endDelay * 1000, () => {
      if (this.revived || !platform.canShowRewarded()) {
        this.endRun(false, cause, 0);
        return;
      }
      this.scene.pause();
      this.scene.launch('ReviveScene', {
        onRevive: () => this.revive(),
        onGiveUp: () => this.endRun(false, cause, 0),
      });
    });
  }

  // После рекламы: половина брони, неуязвимость и чистое место вокруг
  revive() {
    this.revived = true;
    this.dying = false;
    const p = this.player;
    p.revive(ADS.reviveHp, ADS.reviveInvuln);
    const r2 = ADS.reviveClearRadius ** 2;
    for (const e of this.enemies.getChildren()) {
      if (e.active && e !== this.boss && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < r2) e.despawn();
    }
    for (const s of this.shells.getChildren()) if (s.active) s.kill();
    this.scene.resume();
  }

  // Конец забега: смерть или продержался RUN.duration секунд
  endRun(win, cause = null, delay = RUN.endDelay) {
    if (this.ended) return;
    this.ended = true;
    this.scene.stop('LevelUpScene');
    this.scene.resume();
    platform.gameplayStop();
    const stats = {
      win,
      time: Math.min(this.spawner.elapsed, RUN.duration),
      kills: this.kills,
      level: this.level,
      bossSeen: !!this.boss,
      bossKilled: this.bossKilled,
    };
    recordRun({ ...stats, cause, picks: this.picks, firstLevelUpAt: this.firstLevelUpAt, revived: this.revived });
    this.time.delayedCall(delay * 1000, () => this.scene.start('GameOverScene', stats));
  }

  addXp(value) {
    this.xp += value;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      if (this.firstLevelUpAt === null) this.firstLevelUpAt = Math.round(this.spawner.elapsed);
      this.xpNext = this.level === 2 ? XP.base : this.xpNext + XP.perLevel;
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0 && !this.scene.isPaused()) this.openLevelUp();
  }

  openLevelUp() {
    if (this.pendingLevels <= 0 || this.ended) return;
    const choices = this.upgrades.roll(3);
    if (choices.length === 0) {
      this.pendingLevels = 0;
      return;
    }
    sfx.play('levelUp');
    platform.gameplayStop(); // выбор улучшения — пауза в разметке геймплея
    this.scene.pause();
    this.scene.launch('LevelUpScene', {
      level: this.level - this.pendingLevels + 1,
      choices,
      onPick: (id) => {
        this.upgrades.apply(id);
        this.picks.push({ id, t: Math.round(this.spawner.elapsed) });
        this.pendingLevels--;
        this.scene.resume();
      },
    });
  }

  // Взрывы редкие (раз в пару секунд), поэтому без пула
  explosionFx(x, y, r) {
    const c = this.add.circle(x, y, r, 0xffa040, 0.6).setDepth(DEPTH.bullets);
    this.tweens.add({
      targets: c,
      scale: { from: 0.3, to: 1 },
      alpha: 0,
      duration: 250,
      onComplete: () => c.destroy(),
    });
  }

  // Серия взрывов по корпусу и победа
  onBossKilled(boss) {
    this.bossKilled = true;
    const { x, y } = boss;
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 120, () =>
        this.explosionFx(x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-40, 40), 50)
      );
    }
    this.endRun(true);
  }

  banner(message, color = '#ffe066') {
    const { width, height } = this.scale;
    const text = this.add
      // Не выше 200 px — там HUD, полоска босса и радио «Берёзы»
      .text(width / 2, Math.max(height * 0.3, 200) + this.banners.length * 50, message, {
        fontFamily: 'sans-serif',
        fontSize: '36px',
        color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.banner);
    this.banners.push(text);
    this.tweens.add({
      targets: text,
      alpha: { from: 1, to: 0 },
      delay: 1200,
      duration: 600,
      onComplete: () => this.removeBanner(text),
    });
  }

  removeBanner(text) {
    this.banners = this.banners.filter((b) => b !== text);
    text.destroy();
  }

  // Город: кварталы случайного вида и поворота — каждый забег улицы немного другие
  drawGround() {
    const s = CITY.tile;
    for (let y = 0; y < WORLD.height; y += s) {
      for (let x = 0; x < WORLD.width; x += s) {
        this.add
          .image(x + s / 2, y + s / 2, `city${Phaser.Math.Between(0, CITY.variants - 1)}`)
          .setAngle(Phaser.Math.Between(0, 3) * 90)
          .setDepth(DEPTH.ground);
      }
    }
  }

  update(time, delta) {
    if (this.ended || this.dying) return;
    const dt = delta / 1000;
    this.player.update(dt);
    this.gun.update(dt);
    this.missiles.update(dt);
    this.spawner.update(dt);
    if (this.spawner.elapsed >= RUN.duration) this.endRun(true);
  }
}
