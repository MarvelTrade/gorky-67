import * as Phaser from 'phaser';
import { BRIEFING } from '../config.js';
import { t } from '../i18n/index.js';
import { lt, setLevel } from '../levels.js';
import { liveryTexture } from '../meta.js';
import { makeArmyTextures } from '../art/army.js';
import { FONT, INK, INK_SOFT, makeSheet, drawSheet, makeStamp } from '../ui/paper.js';

// Радиосообщение перед забегом поверх полёта: внизу плывут леса и поля, «Сокол» летит над ними;
// со второго уровня — вдоль железной дороги, рядом идёт эшелон, вертолёт держится за ним.
// Текст «печатается»; первый тап допечатывает сразу, следующий — запускает забег.
export class BriefingScene extends Phaser.Scene {
  constructor() {
    super('BriefingScene');
  }

  create() {
    const lv = setLevel(this.registry.get('level') ?? 1); // радиосообщение — своё у каждого уровня
    this.full = lt('telegram');
    this.makeFlight(lv.n);
    this.shown = 0;
    this.ready = false;
    this.time.delayedCall(BRIEFING.inputDelay * 1000, () => (this.ready = true));

    // Бланк телеграммы — тот же лист, что в меню: тень, красная черта под шапкой, линовка
    this.sheet = makeSheet(this);
    this.header = this.add
      .text(0, 0, t('telegramHeader'), { fontFamily: FONT, fontSize: '14px', color: INK_SOFT, fontStyle: 'bold' })
      .setOrigin(0, 0)
      .setLetterSpacing(2);
    this.number = this.add
      .text(0, 0, t('telegramNo'), { fontFamily: FONT, fontSize: '12px', color: INK_SOFT })
      .setOrigin(0, 0);
    // Штамп «СЕКРЕТНО» — как на карточке меню
    this.stamp = makeStamp(this, t('telegramStamp'), 16, undefined, -6);
    this.bodyText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '16px', color: INK, lineSpacing: 6 })
      .setOrigin(0, 0);
    this.hint = this.add
      .text(0, 0, t('tapToContinue'), { fontFamily: 'sans-serif', fontSize: '15px', color: '#9fb08f' })
      .setOrigin(0.5)
      .setVisible(false);
    this.tweens.add({ targets: this.hint, alpha: { from: 0.35, to: 1 }, duration: 700, yoyo: true, repeat: -1 });

    this.input.on('pointerup', () => this.advance());
    this.input.keyboard.on('keydown-ENTER', () => this.advance());
    this.input.keyboard.on('keydown-SPACE', () => this.advance());

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  // Полёт под сообщением: квадраты местности из текстур кварталов (без домов — только земля),
  // по второму уровню — ещё рельсы и эшелон. Создаётся один раз, едет в update
  makeFlight(n) {
    makeArmyTextures(this); // вагоны эшелона рисует GameScene; сюда можно попасть раньше первого забега
    const kinds = n >= 3 ? [46, 43, 35, 36, 46, 32] : [35, 36, 32, 33, 35, 34, 36];
    this.flight = this.add.container(0, 0);
    this.tileSize = 200;
    this.tiles = [];
    this.kinds = kinds;
    this.rail = n >= 2 ? [] : null;
    this.cars = [];
    this.heli = this.add.image(0, 0, liveryTexture(this)).setScale(1.4).setAngle(-90);
    this.heliShadow = this.add.image(0, 0, liveryTexture(this)).setScale(1.4).setAngle(-90).setTint(0x000000).setAlpha(0.35);
    this.rotor = this.add.image(0, 0, 'rotor').setScale(1.4);
    if (n >= 2) {
      // Эшелон носом на север: тепловоз, вагон с пушкой, платформы с контейнерами
      const keys = ['loco', 'gunwagon', ...Array.from({ length: 6 }, (_, i) => (i < n ? `flatcarBox${i % 3}` : 'flatcar'))];
      this.cars = keys.map((k) => this.add.image(0, 0, k).setFlipY(true).setScale(1.4));
    }
    this.shade = this.add.rectangle(0, 0, 10, 10, 0x0a0e08, 0.45).setOrigin(0);
    this.scroll = 0;
  }

  // Раскладка полёта под размер экрана: сетка квадратов чуть больше экрана, рельсы правее центра
  layoutFlight(width, height, railX) {
    const s = this.tileSize;
    const cols = Math.ceil(width / s) + 1;
    const rows = Math.ceil(height / s) + 2;
    for (const im of this.tiles) im.destroy();
    this.tiles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = this.kinds[(r * 3 + c * 5) % this.kinds.length];
        const im = this.add.image(c * s + s / 2, r * s, `city${k}`).setDisplaySize(s, s).setAngle(((r + c) % 4) * 90);
        this.flight.add(im);
        this.tiles.push(im);
      }
    }
    this.rows = rows;
    if (this.rail) {
      for (const im of this.rail) im.destroy();
      this.railX = railX;
      this.rail = [];
      for (let r = 0; r < rows; r++) {
        const im = this.add.image(this.railX, r * s, 'railway').setDisplaySize(44 * (s / 400) * 2, s);
        this.flight.add(im);
        this.rail.push(im);
      }
    }
    this.children.sendToBack(this.flight);
    this.shade.setSize(width, height);
    // Вертолёт и эшелон — над тёмной вуалью: их видно, текст сообщения читается
    for (const o of [this.heliShadow, ...this.cars, this.heli, this.rotor]) this.children.bringToTop(o);
    this.children.moveBelow(this.shade, this.heliShadow);
  }

  layout() {
    const { width, height } = this.scale;
    const cw = Math.min(560, width - 32);
    const pad = 18;
    // На узком экране шрифт чуть меньше, чтобы телеграмма влезла без прокрутки
    this.bodyText.setFontSize(width < 420 ? 14 : 16);
    this.bodyText.setWordWrapWidth(cw - pad * 2);
    // Высоту считаем по полному тексту, чтобы карточка не росла во время печати
    const typed = this.bodyText.text;
    this.bodyText.setText(this.full);
    const bodyH = this.bodyText.height;
    this.bodyText.setText(typed);

    const ch = bodyH + 70;
    const cx = width / 2;
    const cy = height * 0.45;
    const left = cx - cw / 2;
    const top = cy - ch / 2;
    drawSheet(this.sheet, left, top, cw, ch, { header: 38, rule: this.bodyText.style.fontSize === '14px' ? 23 : 25 });
    this.header.setPosition(left + pad, top + 10);
    // Номер — под шапкой мелко; штамп справа, центр штампа — где был правый верхний угол
    this.number.setPosition(left + pad + this.header.width + 12, top + 12);
    this.stamp.setPosition(left + cw - pad - this.stamp.label.width / 2, top + 10 + this.stamp.label.height / 2);
    this.bodyText.setPosition(left + pad, top + 48);
    this.hint.setPosition(cx, top + ch + 34);
    // Рельсы — справа от карточки, если там есть место (экран лёжа), иначе правее центра: поезд виден над ней
    const right = left + cw;
    const sideRoom = width - right > 110;
    this.layoutFlight(width, height, Math.round(sideRoom ? (right + width) / 2 + 20 : width * 0.74));
    // Вертолёт — рядом с эшелоном (или над карточкой на первом уровне)
    const roomAbove = top > 120;
    if (sideRoom) {
      this.heliPos = { x: this.rail ? this.railX - 64 : (right + width) / 2, y: height * 0.32 };
      this.trainY = height * 0.18;
    } else {
      this.heliPos = { x: this.rail ? this.railX - 64 : cx, y: roomAbove ? top / 2 + 6 : 50 };
      this.trainY = roomAbove ? Math.max(10, top / 2 - 60) : 10;
    }
    for (const o of [...this.sheet.parts, this.header, this.number, this.stamp, this.bodyText, this.hint]) this.children.bringToTop(o);
  }

  update(time, delta) {
    // Земля плывёт вниз — летим на север; квадраты, ушедшие за низ, переезжают наверх
    const s = this.tileSize;
    this.scroll = (this.scroll + delta * 0.06) % s;
    const span = this.rows * s;
    for (const im of [...this.tiles, ...(this.rail ?? [])]) {
      im.y += delta * 0.06;
      if (im.y > span - s / 2) im.y -= span;
    }
    const tt = time / 1000;
    const hp = this.heliPos;
    if (hp) {
      this.heli.setPosition(hp.x + Math.sin(tt * 0.8) * 6, hp.y + Math.sin(tt * 1.3) * 4);
      this.heliShadow.setPosition(this.heli.x + 26, this.heli.y + 34);
      this.rotor.setPosition(this.heli.x, this.heli.y).setRotation(tt * 22);
      // Эшелон рядом с вертолётом — идёт с ним вровень, чуть покачиваясь
      let y = this.trainY;
      for (const c of this.cars) {
        c.setPosition(this.railX, y + Math.sin(tt * 2) * 1.5);
        y += c.displayHeight + 4;
      }
    }
    if (this.shown >= this.full.length) return;
    this.shown = Math.min(this.full.length, this.shown + (BRIEFING.typeSpeed * delta) / 1000);
    this.bodyText.setText(this.full.slice(0, Math.floor(this.shown)));
    if (this.shown >= this.full.length) this.hint.setVisible(true);
  }

  advance() {
    if (!this.ready) return;
    if (this.shown < this.full.length) {
      this.shown = this.full.length;
      this.bodyText.setText(this.full);
      this.hint.setVisible(true);
      return;
    }
    this.ready = false;
    this.scene.start('GameScene');
  }
}
