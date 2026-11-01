import * as Phaser from 'phaser';
import { WORLD, SPAWN, POOLS, XP, RUN, VIEW, CITY, FX, ADS, EXTRACT, LEVELUP, DEPOT, RUINS, SPIN, ENEMIES, RAIL } from '../config.js';
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
import { Hints } from '../systems/Hints.js';
import { Culler } from '../systems/Culler.js';
import { Train } from '../systems/Train.js';
import { River } from '../systems/River.js';
import { layout, setLevel, lt, isBuilt } from '../levels.js';
import { makeFarmTextures } from '../art/farm.js';
import { makeQuarryTextures } from '../art/quarry.js';
import { makeArmyTextures } from '../art/army.js';
import { Pickups } from '../systems/Pickups.js';
import { Convoy } from '../systems/Convoy.js';
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
    // Уровень кампании — из карты уровней (registry), по умолчанию первый: город
    this.levelDef = setLevel(this.registry.get('level') ?? 1);
    makeFarmTextures(this); // один раз за игру: есть — пропускает
    makeQuarryTextures(this);
    makeArmyTextures(this);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.culler = new Culler(this); // до города: декорации регистрируются при создании
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
    this.pickups = new Pickups(this, this.player); // аптечки и военные ящики с врагов
    this.convoy = layout.convoy ? new Convoy(this) : null; // колонна эвакуации — только где она есть
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
    // Кристаллы и враги за кадром тоже не рисуем (их сотни по карте)
    this.culler.addGroup(this.gems);
    this.culler.addGroup(this.enemies);
    this.depots = new Depots(this, this.player);
    this.spawnWatchtowers();
    this.depots.addMonument();
    this.depots.addExplosives();
    this.tracks = new Tracks(this);
    this.breakdowns = new Breakdowns(this, this.player);
    this.ordnance = new Ordnance(this, this.player);
    this.lab = new Lab(this);
    this.hints = new Hints(this);
    this.train = this.railX ? new Train(this, this.railX) : null;
    this.rerolls = LEVELUP.rerolls;
    applyMeta(this); // «Ангар»: броня, калибр, двигатель, магнит, перекруты
    this.physics.add.collider(this.player.sprite, this.air.towers);
    // Дома — стены для наземных врагов; «Объект» проламывает, вертолёт и снаряды летят поверху
    // Танки и «Объект» идут сквозь дома и ломают их (Tracks), остальные обходят по улицам
    this.physics.add.collider(this.enemies, this.nav.makeWalls(), null, (enemy) => enemy.type !== 'boss' && enemy.cfg.behavior !== 'tank');
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
    this.spinCrashes = 0;
    this.bossKilled = false;
    this.bossKilledAt = null;
    this.picks = []; // выбранные улучшения по порядку — для замеров
    this.firstLevelUpAt = null;

    this.events.on('enemy-hit', (enemy, damage, quiet) => !quiet && this.fx.damageNumber(enemy.x, enemy.y, damage, damage >= 40));
    this.events.on('enemy-killed', (enemy) => {
      this.kills++;
      this.fx.enemyDeath(enemy);
      if (enemy.cfg.behavior !== 'chase') sfx.play('explosion');
      if (enemy === this.boss) {
        this.onBossKilled(enemy);
        return;
      }
      const gem = this.gems.get();
      if (gem) gem.drop(enemy.x, enemy.y, enemy.cfg.xp, this.player);
      this.pickups.onKill(enemy);
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
      this.events.emit('radio', lt('cher_boss'), 'cheryomukha', true);
    });
    this.events.on('xp-collected', (value) => {
      sfx.play('pickup');
      this.addXp(value);
    });
    this.events.on('explosion', (x, y, r) => {
      this.explosionFx(x, y, r);
      sfx.play('explosion');
    });
    this.events.on('wave-changed', (n) => this.banner(lt(`wave_${n}`)));
    this.events.on('gas-blast', (x, y, cfg, type) => this.gasBlast(x, y, cfg, type));
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
    this.trainIntro();
    this.scale.on('resize', this.fitZoom, this);

    this.scene.launch('UIScene');
    this.input.keyboard.on('keydown-ESC', () => this.openPause());
    this.input.keyboard.on('keydown-P', () => this.openPause());

    platform.gameplayStart();
    // scene.events переживает restart — снимаем свои подписки
    this.events.once('shutdown', () => {
      for (const e of ['radio', 'gas-blast', 'enemy-hit', 'enemy-killed', 'xp-collected', 'explosion', 'wave-changed', 'boss-spawned', 'boss-phase2', 'alert', 'player-hurt', 'resume', 'player-died', 'spin-crash']) this.events.off(e);
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

  // Начало уровня: камера к эвакуационному поезду — трогается (город) или идёт мимо (деревня) — и назад
  trainIntro() {
    if (!this.train) return;
    const cam = this.cameras.main;
    const R = RAIL;
    cam.stopFollow();
    cam.pan(this.train.x, this.train.y, R.introPan * 1000, 'Sine.easeInOut');
    // Рация (UIScene) ещё не запущена — реплика чуть позже
    this.time.delayedCall(400, () => this.events.emit('radio', lt('vova_train'), 'vova'));
    // Черёмуха просит беречь эшелон: там едет «её дорогой» (кто он — выяснится позже, docs/story.md)
    this.time.delayedCall(500, () => this.events.emit('radio', lt('cher_train'), 'cheryomukha'));
    this.time.delayedCall((R.introPan + R.introHold) * 1000, () => {
      if (this.ended) return;
      cam.pan(this.player.sprite.x, this.player.sprite.y, R.introBack * 1000, 'Sine.easeInOut', true, (_, k) => {
        if (k === 1) cam.startFollow(this.player.sprite, true, 0.12, 0.12);
      });
    });
  }

  // Лопнула раздутая скотина: газовое облако бьёт врагов вокруг (стадо рвётся цепочкой) и вертолёт,
  // если он в облаке
  gasBlast(x, y, cfg, type) {
    this.explosionFx(x, y, cfg.blast * 0.7);
    sfx.play('explosion');
    const r2 = cfg.blast * cfg.blast;
    for (const e of this.enemies.getChildren()) {
      if (e.active && e.type !== 'boss' && (e.x - x) ** 2 + (e.y - y) ** 2 <= r2) e.hit(cfg.blastHit, true);
    }
    const p = this.player.sprite;
    if ((p.x - x) ** 2 + (p.y - y) ** 2 <= r2) this.player.takeDamage(cfg.blastDamage, type);
  }

  // Вертолёт сбит: взрыв, затем — предложение воскреснуть (если можно) или итоги
  // Пасхалка: докрутили — сели. «Вань, и зачем?» — «Да прост...» — взрыв
  spinCrash() {
    if (this.player.crashing || this.dying || this.ended) return;
    this.player.crash();
    this.events.emit('radio', t('vova_why'), 'vova', true);
    this.time.delayedCall(1300, () => this.events.emit('radio', t('ivan_just'), 'ivan', true));
    // Раньше тут был взрыв и конец забега — это ломало игру ради шутки. Теперь Иван заводит, и летим дальше
    this.time.delayedCall(SPIN.talk * 1000, () => {
      if (this.ended || this.dying) return;
      this.events.emit('radio', t('ivan_restart'), 'ivan', true);
      this.player.takeOff();
      this.spinCrashes = (this.spinCrashes ?? 0) + 1;
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
    meta.runs = (meta.runs ?? 0) + 1;
    // Ушёл из района до удара — открывается следующая станция на дороге к столице
    const n = this.levelDef.n;
    if (win && n + 1 > (meta.levelReached ?? 1)) {
      meta.levelReached = n + 1;
      if (isBuilt(n + 1)) stats.unlocked = n + 1; // о недостроенном не объявляем — модерация не любит «скоро»
    }
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
      levelN: this.levelDef.n, // уровень кампании (level — уровень вертолёта в забеге)
      money: this.depots.money,
      parts: this.depots.parts,
      ruined: this.buildings.list.filter((b) => b.state === 'ruined').length,
      // Взятое оружие с уровнями — для итогов: «Ракеты 3 · Бомбы 2»
      weapons: ['missile', 'bombs', 'napalm', 'rockets', 'gas']
        .filter((id) => this.upgrades.level(id) > 0)
        .map((id) => `${t(`upg_${id}`)} ${this.upgrades.level(id)}`),
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
      milcrates: this.pickups.crates,
      convoy: this.convoy?.result() ?? null,
      badges: this.pickups.badges,
      flareKills: this.flares.kills,
      wiresCut: this.air.cut,
      depots: this.depots.broken,
      spinCrashes: this.spinCrashes ?? 0,
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
    // Надпись волны под барабанами наезжала на «Уровень N» — короткая, просто убираем
    for (const b of [...this.banners]) {
      this.tweens.killTweensOf(b);
      this.removeBanner(b);
    }
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
      // Пропуск: без улучшения, рубли — в добычу забега (уйдут в кошелёк «Ангара» в итогах)
      onSkip: (money) => {
        this.depots.money += money;
        this.fx.popup(this.player.x, this.player.y, `+${money} ₽`, '#f2c94c');
        this.pendingLevels--;
        this.scene.resume();
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
    this.river = new River(this); // до кварталов: дома в воде не строятся
    this.districts = {}; // район → кварталы { x, y } (левый верхний угол)
    for (let y = 0; y < WORLD.height; y += s) {
      for (let x = 0; x < WORLD.width; x += s) {
        // Район — по плану города; жилые — случайного вида и поворота, остальные стоят как задуманы
        const d = layout.DISTRICTS[y / s]?.[x / s] ?? 'R';
        (this.districts[d] ??= []).push({ x, y });
        const v = layout.DISTRICT_VARIANT[d];
        const variant = Array.isArray(v) ? Phaser.Utils.Array.GetRandom(v) : v ?? Phaser.Math.Between(0, CITY.residential - 1);
        const quarter = layout.TILE_FACING[`${x / s},${y / s}`] ?? (layout.randomQuarter.includes(d) ? Phaser.Math.Between(0, 3) : 0);
        this.culler.add(this.add.image(x + s / 2, y + s / 2, `city${variant}`).setAngle(quarter * 90).setDepth(DEPTH.ground));
        this.nav.addTile(variant, quarter, x, y);
        if ((layout.plazaVariants ?? [CITY.plazaVariant]).includes(variant)) this.plazas.push({ x: x + s / 2, y: y + s / 2 });
      }
    }
    this.drawAvenues();
    this.river.draw();
    this.river.blockNav(this.nav);
    this.railX = layout.rail?.x ?? null;
    if (this.railX) this.drawRailway();
    this.buildings = new Buildings(this);
    this.roofs = this.buildings.build(this.nav.rects);
    this.drawZoneFence();
    if (layout.features.factoryFence) this.drawFactoryFence();
    if (layout.features.cityFence) this.drawCityFence();
  }

  // Проспекты: широкая проезжая часть с бульваром посередине — кусками по кварталу (их прячет Culler).
  // КПП с шлагбаумом на западном въезде, проходная у завода в конце главного проспекта
  drawAvenues() {
    const s = CITY.tile;
    // Проспекты (или трасса) и дороги уровня; tex — проспект с бульваром, асфальт трассы, грунтовка.
    // Грунтовки — ниже трассы: на пересечении асфальт поверх
    for (const a of [...layout.ROADS, ...layout.AVENUES]) {
      const tex = a.tex ?? 'avenue';
      const depth = DEPTH.ground + (tex === 'dirt' ? 0.25 : 0.3);
      for (let p = a.from; p < a.to; p += s) {
        const img = a.dir === 'h' ? this.add.image(p + s / 2, a.at, tex) : this.add.image(a.at, p + s / 2, tex).setAngle(90);
        this.culler.add(img.setDepth(depth));
      }
    }
    // Перекрёстки проспектов — поверх, без бульвара
    const AVENUES = layout.AVENUES.filter((a) => (a.tex ?? 'avenue') === 'avenue');
    for (const a of AVENUES) {
      for (const b of AVENUES) {
        if (a.dir !== 'h' || b.dir !== 'v' || b.at < a.from || b.at > a.to || a.at < b.from || a.at > b.to) continue;
        this.culler.add(this.add.image(b.at, a.at, 'avenueCross').setDepth(DEPTH.ground + 0.35));
      }
    }
    // КПП на западном въезде в город (на востоке проспект упирается в ворота завода — их ставит drawFactoryFence)
    const main = layout.AVENUES[0];
    if (layout.features.checkpoint) this.culler.add(this.add.image(main.from + 30, main.at, 'checkpoint').setDepth(DEPTH.ground + 2.5));
  }

  // База городской милиции (район Z): бетонный забор по периметру, КПП со шлагбаумом на юг
  zoneBox() {
    const zs = this.districts.Z ?? [];
    if (!zs.length) return null;
    const s = CITY.tile;
    const x0 = Math.min(...zs.map((z) => z.x)) + 40;
    const y0 = Math.min(...zs.map((z) => z.y)) + 40;
    const x1 = Math.max(...zs.map((z) => z.x)) + s - 40;
    const y1 = Math.max(...zs.map((z) => z.y)) + s - 40;
    return { x0, y0, x1, y1 };
  }

  drawZoneFence() {
    const b = this.zoneBox();
    if (!b) return;
    const g = this.add.graphics().setDepth(DEPTH.ground + 2.4);
    const gate = (b.x0 + b.x1) / 2;
    const gw = 44; // полуширина проезда
    this.concreteFence(g, [
      [b.x0, b.y0, b.x1, b.y0],
      [b.x1, b.y0, b.x1, b.y1],
      [b.x0, b.y1, gate - gw, b.y1],
      [gate + gw, b.y1, b.x1, b.y1],
      [b.x0, b.y0, b.x0, b.y1],
    ]);
    // КПП: шлагбаум поперёк проезда и будка дежурного
    this.culler.add(this.add.image(gate, b.y1 + 2, 'policeGate').setDepth(DEPTH.ground + 2.5));
  }

  // Завод (районы F, L, E) — за бетонным забором по периметру: на проспекте металлические ворота,
  // на севере и юге — железнодорожные ворота, через которые идёт ветка
  factoryBox() {
    const tiles = layout.features.factoryFence ? ['F', 'L', 'E'].flatMap((d) => this.districts[d] ?? []) : [];
    if (!tiles.length) return null;
    const s = CITY.tile;
    return {
      x0: Math.min(...tiles.map((t) => t.x)) + 40,
      y0: Math.min(...tiles.map((t) => t.y)) + 30,
      x1: Math.max(...tiles.map((t) => t.x)) + s - 30,
      y1: Math.max(...tiles.map((t) => t.y)) + s - 30,
    };
  }

  // Бетонный забор (плиты с «ромбиками»): отрезки [x1, y1, x2, y2], только горизонтальные или вертикальные
  concreteFence(g, segs) {
    for (const [x1, y1, x2, y2] of segs) {
      if (y1 === y2) {
        // Вдоль — видно лицевую сторону плит: светлый бетон, «ромбики», стыки плит
        const H = 12;
        g.fillStyle(0x000000, 0.25).fillRect(x1 + 4, y1 + 3, x2 - x1, H);
        g.fillStyle(0xb4b2a8).fillRect(x1, y1 - H, x2 - x1, H);
        g.fillStyle(0xcfcdc4).fillRect(x1, y1 - H, x2 - x1, 2);
        // «Ромбики» — тёмные залитые ромбы во всю высоту плиты: тонкие контуры по 8 px на телефоне
        // сливались в штриховку
        g.fillStyle(0x86847a);
        for (let x = x1 + 2; x < x2 - 8; x += 10) {
          g.fillTriangle(x, y1 - H / 2, x + 4, y1 - H + 2, x + 8, y1 - H / 2);
          g.fillTriangle(x, y1 - H / 2, x + 4, y1 - 2, x + 8, y1 - H / 2);
        }
        g.fillStyle(0x7a786e);
        for (let x = x1; x <= x2; x += 40) g.fillRect(x - 1, y1 - H, 3, H); // стыки плит
      } else {
        // Поперёк взгляда — плиты видно сверху: светлая полоса и стыки
        g.fillStyle(0x000000, 0.25).fillRect(x1 + 3, y1, 4, y2 - y1);
        g.fillStyle(0xb4b2a8).fillRect(x1 - 2, y1, 5, y2 - y1);
        g.fillStyle(0x7a786e);
        for (let y = y1; y <= y2; y += 40) g.fillRect(x1 - 3, y, 7, 3);
      }
    }
  }

  // Город закрытый: бетонный забор по всему периметру, ворота на КПП (запад) и проёмы под ветку
  drawCityFence() {
    const g = this.add.graphics().setDepth(DEPTH.ground + 2.4);
    const m = 14;
    const W = WORLD.width - m;
    const H = WORLD.height - m;
    const gateY = layout.AVENUES[0].at;
    const rail = this.railX;
    this.concreteFence(g, [
      [m, m, rail - 34, m], [rail + 34, m, W, m],
      [m, H, rail - 34, H], [rail + 34, H, W, H],
      [m, m, m, gateY - 62], [m, gateY + 62, m, H],
      [W, m, W, H],
    ]);
    this.culler.add(this.add.image(m, gateY, 'factoryGate').setDepth(DEPTH.ground + 2.5));
  }

  drawFactoryFence() {
    const b = this.factoryBox();
    if (!b) return;
    const g = this.add.graphics().setDepth(DEPTH.ground + 2.4);
    const rail = this.railX;
    const gateY = layout.AVENUES[0].at;
    // Отрезки забора с проёмами: ворота на проспекте (запад) и под ветку (север, юг)
    const segs = [
      [b.x0, b.y0, rail - 34, b.y0], [rail + 34, b.y0, b.x1, b.y0],
      [b.x0, b.y1, rail - 34, b.y1], [rail + 34, b.y1, b.x1, b.y1],
      [b.x0, b.y0, b.x0, gateY - 62], [b.x0, gateY + 62, b.x0, b.y1],
      [b.x1, b.y0, b.x1, b.y1],
    ];
    this.concreteFence(g, segs);
    // Металлические ворота с красной звездой — в конце главного проспекта
    this.culler.add(this.add.image(b.x0, gateY, 'factoryGate').setDepth(DEPTH.ground + 2.5));
    // Ж/д ворота на севере и юге
    for (const y of [b.y0, b.y1]) this.culler.add(this.add.image(rail, y - 6, 'railGate').setDepth(DEPTH.ground + 2.5));
  }

  // Железная дорога через завод с севера на юг: щебёночная насыпь, шпалы, рельсы; поезд ходит туда-сюда
  drawRailway() {
    const s = CITY.tile;
    for (let y = 0; y < WORLD.height; y += s) {
      this.culler.add(this.add.image(this.railX, y + s / 2, 'railway').setDepth(DEPTH.ground + 0.4));
    }
  }

  // Часовые на вышках по углам «зоны» и посередине длинных сторон
  spawnWatchtowers() {
    // Стационарные враги уровня (экскаваторы на краю карьера)
    for (const s of layout.staticSpawns ?? []) {
      const e = this.enemies.get();
      if (e) e.spawn(s.type, ENEMIES[s.type], s.x, s.y, this.player);
    }
    const b = this.zoneBox();
    if (!b) return;
    const mx = (b.x0 + b.x1) / 2;
    const my = (b.y0 + b.y1) / 2;
    for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1], [mx, b.y0], [b.x0, my]]) {
      const e = this.enemies.get();
      if (!e) break;
      e.spawn('watchtower', ENEMIES.watchtower, x, y, this.player);
    }
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
    this.pickups.update(dt);
    this.convoy?.update(dt, this.spawner.elapsed);
    this.depots.update(dt);
    this.tracks.update(dt);
    this.breakdowns.update(dt);
    this.ordnance.update(dt);
    this.lab.update(dt);
    this.hints.update(dt);
    this.train?.update(dt);
    this.culler.update();
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
    sfx.play('nuke');
    this.player.hide();
    this.endRun(false, 'nuke', EXTRACT.flash / 1000);
  }
}
