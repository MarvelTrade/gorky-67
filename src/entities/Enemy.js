import * as Phaser from 'phaser';
import { SPAWN, EVENTS, RUINS, ORDNANCE, LAB } from '../config.js';
import { RIVER } from '../cityLayout.js';
import { layout } from '../levels.js';
import { DEPTH } from '../depth.js';

const FLASH_TIME = 0.06;

// Враг из пула. Тип задаётся конфигом из ENEMIES при spawn(),
// поведение — полем cfg.behavior.
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'infantry');
    this.setDepth(DEPTH.enemies);
  }

  spawn(type, cfg, x, y, target, hpMul = 1, dmgMul = 1) {
    this.type = type;
    this.cfg = cfg;
    this.target = target;
    // «Объект» — над домами и штриховкой обстрела: огромный шар, который их сминает, должен быть виден.
    // setDepth пересортировывает сцену — только если глубина правда меняется
    const depth = type === 'boss' ? DEPTH.buildings + 0.7 : DEPTH.enemies;
    if (this.depth !== depth) this.setDepth(depth);
    this.hp = cfg.hp * hpMul;
    this.maxHp = this.hp;
    // «Объект»: интервалы залпов — свои, во второй фазе они короче
    this.phase2 = false;
    this.volleyEvery = cfg.volleyInterval;
    this.ringEvery = cfg.burstInterval;
    this.damage = cfg.damage * dmgMul; // урон касанием; снаряды берут shellDamage из cfg
    this.speed = cfg.speed + Phaser.Math.FloatBetween(-cfg.speedJitter, cfg.speedJitter);
    this.flash = 0;
    this.horde = null; // RunEvents помечает заражённых из орды, чтобы потом убрать остатки
    this.shotsLeft = 0; // пули текущей очереди вездехода
    this.shotTimer = 0;
    this.hopT = 0; // прыжок заражённого: оставшееся время
    this.hopCd = 0;
    this.unloadT = cfg.unloadEvery ?? 0; // самосвал: до следующей выгрузки горняков
    this.charge = 0; // разбег быка: оставшееся время
    this.chargeCd = 0;
    this.endHop();
    // Таймер текущей фазы: рывок/пауза у джипа, перезарядка у зенитки.
    // Случайный старт, чтобы враги одной пачки не действовали синхронно.
    this.phase = 'pause';
    this.timer = Phaser.Math.FloatBetween(0, cfg.pauseTime ?? cfg.fireInterval ?? cfg.volleyInterval ?? 0);
    this.burstTimer = cfg.burstInterval ?? 0;

    this.setTexture(type === 'boss' ? layout.bossTexture ?? 'boss' : type);
    // Сразу лицом к игроку — иначе танк первые секунды ползёт мимо
    this.rotation = Math.atan2(target.y - y, target.x - x);
    this.enableBody(true, x, y, true, true);
    this.body.setCircle(cfg.radius, this.width / 2 - cfg.radius, this.height / 2 - cfg.radius);
    // Вышку толпа не сдвигает; слот пула потом может стать пехотой — сбрасываем
    this.body.setImmovable(!!cfg.static);
    if (cfg.noRotate) this.rotation = 0;
    this.body.setVelocity(0, 0);
    this.clearTint();
  }

  // quiet — урон тиками (огонь, реагент): без цифры, иначе экран в «13»
  hit(damage, quiet = false) {
    if (!this.active) return false;
    this.hp -= damage;
    this.flash = FLASH_TIME;
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.events.emit('enemy-hit', this, damage, quiet);
    if (this.type === 'boss' && !this.phase2 && this.hp > 0 && this.hp <= this.maxHp * EVENTS.bossSwarm.atHpFrac) {
      this.phase2 = true;
      this.volleyEvery /= EVENTS.bossSwarm.fireRateMul;
      this.ringEvery /= EVENTS.bossSwarm.fireRateMul;
      this.scene.events.emit('boss-phase2', this);
    }
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.endHop();
    this.disableBody(true, true);
    this.scene.events.emit('enemy-killed', this);
    // Раздутая скотина лопается газовым облаком — и когда подстрелили, и когда дошла до вертолёта
    if (this.cfg.blast) this.scene.events.emit('gas-blast', this.x, this.y, this.cfg, this.type);
  }

  // Тихо вернуться в пул — без опыта и счётчика убийств
  despawn() {
    this.endHop();
    this.disableBody(true, true);
  }

  update(time, delta) {
    if (!this.active) return;
    const dt = delta / 1000;

    if (this.flash > 0) {
      this.flash -= dt;
      if (this.flash <= 0) this.clearTint();
    }

    const t = this.target;
    const dx = t.x - this.x;
    const dy = t.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > SPAWN.despawnDist && this.cfg.behavior !== 'boss' && !this.cfg.static) {
      this.despawn();
      return;
    }

    switch (this.cfg.behavior) {
      case 'chase': {
        const a = this.pathAngle(dx, dy);
        // В облаке «Нейтрализатора» — медленнее
        if (this.slowT > 0) this.slowT -= dt;
        const v = this.speed * (this.slowT > 0 ? ORDNANCE.slowMul : 1);
        this.body.setVelocity(Math.cos(a) * v, Math.sin(a) * v);
        this.rotation = a;
        if (this.cfg.hopRange) this.updateHop(dt, dist);
        break;
      }
      case 'dash':
        this.updateDash(dt, dx, dy, dist);
        break;
      case 'turret':
        this.updateTurret(dt, dx, dy, dist);
        break;
      case 'tank':
        this.updateTank(dt, dx, dy, dist);
        break;
      case 'haul':
        this.updateHaul(dt, dx, dy);
        if (!this.active) return; // довёз и уехал
        break;
      case 'boss':
        this.updateBoss(dt, dx, dy, dist);
        break;
      case 'tractor':
        this.updateTractor(dt, dx, dy, dist);
        break;
    }
    // Самосвал и автобус смены высаживают заражённых
    if (this.cfg.unload) this.updateUnload(dt, dist);
    switch (this.cfg.behavior) {
      case 'bloat':
        this.updateBloat(dt, dx, dy, dist);
        if (!this.active) return; // лопнула
        break;
    }
    // У самого вертолёта пехота и джипы идут к нему напрямую, мимо карты путей, — если он над рекой,
    // лезли в воду. Шаг в воду — стоп у набережной (танк вброд и «Объект» — свои правила)
    const b = this.cfg.behavior;
    const river = this.scene.river;
    if (river && (b === 'chase' || b === 'dash' || b === 'tractor' || b === 'bloat')) {
      const v = this.body.velocity;
      if ((v.x || v.y) && river.contains(this.x + v.x * 0.12, this.y + v.y * 0.12, 4)) this.body.setVelocity(0, 0);
    }
  }

  // Джип: разгоняется по прямой к тому месту, где игрок был в начале рывка, потом тормозит
  updateDash(dt, dx, dy, dist) {
    const cfg = this.cfg;
    this.timer -= dt;
    if (this.phase === 'pause') {
      const k = Math.exp(-cfg.pauseDrag * dt);
      this.body.setVelocity(this.body.velocity.x * k, this.body.velocity.y * k);
      // Пока стоит — доворачивает на игрока
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, Math.atan2(dy, dx), 6 * dt);
      // Остановился — очередь по игроку
      if (this.shotsLeft > 0) {
        this.shotTimer -= dt;
        if (this.shotTimer <= 0) {
          if (dist <= cfg.range) this.fireShell(Math.atan2(dy, dx));
          this.shotsLeft--;
          this.shotTimer = cfg.burstInterval;
        }
      }
      if (this.timer <= 0) {
        this.phase = 'dash';
        this.timer = cfg.dashTime;
        // Рывок — по улице в обход домов, если игрок за домом
        this.rotation = this.pathAngle(dx, dy);
        this.body.setVelocity(Math.cos(this.rotation) * cfg.dashSpeed, Math.sin(this.rotation) * cfg.dashSpeed);
      }
    } else if (this.timer <= 0) {
      this.phase = 'pause';
      this.timer = cfg.pauseTime;
      this.shotsLeft = cfg.burstCount ?? 0;
      this.shotTimer = cfg.burstDelay ?? 0;
    }
  }

  // Прыжок заражённого к вертолёту — только визуал. Рисуется отдельной картинкой из пула:
  // если масштабировать сам спрайт, Arcade растянет и круг столкновения.
  updateHop(dt, dist) {
    const cfg = this.cfg;
    this.hopCd -= dt;
    if (this.hopT <= 0) {
      if (this.hopCd > 0 || dist > cfg.hopRange) return;
      this.hopImg = this.scene.fx.takeHop();
      if (!this.hopImg) return;
      this.hopT = cfg.hopTime;
      this.hopCd = cfg.hopCooldown;
      this.setAlpha(0);
    }
    const before = this.hopT;
    this.hopT -= dt;
    if (this.hopT <= 0) {
      this.endHop();
      return;
    }
    // В высшей точке прыжка заражённый достаёт вертолёт над крышей: иначе над домом он недосягаем
    // (замер: 30 с над башней 100×100 без урона, вокруг 65 заражённых). На улице урон — только касанием.
    const mid = cfg.hopTime / 2;
    const t = this.target;
    if (before > mid && this.hopT <= mid && dist <= cfg.hopRange && this.scene.nav?.isBlocked(t.x, t.y)) {
      t.takeDamage(this.damage, this.type);
    }
    const k = Math.sin(Math.PI * (1 - this.hopT / cfg.hopTime));
    this.hopImg.setPosition(this.x, this.y).setRotation(this.rotation).setScale(1 + (cfg.hopScale - 1) * k);
  }

  endHop() {
    this.hopT = 0;
    if (this.hopImg) {
      this.hopImg.setVisible(false);
      this.hopImg = null;
    }
    this.setAlpha(1);
  }

  // Зенитка: стоит, поворачивает ствол и стреляет медленным снарядом, если игрок в радиусе
  updateTurret(dt, dx, dy, dist) {
    const cfg = this.cfg;
    const aim = Math.atan2(dy, dx);
    if (!cfg.noRotate) this.rotation = aim;
    this.timer -= dt;
    if (this.timer > 0 || dist > cfg.range) return;
    // Экскаватор стоит с начала, не из спавнера — разговор о нём при первом броске
    if (cfg.intro) this.scene.spawner.introduce(cfg.intro);
    this.fireShell(aim);
    this.timer = cfg.fireInterval;
  }

  // Танк: ползёт носом вперёд, доворачивает медленно; стреляет, только когда почти навёлся
  updateTank(dt, dx, dy, dist) {
    const cfg = this.cfg;
    const aim = Math.atan2(dy, dx);
    // Едет прямо на игрока, сквозь дома (ломает их, внутри — медленнее), стреляет, когда корпус смотрит на игрока
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, aim, cfg.turnRate * dt);
    const v = this.speed * (this.inHouse ? RUINS.tankSlow : 1) * (this.inWater ? RIVER.tankSlow : 1);
    this.body.setVelocity(Math.cos(this.rotation) * v, Math.sin(this.rotation) * v);

    // БТР: начатая очередь дострачивается, куда смотрит корпус
    if (this.shotsLeft > 0) {
      this.shotTimer -= dt;
      if (this.shotTimer <= 0) {
        this.fireShell(this.rotation);
        this.shotsLeft--;
        this.shotTimer = cfg.burstInterval;
      }
    }
    this.timer -= dt;
    const aimed = Math.abs(Phaser.Math.Angle.Wrap(aim - this.rotation)) < cfg.aimTolerance;
    if (this.timer > 0 || dist > cfg.range || !aimed) return;
    this.timer = cfg.fireInterval;
    if (cfg.burstCount) {
      this.shotsLeft = cfg.burstCount;
      this.shotTimer = 0;
      return;
    }
    this.fireShell(this.rotation);
  }

  // Босс — шар-вирус: выходит из лаборатории, катится к игроку (далеко — быстро), сминая дома,
  // часто бьёт прицельным веером и иногда — кольцом во все стороны
  updateBoss(dt, dx, dy, dist) {
    const cfg = this.cfg;
    if (this.emerging > 0) {
      this.emerging -= dt;
      this.body.setVelocity(0, 0);
      this.rotation += dt * 2; // ворочается в провале
      return;
    }
    const speed = dist > LAB.farDist ? LAB.farSpeed : this.speed;
    this.body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    // Катится: поворот картинки — путь / радиус. Прицел — отдельно, картинка крутится
    this.rotation += (speed / cfg.radius) * dt;
    const aim = Math.atan2(dy, dx);

    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.volleyEvery;
      const half = (cfg.volleyCount - 1) / 2;
      for (let i = 0; i < cfg.volleyCount; i++) this.fireShell(aim + (i - half) * cfg.volleySpread);
    }

    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      this.burstTimer = this.ringEvery;
      // Кольцо каждый раз чуть повёрнуто, чтобы безопасные щели не стояли на месте
      const offset = Phaser.Math.FloatBetween(0, Math.PI * 2);
      for (let i = 0; i < cfg.burstCount; i++) this.fireShell(offset + (i / cfg.burstCount) * Math.PI * 2);
    }
  }

  // Самосвал: раз в unloadEvery с высыпает из кузова заражённых позади себя (только недалеко от вертолёта)
  updateUnload(dt, dist) {
    const cfg = this.cfg;
    this.unloadT -= dt;
    if (this.unloadT > 0) return;
    this.unloadT = cfg.unloadEvery;
    if (dist > 700) return;
    const sp = this.scene.spawner;
    for (let i = 0; i < cfg.unload; i++) {
      const e = this.scene.enemies.get();
      if (!e) break;
      const a = this.rotation + Math.PI + (i - (cfg.unload - 1) / 2) * 0.6;
      sp.place(e, cfg.unloadType, this.x + Math.cos(a) * (cfg.radius + 14), this.y + Math.sin(a) * (cfg.radius + 14));
    }
  }

  // Тягач с прицепом: едет не на вертолёт, а к яме «Объекта»; довёз туши — «Объект» выйдет раньше
  updateHaul(dt, dx, dy) {
    const cfg = this.cfg;
    const pit = this.scene.lab?.pos;
    if (!pit) {
      this.updateTractor(dt, dx, dy, Infinity);
      return;
    }
    const px = pit.x - this.x;
    const py = pit.y - this.y;
    if (px * px + py * py <= cfg.haulRange * cfg.haulRange) {
      this.scene.spawner.hauled(cfg.haulBoss);
      this.despawn();
      return;
    }
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, Math.atan2(py, px), cfg.turnRate * dt);
    this.body.setVelocity(Math.cos(this.rotation) * this.speed, Math.sin(this.rotation) * this.speed);
  }

  // Трактор: едет к вертолёту по дорогам, разворачивается не сразу; фермер из кабины бьёт дробью веером
  // туда, где вертолёт сейчас (ружьё поворачивается, трактор — нет)
  updateTractor(dt, dx, dy, dist) {
    const cfg = this.cfg;
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, this.pathAngle(dx, dy), cfg.turnRate * dt);
    this.body.setVelocity(Math.cos(this.rotation) * this.speed, Math.sin(this.rotation) * this.speed);
    this.timer -= dt;
    if (this.timer > 0 || dist > cfg.range) return;
    this.timer = cfg.fireInterval;
    const aim = Math.atan2(dy, dx);
    const half = (cfg.pellets - 1) / 2;
    for (let i = 0; i < cfg.pellets; i++) this.fireShell(aim + ((i - half) / Math.max(1, half)) * (cfg.pelletSpread / 2));
  }

  // Раздутая скотина бредёт к вертолёту; бык рядом разбегается по прямой. Вплотную — лопается
  updateBloat(dt, dx, dy, dist) {
    const cfg = this.cfg;
    if (dist <= cfg.blastRange) {
      this.die();
      return;
    }
    if (this.charge > 0) {
      this.charge -= dt;
      return; // летит по прямой с тем направлением, что взял в начале
    }
    this.chargeCd -= dt;
    if (cfg.chargeRange && dist <= cfg.chargeRange && this.chargeCd <= 0) {
      this.charge = cfg.chargeTime;
      this.chargeCd = cfg.chargeCooldown;
      this.rotation = Math.atan2(dy, dx);
      this.body.setVelocity(Math.cos(this.rotation) * cfg.chargeSpeed, Math.sin(this.rotation) * cfg.chargeSpeed);
      return;
    }
    const a = this.pathAngle(dx, dy);
    if (this.slowT > 0) this.slowT -= dt;
    const v = this.speed * (this.slowT > 0 ? ORDNANCE.slowMul : 1);
    this.body.setVelocity(Math.cos(a) * v, Math.sin(a) * v);
    this.rotation = a;
  }

  // Направление к игроку в обход домов (CityNav); рядом с игроком или без карты — напрямую
  pathAngle(dx, dy) {
    return this.scene.nav?.heading(this.x, this.y) ?? Math.atan2(dy, dx);
  }

  fireShell(angle) {
    const cfg = this.cfg;
    const shell = this.scene.shells.get();
    if (!shell) return;
    shell.fire(this.x, this.y, angle, cfg.shellSpeed, cfg.shellDamage, cfg.shellLife, cfg.shellTexture);
    shell.source = this.type;
  }
}
