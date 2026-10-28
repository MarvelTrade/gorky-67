// Бот для замеров баланса. Только dev-сборка: в консоли браузера
//   __startBot()                 — уклоняется от врагов и снарядов, собирает кристаллы
//   __startBot({ dodge: false }) — «новичок»: летит за кристаллами, не уклоняется
//   __startBot({ smart: true })  — улучшения по приоритету, а не случайно
//   __bot.log                    — что произошло: уровни, HP, враги, FPS каждые 15 с
// Играет в реальном времени, забег — 5 минут.

// Порядок, в котором «думающий» игрок берёт улучшения
const PRIORITY = ['missile', 'damage', 'fireRate', 'hp', 'magnet', 'speed'];

export function installBot(game) {
  window.__startBot = ({ dodge = true, smart = false } = {}) => {
    if (window.__bot) clearInterval(window.__bot.timer);
    game.scene.getScenes(true)[0]?.scene.start('GameScene');
    const log = { dodge, smart, samples: [], picks: [], minFps: 99, hpLossByMin: [0, 0, 0, 0, 0, 0], done: false };
    let lastHp = null;
    let lastSample = 0;

    const timer = setInterval(() => {
      const scenes = game.scene;
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
      // Не прижиматься к краям мира
      const M = 500;
      const { width: W, height: H } = sc.physics.world.bounds;
      if (p.x < M) fx += ((M - p.x) / M) * 2;
      if (p.x > W - M) fx -= ((p.x - W + M) / M) * 2;
      if (p.y < M) fy += ((M - p.y) / M) * 2;
      if (p.y > H - M) fy -= ((p.y - H + M) / M) * 2;

      const L = Math.hypot(fx, fy);
      if (L < 0.05) {
        p.target = null;
        return;
      }
      const cam = sc.cameras.main;
      p.target = { x: cam.width / 2 + (fx / L) * 150, y: cam.height / 2 + (fy / L) * 150 };
    }, 50);

    window.__bot = { timer, log };
    return log;
  };
}
