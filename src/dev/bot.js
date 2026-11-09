// Бот для замеров баланса. Только dev-сборка: в консоли браузера
//   __startBot()                 — уклоняется от врагов и снарядов, собирает кристаллы
//   __startBot({ dodge: false }) — «новичок»: летит за кристаллами, не уклоняется
//   __startBot({ smart: true })  — улучшения по приоритету, а не случайно
//   __bot.log                    — что произошло: уровни, HP, враги, FPS каждые 15 с
// Играет в реальном времени, забег — 5 минут. Вкладка должна быть видна.
//
// Ускоренный режим, когда вкладка скрыта или нужен быстрый прогон:
//   __startBot({ smart: true, manual: true }); __botRun(60)  — прокрутить 60 с игрового времени
//   __botRun(60, { headless: true }) — то же без отрисовки, в разы быстрее (для замеров баланса)
//   __botLevel(n) / __botLevel() — прогон уровня n кусками по 120 с (см. внизу файла)
// Игра шагает вручную по 1/60 с, бот решает каждые 3 шага. __bot.log.frameMs — сколько
// миллисекунд занимает кадр (логика + отрисовка) по минутам: до 16.7 мс — это 60 FPS.

// Порядок, в котором «думающий» игрок берёт улучшения
// Как до подвесного оружия: сначала пулемёт и ракеты — замеры сравнимы со старыми; новое — после
const PRIORITY = ['missile', 'damage', 'fireRate', 'flares', 'hp', 'rockets', 'bombs', 'napalm', 'gas', 'magnet', 'speed'];

export function installBot(game) {
  window.__startBot = ({ dodge = true, smart = false, manual = false } = {}) => {
    if (window.__bot) clearInterval(window.__bot.timer);
    game.scene.getScenes(true)[0]?.scene.start('GameScene');
    const log = {
      dodge,
      smart,
      samples: [],
      picks: [],
      minFps: 99,
      hpLossByMin: [0, 0, 0, 0, 0, 0],
      frameMs: [[], [], [], [], [], []],
      done: false,
    };
    let lastHp = null;
    let lastSample = 0;

    const tick = () => {
      const scenes = game.scene;
      // Забег стартовал, пока загрузка ещё не закончилась, — меню успевает запуститься под игрой; убрать
      if (scenes.isActive('MenuScene') && (scenes.isActive('GameScene') || scenes.isPaused('GameScene'))) scenes.stop('MenuScene');
      // Сбили — бот рекламу не смотрит: «Завершить», забег засчитан как гибель (иначе прогон висит на этом экране)
      if (scenes.isActive('ReviveScene')) scenes.getScene('ReviveScene').giveUp();
      if (!scenes.isActive('GameScene') && !scenes.isPaused('GameScene')) {
        if (scenes.isActive('GameOverScene') && !log.done) {
          log.done = true;
          log.end = { ...scenes.getScene('GameOverScene').sys.settings.data };
        }
        return;
      }
      const sc = scenes.getScene('GameScene');
      if (!sc.player || !sc.spawner) return;

      const lu = scenes.getScene('LevelUpScene');
      if (scenes.isActive('LevelUpScene') && lu.ready && !lu.picked) {
        const choices = lu.data_.choices;
        let i = Math.floor(Math.random() * choices.length);
        if (smart) {
          const rank = choices.map((c) => PRIORITY.indexOf(c.id));
          i = rank.indexOf(Math.min(...rank));
        }
        log.picks.push(`${choices[i].id}@${Math.round(sc.spawner.elapsed)}`);
        lu.pick(i);
        return;
      }
      if (sc.scene.isPaused()) return;
      const p = sc.player;
      if (!p.alive) return;

      const el = sc.spawner.elapsed;
      if (lastHp !== null && p.hp < lastHp) log.hpLossByMin[Math.min(5, Math.floor(el / 60))] += lastHp - p.hp;
      lastHp = p.hp;
      log.minFps = Math.min(log.minFps, Math.round(game.loop.actualFps));
      if (el - lastSample >= 15) {
        lastSample = el;
        log.samples.push({
          t: Math.round(el),
          lvl: sc.level,
          xp: `${sc.xp}/${sc.xpNext}`,
          hp: `${Math.round(p.hp)}/${p.maxHp}`,
          enemies: sc.enemies.countActive(),
          fps: Math.round(game.loop.actualFps),
          boss: sc.boss?.active ? Math.round(sc.boss.hp) : null,
        });
      }

      let fx = 0;
      let fy = 0;
      if (dodge) {
        // Отталкивание от врагов: тяжёлые — сильнее и издалека
        for (const e of sc.enemies.getChildren()) {
          if (!e.active) continue;
          const dx = p.x - e.x;
          const dy = p.y - e.y;
          const d = Math.hypot(dx, dy) || 1;
          const R = e.type === 'boss' ? 320 : e.type === 'tank' ? 260 : 220;
          if (d >= R) continue;
          const w = (e.type === 'boss' ? 4 : e.type === 'tank' ? 2 : 1) * ((R - d) / R);
          fx += (dx / d) * w;
          fy += (dy / d) * w;
        }
        // Круг артобстрела виден заранее — уходить из него
        for (const z of sc.artillery?.zones ?? []) {
          const dx = p.x - z.x;
          const dy = p.y - z.y;
          const d = Math.hypot(dx, dy) || 1;
          const R = 130 + 60;
          if (d < R) {
            fx += (dx / d) * 4 * ((R - d) / R);
            fy += (dy / d) * 4 * ((R - d) / R);
          }
        }
        // Высокие сооружения и провода видны — живой игрок их облетает
        if (sc.air) {
          for (const z of sc.air.towers.getChildren()) {
            const dx = p.x - z.x;
            const dy = p.y - z.y;
            const d = Math.hypot(dx, dy) || 1;
            const R = z.body.halfWidth + 70;
            if (d < R) {
              fx += (dx / d) * 2 * ((R - d) / R);
              fy += (dy / d) * 2 * ((R - d) / R);
            }
          }
          for (const w of sc.air.wires) {
            if (!w.alive) continue;
            const wx = w.x2 - w.x1;
            const wy = w.y2 - w.y1;
            const t = Math.max(0, Math.min(1, ((p.x - w.x1) * wx + (p.y - w.y1) * wy) / (wx * wx + wy * wy || 1)));
            const dx = p.x - (w.x1 + t * wx);
            const dy = p.y - (w.y1 + t * wy);
            const d = Math.hypot(dx, dy) || 1;
            if (d < 70) {
              fx += (dx / d) * 2.5 * ((70 - d) / 70);
              fy += (dy / d) * 2.5 * ((70 - d) / 70);
            }
          }
        }
        // Шаг в сторону от снарядов, летящих в нас
        for (const s of sc.shells.getChildren()) {
          if (!s.active) continue;
          const dx = p.x - s.x;
          const dy = p.y - s.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d >= 220) continue;
          const { x: vx, y: vy } = s.body.velocity;
          const vl = Math.hypot(vx, vy) || 1;
          if ((vx * dx + vy * dy) / (vl * d) <= 0.6) continue;
          const px = -vy / vl;
          const py = vx / vl;
          const side = px * dx + py * dy >= 0 ? 1 : -1;
          const w = (3 * (220 - d)) / 220;
          fx += px * side * w;
          fy += py * side * w;
        }
      }
      // Ближайший кристалл; если опасности нет — летим к нему смелее
      let gem = null;
      let gd = dodge ? 380 : 600;
      for (const g of sc.gems.getChildren()) {
        if (!g.active) continue;
        const d = Math.hypot(g.x - p.x, g.y - p.y);
        if (d < gd) {
          gd = d;
          gem = g;
        }
      }
      if (gem) {
        const w = Math.hypot(fx, fy) < 0.8 ? 1.2 : 0.4;
        fx += ((gem.x - p.x) / gd) * w;
        fy += ((gem.y - p.y) / gd) * w;
      }
      // Ящик снабжения — цель важнее кристаллов: летим к ближайшему, даже если он за экраном
      // (игрок видит стрелку у края). Новичок летит так же — ящики не должны его спасать
      let crate = null;
      let cd = Infinity;
      for (const c of sc.supply.active) {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < cd) {
          cd = d;
          crate = c;
        }
      }
      if (crate) {
        const w = Math.hypot(fx, fy) < 1.2 ? 1.6 : 0.6;
        fx += ((crate.x - p.x) / cd) * w;
        fy += ((crate.y - p.y) / cd) * w;
      }

      // Уход из района перед ударом — главное; к краю тогда прижиматься можно
      const ex = sc.extraction;
      if (ex?.active) {
        const to = ex.target();
        const d = Math.hypot(to.x - p.x, to.y - p.y) || 1;
        fx += ((to.x - p.x) / d) * 3;
        fy += ((to.y - p.y) / d) * 3;
      } else {
        // Склад рядом — подлететь, чтобы пулемёт разбил (игрок видит склады на улице)
      const depot = sc.depots?.target(p.x, p.y);
      let near = null;
      let nd = 500;
      for (const d of sc.depots?.list ?? []) {
        if (!d.active) continue;
        const dd = Math.hypot(d.x - p.x, d.y - p.y);
        if (dd < nd) {
          nd = dd;
          near = d;
        }
      }
      if (near && !depot) {
        fx += ((near.x - p.x) / nd) * 0.5;
        fy += ((near.y - p.y) / nd) * 0.5;
      }

      // Не прижиматься к краям мира
        const M = 500;
        const { width: W, height: H } = sc.physics.world.bounds;
        if (p.x < M) fx += ((M - p.x) / M) * 2;
        if (p.x > W - M) fx -= ((p.x - W + M) / M) * 2;
        if (p.y < M) fy += ((M - p.y) / M) * 2;
        if (p.y > H - M) fy -= ((p.y - H + M) / M) * 2;
      }

      const L = Math.hypot(fx, fy);
      if (L < 0.05) {
        p.target = null;
        return;
      }
      // От вертолёта на экране, а не от центра: у края карты камера упирается и он уже не в центре
      const cam = sc.cameras.main;
      const sx = (p.x - cam.worldView.x) * cam.zoom;
      const sy = (p.y - cam.worldView.y) * cam.zoom;
      p.target = { x: sx + (fx / L) * 150, y: sy + (fy / L) * 150 };
    };

    const timer = manual ? null : setInterval(tick, 50);
    // В ручном режиме собственный цикл игры спит — иначе она шагала бы дважды
    if (manual) game.loop.sleep();
    else if (game.loop.sleeping) game.loop.wake();
    window.__bot = { timer, log, tick };
    return log;
  };

  // Прокрутить игру на seconds игрового времени вручную (см. «Ускоренный режим» выше)
  let clock = performance.now();
  window.__botRun = (seconds, { headless = false } = {}) => {
    const bot = window.__bot;
    const dt = 1000 / 60;
    for (let i = 0; i < Math.round(seconds * 60) && !bot.log.done; i++) {
      clock += dt;
      const t0 = performance.now();
      const sc = game.scene.getScene('GameScene');
      if (headless) {
        game.headlessStep(clock, dt);
        // Без отрисовки камера сама не догоняет вертолёт, а бот рулит относительно экрана
        if (game.scene.isActive('GameScene')) sc.cameras.main.preRender();
      } else game.step(clock, dt);
      if (game.scene.isActive('GameScene') && sc.spawner) {
        const m = Math.min(5, Math.floor(sc.spawner.elapsed / 60));
        bot.log.frameMs[m].push(performance.now() - t0);
      }
      if (i % 3 === 0) bot.tick();
    }
    const l = bot.log;
    if (l.done) game.loop.wake();
    return { done: l.done, end: l.end, last: l.samples.at(-1) };
  };

  // Прогон уровня по номеру для замеров баланса (скил /bot-run): «думающий» бот, без отрисовки.
  //   __botLevel(2)      — начать уровень 2 и прокрутить первые 120 с
  //   __botLevel()       — продолжить текущий забег ещё на 120 с (вызывать, пока done: false)
  // Куски по 120 с — чтобы один вызов из инструмента браузера не обрывался по времени.
  window.__botLevel = (n = null, seconds = 120) => {
    if (n !== null) {
      game.registry.set('level', n);
      window.__startBot({ smart: true, manual: true });
    }
    const r = window.__botRun(seconds, { headless: true });
    const e = r.end ?? {};
    // Сколько осталось скрытого запаса брони по зонам (LAST_STAND): 1 и 0.15 — не тронут, 0 — истрачен
    const reserve = game.scene.getScene('GameScene').player?.reserve.map((v) => +v.toFixed(2));
    return r.done
      ? { done: true, level: e.levelN, win: e.win, time: Math.round(e.time), cause: e.cause, ending: e.ending, boss: e.bossKilled, lvl: e.level, hp: r.last?.hp, reserve, weapons: e.weapons }
      : { done: false, ...r.last };
  };
}
