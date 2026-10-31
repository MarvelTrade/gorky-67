import * as Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { LEVELS, isBuilt } from '../levels.js';
import { meta } from '../meta.js';
import { CAMPAIGN } from '../config.js';
import { onTap } from '../ui/tap.js';
import { FONT, INK, INK_SOFT, makeSheet, drawSheet, makeStamp } from '../ui/paper.js';

// Карта кампании «Дорога на столицу»: железная дорога вьётся снизу (Горький-67) вверх (Столица),
// на ней десять станций-уровней. Пройденные и открытые — можно выбрать; следующая подсвечена;
// ещё не построенные — «???». Уровень открывается, когда в предыдущем ушёл из района до удара.
export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  create() {
    this.sheet = makeSheet(this);
    this.title = this.add.text(0, 0, t('mapTitle'), { fontFamily: FONT, fontSize: '22px', color: INK, fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.sub = this.add.text(0, 0, t('mapSub'), { fontFamily: FONT, fontSize: '12px', color: INK_SOFT, align: 'center' }).setOrigin(0.5, 0);
    this.stamp = makeStamp(this, t('telegramStamp'), 14, undefined, -8);
    this.rail = this.add.graphics();
    this.nodes = LEVELS.map((L) => this.makeNode(L));

    this.back = this.add
      .text(0, 0, t('back'), { fontFamily: 'sans-serif', fontSize: '18px', color: '#c8d8b0', padding: { x: 12, y: 8 } })
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true });
    onTap(this.back, () => true, () => this.scene.start('MenuScene'));
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));
    // Enter — следующая открытая станция
    this.input.keyboard.on('keydown-ENTER', () => this.go(this.current()));

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  // Самый дальний открытый и построенный уровень — туда по умолчанию
  current() {
    let n = 1;
    for (const L of LEVELS) if (L.n <= (meta.levelReached ?? 1) && isBuilt(L.n)) n = L.n;
    return n;
  }

  state(n) {
    if (!isBuilt(n)) return 'soon';
    if (n > (meta.levelReached ?? 1) && !CAMPAIGN.openAll) return 'locked';
    return n === this.current() ? 'next' : 'open';
  }

  makeNode(L) {
    const c = this.add.container(0, 0);
    const st = this.state(L.n);
    const ring = this.add.circle(0, 0, 15, st === 'soon' ? 0xd8ceb0 : st === 'locked' ? 0xb8ae94 : 0xf4ecd8).setStrokeStyle(3, st === 'next' ? 0xb03024 : 0x5a4a32);
    const num = this.add.text(0, 0, String(L.n), { fontFamily: FONT, fontSize: '14px', color: INK, fontStyle: 'bold' }).setOrigin(0.5);
    const name = this.add
      .text(0, 0, t(`lvl_name_${L.n}`), {
        fontFamily: FONT,
        fontSize: '13px',
        color: st === 'soon' || st === 'locked' ? INK_SOFT : INK,
        fontStyle: st === 'next' ? 'bold' : 'normal',
      })
      .setOrigin(0, 0.5);
    const tag = this.add
      .text(0, 0, st === 'soon' ? t('mapSoon') : st === 'locked' ? '🔒' : st === 'next' ? `← ${t('mapGo')}` : '✓', {
        fontFamily: FONT,
        fontSize: '11px',
        color: st === 'next' ? '#b03024' : INK_SOFT,
      })
      .setOrigin(0, 0.5);
    c.add([ring, num, name, tag]);
    Object.assign(c, { L, st, ring, name, tag });
    if (st === 'open' || st === 'next') {
      ring.setInteractive({ useHandCursor: true });
      onTap(ring, () => true, () => this.go(L.n));
      name.setInteractive({ useHandCursor: true });
      onTap(name, () => true, () => this.go(L.n));
      // Следующая станция пульсирует — туда и лететь
      if (st === 'next') this.tweens.add({ targets: ring, scale: { from: 1, to: 1.18 }, yoyo: true, repeat: -1, duration: 600 });
    }
    return c;
  }

  go(n) {
    this.registry.set('level', n);
    this.scene.start('BriefingScene');
  }

  layout() {
    const { width, height } = this.scale;
    const w = Math.min(460, width - 24);
    const h = height - 70;
    const x0 = (width - w) / 2;
    const y0 = 10;
    drawSheet(this.sheet, x0, y0, w, h);
    this.title.setPosition(width / 2, y0 + 10);
    this.sub.setPosition(width / 2, y0 + 38).setWordWrapWidth(w - 40);
    this.stamp.setPosition(x0 + w - 70, y0 + h - 40); // в углу, не на заголовке
    this.back.setPosition(8, height - 8);

    // Станции снизу вверх по извилистой линии: x качается синусом, y — равными шагами
    const top = y0 + 70;
    const bottom = y0 + h - 26;
    const amp = Math.min(w * 0.22, 90);
    const cx = x0 + w * 0.36;
    const pts = this.nodes.map((node, i) => {
      const k = i / (this.nodes.length - 1);
      return { x: cx + Math.sin(k * Math.PI * 2.4) * amp, y: bottom - k * (bottom - top) };
    });
    // Железная дорога: шпалы и рельс, пройденная часть — темнее
    const g = this.rail.clear();
    const reached = (meta.levelReached ?? 1) - 1;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const done = i < reached;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      g.lineStyle(1.5, done ? 0x3a2e22 : 0x9a8e74);
      for (let d = 4; d < len; d += 8) {
        const x = a.x + ((b.x - a.x) * d) / len;
        const y = a.y + ((b.y - a.y) * d) / len;
        g.lineBetween(x - nx * 6, y - ny * 6, x + nx * 6, y + ny * 6); // шпалы
      }
      g.lineStyle(done ? 3 : 2, done ? 0x2a2418 : 0x8a7e64).lineBetween(a.x, a.y, b.x, b.y);
    }
    const small = h < 420;
    this.nodes.forEach((node, i) => {
      node.setPosition(pts[i].x, pts[i].y).setScale(small ? 0.8 : 1);
      node.name.setPosition(22, 0).setFontSize(small ? 11 : 13);
      node.tag.setPosition(22 + node.name.width + 6, 0);
    });
  }
}
