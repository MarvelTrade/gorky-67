import * as Phaser from 'phaser';
import { WORLD, SPAWN, POOLS, XP, RUN, VIEW, CITY, FX, ADS, EXTRACT, LEVELUP, DEPOT, RUINS, SPIN } from '../config.js';
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
import { Buildings } from '../systems/Buildings.js';
import { Supply } from '../systems/Supply.js';
import { Flares } from '../systems/Flares.js';
import { RunEvents } from '../systems/RunEvents.js';
import { CityNav } from '../systems/CityNav.js';
import { AirObstacles } from '../systems/AirObstacles.js';
import { Wrecks } from '../systems/Wrecks.js';
import { Artillery } from '../systems/Artillery.js';
import { Extraction } from '../systems/Extraction.js';
import { Depots } from '../systems/Depots.js';
import { Tracks } from '../systems/Tracks.js';
import { Breakdowns } from '../systems/Breakdowns.js';
import { Ordnance } from '../systems/Ordnance.js';
import { Lab } from '../systems/Lab.js';
import { meta, applyMeta, addHeliXp } from '../meta.js';
import { settings } from '../settings.js';
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
    this.nav = new CityNav(this);
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
    this.supply = new Supply(this, this.player);
    this.flares = new Flares(this, this.player, this.shells);
    this.runEvents = new RunEvents(this);

    // Высокие сооружения и провода — до стен: башни тоже станут стенами для наземных врагов
    this.air = new AirObstacles(this, this.player);
    this.air.build();
    this.wrecks = new Wrecks(this);
    this.wrecks.build();
    for (const f of this.buildings.fires) this.wrecks.addFire(f.x, f.y, f.big); // горящие дома
    this.artillery = new Artillery(this, this.player);
    this.extraction = new Extraction(this);
    this.depots = new Depots(this, this.player);
    this.tracks = new Tracks(this);
    this.breakdowns = new Breakdowns(this, this.player);
    this.ordnance = new Ordnance(this, this.player);
    this.lab = new Lab(this);
    this.rerolls = LEVELUP.rerolls;
    applyMeta(this); // «Ангар»: броня, калибр, двигатель, магнит, перекруты
    this.physics.add.collider(this.player.sprite, this.air.towers);
    // Дома — стены для наземных врагов; «Объект» проламывает, вертолёт и снаряды летят поверху
    // Танки и «Объект» идут сквозь дома и ломают их (Tracks), остальные обходят по улицам
    this.physics.add.collider(this.enemies, this.nav.makeWalls(), null, (enemy) => enemy.type !== 'boss' && enemy.type !== 'tank');
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
      // Техника не таранит (damage 0) — вертолёт в воздухе; цепляются только заражённые и «Объект»
      if (enemy.damage > 0) this.player.takeDamage(enemy.damage, enemy.type);
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
    this.halting = false; // пауза запрошена, но Phaser применит её только в следующем кадре
    this.dying = false; // вертолёт сбит, ждём решения «Воскреснуть»
    this.revived = false; // воскрешение — один раз за забег
    this.banners = []; // надписи на экране — следующая встаёт ниже
    this.boss = null;
    this.blasts = []; // пул вспышек взрывов — новый на каждый забег (сцена переиспользуется)
    this.bossKilled = false;
    this.bossKilledAt = null;
    this.picks = []; // выбранные улучшения по порядку — для замеров
    this.firstLevelUpAt = null;

    this.events.on('enemy-hit', (enemy, damage, quiet) => !quiet && this.fx.damageNumber(enemy.x, enemy.y, damage, damage >= 40));
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
    this.events.on('boss-phase2', (boss) => {
      this.cameras.main.flash(300, 255, 230, 120);
      this.fx.shake(FX.bossPhaseShake);
      sfx.play('explosion');
      this.runEvents.bossPhase2(boss);
    });
    this.events.on('boss-spawned', (boss) => {
      this.boss = boss;
      this.banner(t('bossIncoming'), '#ff6a5a');
      this.cameras.main.shake(400, 0.008);
      this.events.emit('radio', t('cher_boss'), 'cheryomukha', true);
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
      this.halting = false;
      this.player.resetInput();
      platform.gameplayStart();
      // Набралось сразу несколько уровней — следующий выбор после короткой передышки
      if (this.pendingLevels > 0) this.time.delayedCall(150, () => this.openLevelUp());
    });
    this.events.on('player-died', (cause) => this.onPlayerDied(cause));
    this.events.on('spin-crash', () => this.spinCrash());

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    // Тряску экрана можно выключить в настройках — проверяем при каждом вызове, чтобы работало и из паузы
    const cam = this.cameras.main;
    const shake = cam.shake.bind(cam);
    cam.shake = (...args) => (settings.shake ? shake(...args) : cam);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.fitZoom();
    this.scale.on('resize', this.fitZoom, this);

    this.scene.launch('UIScene');
    this.input.keyboard.on('keydown-ESC', () => this.openPause());
    this.input.keyboard.on('keydown-P', () => this.openPause());

    platform.gameplayStart();
    // scene.events переживает restart — снимаем свои подписки
    this.events.once('shutdown', () => {
      for (const e of ['radio', 'enemy-hit', 'enemy-killed', 'xp-collected', 'explosion', 'wave-changed', 'boss-spawned', 'boss-phase2', 'alert', 'player-hurt', 'resume', 'player-died', 'spin-crash']) this.events.off(e);
      this.scale.off('resize', this.fitZoom, this);
      this.scene.stop('UIScene');
      sfx.duck(false);
      platform.gameplayStop();
    });
  }

  fitZoom() {
    const { width, height } = this.scale;
    this.cameras.main.setZoom(Math.min(1, Math.min(width, height) / VIEW.minShortSide));
  }

  // Вертолёт сбит: взрыв, затем — предложение воскреснуть (если можно) или итоги
  // Пасхалка: докрутили — сели. «Вань, и зачем?» — «Да прост...» — взрыв
  spinCrash() {
    if (this.player.crashing || this.dying || this.ended) return;
    this.player.crash();
    this.events.emit('radio', t('vova_why'), 'vova', true);
    this.time.delayedCall(1300, () => this.events.emit('radio', t('ivan_just'), 'ivan', true));
    this.time.delayedCall(SPIN.talk * 1000, () => {
      this.player.hp = 0;
      this.events.emit('player-died', 'spin');
    });
  }

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
    this.explosionFx(p.x, p.y, 70, false);
    this.fx.debris.explode(24, p.x, p.y);
    this.fx.shake(FX.deathShake);
    sfx.play('explosion');

    this.time.delayedCall(RUN.endDelay * 1000, () => {
      if (this.revived || !platform.canShowRewarded()) {
        this.endRun(false, cause, 0);
        return;
      }
      this.halt();
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

  // Конец забега: смерть, удар или ушёл из района
  endRun(win, cause = null, delay = RUN.endDelay) {
    if (this.ended) return;
    this.ended = true;
    this.scene.stop('LevelUpScene');
    this.scene.resume();
    platform.gameplayStop();
    // После конца забега вертолёт больше не обновляется — без этого он ещё секунду
    // летел по инерции, а винт и тень оставались на месте
    this.player.body.setVelocity(0, 0);
    this.player.body.moves = false;
    const stats = this.runStats(win);
    // Добыча со складов — в кошелёк, и при гибели тоже (как в DRG: вынесенное остаётся)
    meta.money += this.depots.money;
    meta.parts += this.depots.parts;
    // Опыт вертолёта — за любой исход; уровень открывает окраски и снаряжение
    Object.assign(stats, addHeliXp(stats));
    recordRun(this.runRecord(stats, { cause, ending: stats.ending }));
    // Причина — на экран итогов: игрок должен понять, что его убило (Ходент: иначе смерть кажется нечестной)
    this.time.delayedCall(delay * 1000, () => this.scene.start('GameOverScene', { ...stats, cause }));
  }

  runStats(win) {
    return {
      win,
      time: Math.min(this.spawner.elapsed, RUN.duration),
      kills: this.kills,
      level: this.level,
      bossSeen: !!this.boss,
      bossKilled: this.bossKilled,
      // Концовка: ушёл из района — с «Объектом» или без; не успел до удара; погиб
      ending: !win ? (this.nuked ? 'nuke' : 'lost') : this.bossKilled ? 'convoy' : 'late',
      money: this.depots.money,
      parts: this.depots.parts,
    };
  }

  // Всё, что пишется в замеры о забеге
  runRecord(stats, extra) {
    return {
      ...stats,
      ...extra,
      picks: this.picks,
      rerollsUsed: LEVELUP.rerolls - this.rerolls,
      firstLevelUpAt: this.firstLevelUpAt,
      revived: this.revived,
      crates: { ...this.supply.picked },
      flareKills: this.flares.kills,
      wiresCut: this.air.cut,
      depots: this.depots.broken,
      breakdowns: { ...this.breakdowns.stats },
      shelled: this.artillery.hits,
      hordes: this.runEvents.summary(),
      bossKilledAt: this.bossKilledAt,
      bossSwarm: this.runEvents.bossSwarm ?? null,
      spawn: { ...this.spawner.stats },
    };
  }

  // Phaser ставит сцену на паузу только в начале следующего кадра. Если в одном кадре
  // подобрать несколько кристаллов, без этого флага выбор улучшения открывался дважды
  halt() {
    this.halting = true;
    this.scene.pause();
  }

  isHalted() {
    return this.halting || this.scene.isPaused();
  }

  // Пауза: кнопка в HUD, Esc или P. Во время выбора улучшения, смерти и итогов — нельзя
  openPause() {
    if (this.ended || this.dying || this.isHalted() || !this.player.alive) return;
    platform.gameplayStop();
    this.halt();
    // Надписи волн не должны просвечивать под экраном паузы (требование 1.10.3)
    const banners = [...this.banners];
    banners.forEach((b) => b.setVisible(false));
    this.scene.launch('PauseScene', {
      // Что уже взято за забег — чтобы на паузе спокойно посмотреть сборку
      taken: Object.entries(this.upgrades.levels).map(([id, lv]) => `${t(`upg_${id}`)} ${lv}`),
      time: this.spawner.elapsed,
      kills: this.kills,
      onResume: () => {
        banners.forEach((b) => b.active && b.setVisible(true));
        this.scene.resume();
      },
      onQuit: () => this.quit(),
    });
  }

  // Вышел в меню посреди забега — в замерах это отдельный исход, не смерть
  quit() {
    if (!this.ended) {
      this.ended = true;
      recordRun(this.runRecord(this.runStats(false), { quit: true, cause: null }));
    }
    this.scene.start('MenuScene');
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
    if (this.pendingLevels > 0 && !this.isHalted()) this.openLevelUp();
  }

  openLevelUp() {
    if (this.pendingLevels <= 0 || this.ended || this.isHalted()) return;
    const choices = this.upgrades.roll(3);
    if (choices.length === 0) {
      this.pendingLevels = 0;
      return;
    }
    sfx.play('levelUp');
    platform.gameplayStop(); // выбор улучшения — пауза в разметке геймплея
    this.halt();
    this.scene.launch('LevelUpScene', {
      level: this.level - this.pendingLevels + 1,
      choices,
      rerolls: this.rerolls,
      // Перекрут: те же правила, новые три; null — перекрутов не осталось
      onReroll: () => {
        if (this.rerolls <= 0) return null;
        this.rerolls--;
        return this.upgrades.roll(3);
      },
      onPick: (id) => {
        this.upgrades.apply(id);
        this.picks.push({ id, t: Math.round(this.spawner.elapsed) });
        this.pendingLevels--;
        this.scene.resume();
      },
    });
  }

  // Пыль от рухнувшего дома
  dust(x, y, r) {
    this.fx.debris?.explode(Math.round(r / 4), x, y);
    this.cameras.main.shake(180, 0.004);
  }

  // onGround — взрыв на земле ломает дома; вертолёт взрывается в воздухе — нет.
  // Вспышки — из пула: с ракетами взрывов по несколько в секунду, а каждый новый объект
  // пересортировывает всю сцену (на телефоне заметно по FPS)
  explosionFx(x, y, r, onGround = true) {
    if (onGround) this.buildings.damageAt(x, y, r, r * RUINS.blast);
    let c = this.blasts.find((b) => !b.visible);
    if (!c) {
      c = this.add.circle(0, 0, 10, 0xffa040, 0.6).setDepth(DEPTH.bullets);
      this.blasts.push(c);
    }
    c.setPosition(x, y).setRadius(r).setVisible(true).setAlpha(0.6);
    this.tweens.add({
      targets: c,
      scale: { from: 0.3, to: 1 },
      alpha: 0,
      duration: 250,
      onComplete: () => c.setVisible(false),
    });
  }

  // Серия взрывов по корпусу и победа
  onBossKilled(boss) {
    this.bossKilled = true;
    this.bossKilledAt = Math.round(this.spawner.elapsed);
    const { x, y } = boss;
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 120, () =>
        this.explosionFx(x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-40, 40), 50)
      );
    }
    this.depots.drop(x, y, 0, DEPOT.bossParts);
    this.extraction.start();
  }

  banner(message, color = '#ffe066') {
    const { width, height } = this.scale;
    // Новая надпись заменяет прежнюю: в 4:00 «Объект 67» и «ОБЪЕКТ» стояли столбиком
    for (const b of [...this.banners]) {
      this.tweens.killTweensOf(b);
      this.removeBanner(b);
    }
    const text = this.add
      // Не выше 200 px — там HUD, полоска босса и радио «Берёзы»
      .text(width / 2, Math.max(height * 0.3, 200), message, {
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

  // Город: кварталы случайного вида и поворота — каждый забег улицы немного другие.
  // Дома рисуются отдельно, в виде 3/4 (Buildings), по пятнам из CityNav; крыши — для ящиков снабжения.
  drawGround() {
    const s = CITY.tile;
    this.plazas = []; // центры площадей (квартал без домов) — туда в бою с «Объектом» бьёт артиллерия
    for (let y = 0; y < WORLD.height; y += s) {
      for (let x = 0; x < WORLD.width; x += s) {
        const variant = Phaser.Math.Between(0, CITY.variants - 1);
        const quarter = Phaser.Math.Between(0, 3);
        this.add
          .image(x + s / 2, y + s / 2, `city${variant}`)
          .setAngle(quarter * 90)
          .setDepth(DEPTH.ground);
        this.nav.addTile(variant, quarter, x, y);
        if (variant === CITY.plazaVariant) this.plazas.push({ x: x + s / 2, y: y + s / 2 });
      }
    }
    this.buildings = new Buildings(this);
    this.roofs = this.buildings.build(this.nav.rects);
  }

  update(time, delta) {
    if (this.ended || this.dying) return;
    const dt = delta / 1000;
    this.player.update(dt);
    this.air.update(dt);
    this.wrecks.update(dt);
    this.gun.update(dt);
    this.missiles.update(dt);
    this.flares.update(dt);
    this.supply.update(dt);
    this.depots.update(dt);
    this.tracks.update(dt);
    this.breakdowns.update(dt);
    this.ordnance.update(dt);
    this.lab.update(dt);
    this.runEvents.update(this.spawner.elapsed);
    this.artillery.update(dt, this.spawner.elapsed);
    this.nav.update(dt, this.player.x, this.player.y);
    this.spawner.update(dt);
    // Продержался или убил «Объект» — теперь уйти из района до удара
    if (this.spawner.elapsed >= RUN.duration) this.extraction.start();
    const exit = this.extraction.update(dt);
    if (exit === 'escaped') this.endRun(true);
    if (exit === 'nuked') this.nuke();
  }

  // Не успел: белая вспышка, и всё. Без «воскреснуть» — удар не переживают
  nuke() {
    this.nuked = true;
    this.cameras.main.flash(EXTRACT.flash, 255, 255, 240);
    this.fx.shake(FX.deathShake);
    sfx.play('explosion');
    this.player.hide();
    this.endRun(false, 'nuke', EXTRACT.flash / 1000);
  }
}
