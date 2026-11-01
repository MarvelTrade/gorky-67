import * as Phaser from 'phaser';
import { RUN, CONTROLS, RADIO, EVENTS, BOSS_SPAWN, TIMELINE, EXTRACT, LOW_HP } from '../config.js';
import { formatTime } from '../format.js';
import { t } from '../i18n/index.js';
import { lt } from '../levels.js';
import { sfx } from '../systems/Sfx.js';
import { FONT, KHAKI, BRASS } from '../ui/paper.js';
import { WeaponBar } from '../ui/WeaponBar.js';
import { settings } from '../settings.js';

const PAD = 12;
const XP_BAR_H = 10;
const HP_BAR_W = 180;
const HP_BAR_H = 14;
const BOSS_BAR_H = 12;
const HUD_TEXT = '#ece4cc'; // цифры HUD — цвет бумаги, не чисто белый: в тон экранам-бланкам

// HUD поверх GameScene: полоска опыта с уровнем, HP, прожитое время.
// Только читает состояние GameScene, ничего в нём не меняет.
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gs = this.scene.get('GameScene');

    // Трещины на стекле и мигание при броне ≤ 20% — под HUD, чтобы цифры читались
    this.cracks = this.add.graphics().setVisible(false);
    this.lowT = 0;
    this.lowText = this.add
      .text(0, 0, t('lowArmor'), {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#1b1b10',
        backgroundColor: '#ffc400',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0, 0)
      .setVisible(false);
    this.bars = this.add.graphics();

    // Пауза — справа сверху. Большая зона нажатия, чтобы попадать пальцем
    this.pauseBtn = this.add.image(0, 0, 'pauseBtn').setInteractive({ useHandCursor: true });
    this.pauseBtn.input.hitArea.setTo(-8, -8, this.pauseBtn.width + 16, this.pauseBtn.height + 16);
    this.pauseBtn.on('pointerdown', () => this.gs.openPause());
    this.stick = this.add.graphics();

    // Радио: позывной («Берёза» или «Черёмуха») и одна строка; реплики в очереди
    this.radioWave = -1;
    this.radioLeft = 0;
    this.radioQueue = [];
    this.radio = this.add.container(0, 0).setAlpha(0);
    this.radioBg = this.add.graphics();
    // Плашка — как шкала полевой рации: хаки, латунная окантовка, позывной машинкой с разрядкой.
    // Текст реплики — рубленым шрифтом: машинка шире, строки на телефоне переносились бы чаще
    this.radioCall = this.add
      .text(0, 0, t('radioCallsign_beryoza'), {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#d8f040',
        fontStyle: 'bold',
      })
      .setLetterSpacing(2);
    this.radioText = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '15px', color: HUD_TEXT });
    this.radio.add([this.radioBg, this.radioCall, this.radioText]);
    // Разовые реплики не по волнам: emit('radio', строка, позывной?, срочно?)
    this.gs.events.on('radio', (line, who, urgent) => this.queueRadio(line, who, urgent));
    // Красная пульсация по краям экрана перед ордой
    this.alertLeft = 0;
    this.alertT = 0;
    this.gs.events.on('alert', (seconds) => (this.alertLeft = seconds));
    // Цифры HUD — машинкой: моноширинные цифры не «пляшут», когда меняются
    const style = { fontFamily: FONT, color: HUD_TEXT, stroke: '#000000', strokeThickness: 4 };
    this.levelText = this.add.text(0, 0, '', { ...style, fontSize: '16px', fontStyle: 'bold' });
    this.hpText = this.add.text(0, 0, '', { ...style, fontSize: '13px', fontStyle: 'bold', strokeThickness: 3 }).setOrigin(0.5);
    // Таймер — рубленым: «Удар через 0:45» машинкой на 375 px налезал бы на «Уровень»
    this.timerText = this.add.text(0, 0, '', { ...style, fontFamily: 'sans-serif', fontSize: '28px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    // Добыча со складов за забег: рубли и запчасти — под полоской брони
    this.walletText = this.add.text(0, 0, '', { ...style, fontSize: '14px', strokeThickness: 3, color: '#f2c94c' });
    this.bossText = this.add
      .text(0, 0, t('boss'), { ...style, fontSize: '14px', strokeThickness: 3, color: '#ffb0a0' })
      .setOrigin(0.5, 1)
      .setVisible(false);
    // Нижняя панель оружия и шкалы брони и хода по бокам
    this.weaponBar = new WeaponBar(this);
    // Счётчик кадров: в dev-сборке всегда, у тестеров — по настройке «Показывать FPS».
    // Текст обновляется дважды в секунду (перерисовка текста каждый кадр сама стоит кадров на телефоне):
    // средний FPS за полсекунды и худший за последние 5 с
    this.fpsText =
      import.meta.env.DEV || (settings.showFps && import.meta.env.VITE_PLATFORM !== 'yandex')
        ? this.add.text(0, 0, '', { ...style, fontSize: '12px', strokeThickness: 3 }).setOrigin(1, 0)
        : null;
    this.fpsAcc = { t: 0, frames: 0, worst: [] };
  }

  update(time, delta) {
    const gs = this.gs;
    if (!gs.player) return;
    this.hudTime = time / 1000; // для пульсаций HUD (не this.time — это часы сцены Phaser)
    this.updateRadio(gs, delta / 1000);
    const { width } = this.scale;
    const p = gs.player;
    const g = this.bars;
    g.clear();
    const { height } = this.scale;

    // Опыт — тонкая полоса во всю ширину сверху
    g.fillStyle(0x000000, 0.5);
    g.fillRect(0, 0, width, XP_BAR_H);
    g.fillStyle(0x4fd8ff);
    g.fillRect(0, 0, width * Math.min(1, gs.xp / gs.xpNext), XP_BAR_H);

    // HP — слева под полосой опыта; на узком экране короче, чтобы не наезжать на таймер
    const hpW = Math.min(HP_BAR_W, width / 2 - 50);
    const hpY = XP_BAR_H + PAD + 22;
    const hpFrac = Math.max(0, p.hp / p.maxHp);
    g.fillStyle(0x000000, 0.55);
    g.fillRect(PAD - 2, hpY - 2, hpW + 4, HP_BAR_H + 4);
    // Мало брони — полоска пульсирует: сигнал до гибели, а не после (Ходент: смерть не должна быть внезапной)
    const low = hpFrac <= 0.25 && p.alive;
    this.updateLowHp(g, hpFrac <= LOW_HP.crackAt && p.alive, width, height, delta / 1000, gs.scene.isPaused());
    const pulse = low ? 0.55 + 0.45 * Math.sin(this.hudTime * 10) : 1;
    g.fillStyle(hpFrac > 0.5 ? 0x6cc04a : hpFrac > 0.25 ? 0xe0b030 : 0xe04030, pulse);
    g.fillRect(PAD, hpY, hpW * hpFrac, HP_BAR_H);
    if (low) {
      g.lineStyle(2, 0xff5040, pulse);
      g.strokeRect(PAD - 2, hpY - 2, hpW + 4, HP_BAR_H + 4);
    }

    this.levelText.setPosition(PAD, XP_BAR_H + 6).setText(`${t('level')} ${gs.level}`);
    this.hpText.setPosition(PAD + hpW / 2, hpY + HP_BAR_H / 2).setText(`${Math.ceil(p.hp)} / ${p.maxHp}`);
    const d = gs.depots;
    this.walletText
      .setPosition(PAD, hpY + HP_BAR_H + 6)
      .setText(`₽ ${d.money}   ⚙ ${d.parts}`)
      .setVisible(d.money + d.parts > 0); // до первого склада не мешает

    // Таймер — сколько прожито (0:00 → 5:00), как и на экране итогов; последние 30 с краснеет
    const elapsed = Math.min(gs.spawner.elapsed, RUN.duration);
    const ex = gs.extraction;
    // На узком экране (телефон) крупный таймер наезжал на полоску брони — мельче
    this.timerText.setPosition(width / 2, XP_BAR_H + 6);
    // setFontSize перерисовывает текст — только когда размер правда меняется (поворот экрана)
    const timerSize = width < 420 ? '22px' : '28px';
    if (this.timerText.style.fontSize !== timerSize) this.timerText.setFontSize(timerSize);
    if (ex.active) {
      // Уход из района: вместо таймера забега — отсчёт до удара, мигает
      this.timerText.setText(`${t('strikeIn')} ${formatTime(Math.max(0, ex.left))}`);
      setColorIfChanged(this.timerText, Math.floor(ex.left * 3) % 2 ? '#ff6a5a' : HUD_TEXT);
    } else {
      // цель видна: сколько осталось продержаться
      this.timerText.setText(`${formatTime(elapsed)} / ${formatTime(RUN.duration)}`);
      setColorIfChanged(this.timerText, RUN.duration - elapsed <= 30 ? '#ff6a5a' : HUD_TEXT);
    }

    // HP босса — под таймером, пока он жив
    const boss = gs.boss;
    const showBoss = !!boss && boss.active;
    this.bossText.setVisible(showBoss);
    // Пока босса нет — шкала забега с метками событий (как в DRG: «всегда знаешь, что будет»)
    if (!showBoss) this.drawTimeline(g, width, elapsed);
    if (showBoss) {
      const bw = Math.min(400, width - 2 * PAD);
      const bx = (width - bw) / 2;
      const by = XP_BAR_H + 78;
      const frac = Math.max(0, boss.hp / boss.maxHp);
      g.fillStyle(0x000000, 0.6);
      g.fillRect(bx - 2, by - 2, bw + 4, BOSS_BAR_H + 4);
      g.fillStyle(0xd04030);
      g.fillRect(bx, by, bw * frac, BOSS_BAR_H);
      this.bossText.setPosition(width / 2, by - 3);
    }

    this.drawAlert(g, width, height, delta / 1000, gs.scene.isPaused());
    this.weaponBar.layout(gs, width, height);
    this.weaponBar.drawGauges(gs, width, height);
    this.drawStick(p.stick);
    this.drawSupplyArrows(gs, g);
    // «Объект» за кадром — красная стрелка: видно, откуда катится
    if (gs.boss?.active) this.drawEdgeArrow(gs, g, gs.boss.x, gs.boss.y, 0xff5a4a, 1.2);
    if (ex.active) {
      const p2 = ex.target();
      this.drawEdgeArrow(gs, g, p2.x, p2.y, EXTRACT.color, 1.4);
    }

    // Под экраном паузы радио не показываем — иначе тексты наложатся
    this.radio.setVisible(!this.scene.isActive('PauseScene'));

    // Кнопка видна, только когда паузу можно поставить
    this.pauseBtn
      .setPosition(width - PAD - this.pauseBtn.width / 2, XP_BAR_H + 6 + this.pauseBtn.height / 2)
      .setVisible(!gs.ended && !gs.scene.isPaused() && p.alive);

    if (this.fpsText) this.updateFps(width, delta);
  }

  updateFps(width, delta) {
    const a = this.fpsAcc;
    a.t += delta;
    a.frames++;
    this.fpsText.setPosition(width - PAD, XP_BAR_H + 56);
    if (a.t < 500) return;
    const fps = Math.round((a.frames * 1000) / a.t);
    a.worst.push(fps);
    if (a.worst.length > 10) a.worst.shift();
    this.fpsText.setText(`FPS ${fps}  min ${Math.min(...a.worst)}`);
    a.t = 0;
    a.frames = 0;
  }

  // Плавающий джойстик под пальцем: кольцо в точке касания и «шляпка», куда тянешь
  drawStick(stick) {
    const g = this.stick;
    g.clear();
    if (!stick || stick.x === undefined) return;
    const r = CONTROLS.stickRadius;
    let dx = stick.x - stick.ax;
    let dy = stick.y - stick.ay;
    const len = Math.hypot(dx, dy);
    if (len > r) {
      dx = (dx / len) * r;
      dy = (dy / len) * r;
    }
    g.lineStyle(3, 0xffffff, 0.35);
    g.strokeCircle(stick.ax, stick.ay, r);
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(stick.ax + dx, stick.ay + dy, 22);
  }

  // Новая волна — новая реплика. Опрашиваем номер волны, а не ловим событие:
  // первая волна стартует раньше, чем эта сцена успевает подписаться.
  // Пока игра на паузе (выбор улучшения), реплика не тратит своё время.
  updateRadio(gs, dt) {
    const wave = gs.spawner.waveIndex;
    if (wave >= 0 && wave !== this.radioWave) {
      this.radioWave = wave;
      this.queueRadio(lt(`radio_${wave + 1}`));
    }
    // Реплики идут по очереди, а не перебивают друг друга; срочные (urgent) — сразу.
    // Обычные ждут, пока идёт орда или летят снаряды обстрела: в опасности — только тревога (Ходент: внимание)
    if (this.radioLeft <= 0 && this.radioQueue.length && !this.inDanger(gs)) this.showRadio(...this.radioQueue.shift());
    if (this.radioLeft <= 0 || gs.scene.isPaused()) return;
    this.radioLeft -= dt;
    const total = this.radioTotal;
    const passed = total - this.radioLeft;
    this.radio.setAlpha(Math.max(0, Math.min(1, passed / RADIO.fade, this.radioLeft / RADIO.fade)));
  }

  inDanger(gs) {
    const horde = gs.runEvents?.hordes.some((h) => h.started && !h.done);
    return !!horde || (gs.artillery?.zones.length ?? 0) > 0;
  }

  // who — позывной: 'beryoza' (диспетчер) или 'cheryomukha' (агент, своя полоска цвета)
  queueRadio(line, who = 'beryoza', urgent = false) {
    if (urgent || this.radioLeft <= 0) this.showRadio(line, who);
    else if (this.radioQueue.length < 3) this.radioQueue.push([line, who]);
  }

  showRadio(line, who = 'beryoza') {
    const { width } = this.scale;
    const w = Math.min(440, width - 2 * PAD);
    const pad = 10;
    const accent = RADIO.callsigns[who] ?? RADIO.callsigns.beryoza;
    this.lastWho = who; // Hints: две подсказки подряд не даём
    this.radioCall.setText(t(`radioCallsign_${who}`)).setColor(accent.text);
    this.radioText.setText(line).setWordWrapWidth(w - pad * 2 - 6);
    this.radioCall.setPosition(pad + 6, pad - 2);
    this.radioText.setPosition(pad + 6, pad + 14);
    const h = this.radioText.height + pad * 2 + 14;
    // Рисуется только при новой реплике, не каждый кадр
    this.radioBg
      .clear()
      .fillStyle(0x0c100a, 0.82)
      .fillRect(0, 0, w, h)
      .fillStyle(KHAKI, 0.55)
      .fillRect(4, 0, w - 4, pad + 12) // полоса позывного — «шкала» рации
      .lineStyle(1, BRASS, 0.7)
      .strokeRect(0.5, 0.5, w - 1, h - 1)
      .fillStyle(accent.bar)
      .fillRect(0, 0, 4, h);
    // Под полоской босса, чтобы не перекрывать её на 5-й волне
    this.radio.setPosition((width - w) / 2, XP_BAR_H + 100);
    // Длинные реплики (с паузами «...») держим дольше — успеть прочитать на ходу
    this.radioTotal = (line.length > RADIO.longChars ? RADIO.duration_long : RADIO.duration) + RADIO.fade * 2;
    this.radioLeft = this.radioTotal;
    sfx.play('radio');
  }

  // Шкала 0:00–5:00 с метками: орды (оранжевые треугольники), затишье (серая полоса), «Объект» (ромб).
  // Ближайшее событие за TIMELINE.soon с пульсирует — предупреждение заранее, а не в последний момент
  drawTimeline(g, width, elapsed) {
    const T = TIMELINE;
    const w = Math.min(T.width, width - 2 * PAD);
    const x0 = (width - w) / 2;
    const y = XP_BAR_H + T.y;
    const at = (s) => x0 + (w * s) / RUN.duration;
    g.fillStyle(0x000000, 0.55);
    g.fillRect(x0 - 2, y - 2, w + 4, T.h + 4);
    g.fillStyle(0x3a4046, 1);
    g.fillRect(x0, y, w, T.h);
    // Затишье перед «Объектом» — светлый отрезок
    g.fillStyle(0x8a939b, 0.8);
    g.fillRect(at(EVENTS.calm.start), y, at(EVENTS.calm.start + EVENTS.calm.duration) - at(EVENTS.calm.start), T.h);
    // Пройденное
    g.fillStyle(0xe8edf0, 0.9);
    g.fillRect(x0, y, at(elapsed) - x0, T.h);

    const pulse = 0.5 + 0.5 * Math.sin(this.hudTime * 8);
    const mark = (s, color, draw) => {
      const passed = elapsed >= s;
      const soon = !passed && s - elapsed <= T.soon;
      g.fillStyle(color, passed ? 0.35 : soon ? 0.55 + 0.45 * pulse : 1);
      draw(at(s));
    };
    for (const s of EVENTS.horde.times) {
      mark(s, T.colors.horde, (x) => g.fillTriangle(x - 6, y - 3, x + 6, y - 3, x, y + T.h + 2));
    }
    mark(BOSS_SPAWN.at, T.colors.boss, (x) =>
      g.fillPoints([{ x, y: y - 6 }, { x: x + 7, y: y + T.h / 2 }, { x, y: y + T.h + 6 }, { x: x - 7, y: y + T.h / 2 }], true),
    );
    // Бегунок «сейчас»
    g.fillStyle(0xffffff, 1);
    g.fillRect(at(elapsed) - 1, y - 3, 2, T.h + 6);
  }

  drawAlert(g, width, height, dt, paused) {
    if (this.alertLeft <= 0) return;
    if (!paused) {
      this.alertLeft -= dt;
      this.alertT += dt;
    }
    const a = 0.18 + 0.17 * Math.sin(this.alertT * 9);
    // Три полосы с убывающей прозрачностью — мягкий красный край
    for (let i = 0; i < 3; i++) {
      const w = 10 * (i + 1);
      g.fillStyle(0xff2020, a / (i + 1));
      g.fillRect(0, 0, width, w);
      g.fillRect(0, height - w, width, w);
      g.fillRect(0, 0, w, height);
      g.fillRect(width - w, 0, w, height);
    }
  }

  // Стрелка у края экрана к ящику снабжения, который сейчас не виден
  drawSupplyArrows(gs, g) {
    for (const c of gs.supply.active) this.drawEdgeArrow(gs, g, c.x, c.y, 0xffd040);
  }

  // Стрелка у края экрана к точке мира за кадром: ящик, коридор ухода из района
  drawEdgeArrow(gs, g, wx, wy, color, scale = 1) {
    const cam = gs.cameras.main;
    const view = cam.worldView;
    if (view.contains(wx, wy)) return;
    const { width, height } = this.scale;
    const m = 26 * scale; // отступ от края
    const sx = (wx - view.x) * cam.zoom;
    const sy = (wy - view.y) * cam.zoom;
    const cx = width / 2;
    const cy = height / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    // Точка на краю экрана по направлению к цели
    const k = Math.min((width / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (height / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
    const x = cx + Math.cos(a) * k;
    const y = cy + Math.sin(a) * k;
    const tip = 14 * scale;
    const back = 9 * scale;
    g.fillStyle(0x000000, 0.5);
    g.fillCircle(x, y, 14 * scale);
    g.fillStyle(color);
    g.fillTriangle(
      x + Math.cos(a) * tip,
      y + Math.sin(a) * tip,
      x + Math.cos(a + 2.5) * back,
      y + Math.sin(a + 2.5) * back,
      x + Math.cos(a - 2.5) * back,
      y + Math.sin(a - 2.5) * back
    );
  }

  // Брони ≤ LOW_HP.crackAt: жёлтая кромка по краям (медленно дышит), надпись и трещины по углам стекла.
  // Починили (броня выше порога) — всё уходит
  updateLowHp(g, on, width, height, dt, paused) {
    if (on && (!this.cracks.visible || this.cracksW !== width || this.cracksH !== height)) {
      this.drawCracks(width, height);
    }
    this.cracks.setVisible(on);
    this.lowText.setVisible(on);
    if (!on) return;
    if (!paused) this.lowT += dt;
    const k = 0.5 + 0.5 * Math.sin(this.lowT * LOW_HP.edgePulse);
    const [a0, a1] = LOW_HP.edgeAlpha;
    const a = a0 + (a1 - a0) * k;
    // Три полосы с убывающей прозрачностью — мягкий край, как у тревоги орды
    for (let i = 0; i < 3; i++) {
      const w = 8 * (i + 1);
      g.fillStyle(LOW_HP.edge, a / (i + 1));
      g.fillRect(0, 0, width, w);
      g.fillRect(0, height - w, width, w);
      g.fillRect(0, 0, w, height);
      g.fillRect(width - w, 0, w, height);
    }
    // Под полоской брони — рядом с тем, о чём предупреждает; низ экрана не используем
    this.lowText.setPosition(PAD, XP_BAR_H + PAD + 22 + HP_BAR_H + 26).setAlpha(0.7 + 0.3 * k);
  }

  // Трещины стекла кабины: 1–2 удара по углам (центр с вертолётом и HUD слева сверху не трогаем).
  // От точки удара — лучи, которые ветвятся, между лучами — «паутина» колец, как у настоящего стекла.
  // Рисуются один раз, когда броня упала до порога
  drawCracks(width, height) {
    this.cracksW = width;
    this.cracksH = height;
    const g = this.cracks.clear();
    const R = Phaser.Math.FloatBetween;
    const corners = Phaser.Utils.Array.Shuffle([
      [0.9, 0.12], [0.1, 0.88], [0.9, 0.88],
    ]).slice(0, Phaser.Math.Between(1, 2));
    const line = (x1, y1, x2, y2, w) => {
      g.lineStyle(w + 2, 0x000000, 0.28).lineBetween(x1, y1, x2, y2);
      g.lineStyle(w, 0xdff2ff, 0.55).lineBetween(x1, y1, x2, y2);
    };
    for (const [fx, fy] of corners) {
      const cx = fx * width + R(-20, 20);
      const cy = fy * height + R(-20, 20);
      const size = Math.min(width, height) * R(0.22, 0.32);
      const rays = Phaser.Math.Between(6, 8);
      const pts = []; // точки лучей на кольцах — для «паутины»
      for (let r = 0; r < rays; r++) {
        let a = (r / rays) * Math.PI * 2 + R(-0.25, 0.25);
        let x = cx;
        let y = cy;
        const ring = [];
        const segs = 6;
        const len = size * R(0.7, 1.1);
        for (let k = 1; k <= segs; k++) {
          a += R(-0.18, 0.18);
          const d = (len / segs) * k;
          const nx = cx + Math.cos(a) * d;
          const ny = cy + Math.sin(a) * d;
          line(x, y, nx, ny, k < 3 ? 1.6 : 1);
          // Ветка от луча — короткая, в сторону
          if (k > 1 && Math.random() < 0.35) {
            const ba = a + (Math.random() < 0.5 ? 1 : -1) * R(0.5, 0.9);
            const bl = (len / segs) * R(0.6, 1.2);
            line(nx, ny, nx + Math.cos(ba) * bl, ny + Math.sin(ba) * bl, 0.8);
          }
          ring.push([nx, ny]);
          x = nx;
          y = ny;
        }
        pts.push(ring);
      }
      // «Паутина»: соединяем соседние лучи на двух кольцах — ломаные дуги
      for (const k of [1, 3]) {
        for (let r = 0; r < rays; r++) {
          const p1 = pts[r][k];
          const p2 = pts[(r + 1) % rays][k];
          if (p1 && p2) line(p1[0], p1[1], p2[0], p2[1], 0.8);
        }
      }
      // Точка удара — мелкое крошево
      g.fillStyle(0xffffff, 0.45).fillCircle(cx, cy, 3);
      for (let i = 0; i < 8; i++) g.fillStyle(0xffffff, 0.3).fillCircle(cx + R(-9, 9), cy + R(-9, 9), 1.2);
    }
  }
}

// Text.setColor перерисовывает текст и грузит его в видеокарту при каждом вызове, даже с тем же цветом.
// Таймер красился каждый кадр — на телефоне это лишняя работа весь забег
function setColorIfChanged(text, color) {
  if (text.style.color !== color) text.setColor(color);
}
