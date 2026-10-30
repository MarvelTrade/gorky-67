import * as Phaser from 'phaser';
import { LEVELUP } from '../config.js';
import { t } from '../i18n/index.js';
import { onTap } from '../ui/tap.js';
import { sfx } from '../systems/Sfx.js';

const PAD = 12;
const GAP = 8;
const CARD_MAX_W = 200;
const CARD_MAX_H = 210;

// Пауза с выбором 1 из 3 улучшений поверх приостановленной GameScene.
// Три узкие карточки в ряд внизу экрана, сверху видна игра (как в DRG: Survivor).
// data: { level, choices: [{ id, name, desc, level, max }], onPick(id) }
export class LevelUpScene extends Phaser.Scene {
  constructor() {
    super('LevelUpScene');
  }

  create(data) {
    this.data_ = data;
    this.picked = false;
    this.ready = false;
    this.time.delayedCall(LEVELUP.inputDelay * 1000, () => (this.ready = true));

    // Полоса затемнения за карточками посередине экрана — игра сверху и снизу видна
    this.band = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.6).setOrigin(0);
    this.casingRain();
    this.title = this.add
      .text(0, 0, `${t('levelUp')} ${data.level}`, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffe066',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1);

    this.cards = data.choices.map((c, i) => this.makeCard(c, i));

    this.input.keyboard.on('keydown', (e) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < this.cards.length) this.pick(i);
    });

    this.layout();
    // Карточки «выпрыгивают» по очереди — награда ощущается событием, а не всплывающим меню
    this.cards.forEach((card, i) => {
      card.setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: card, scale: 1, alpha: 1, delay: 80 + i * 90, duration: 260, ease: 'Back.Out' });
    });
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  // Карточка: рамка и иконка по категории, крупно «было → стало», мелко описание, уровень точками.
  // Три одинаковые зелёные карточки различались только текстом (Ходент: различимость, «функция → форма»)
  makeCard(choice, index) {
    const cat = LEVELUP.categories[choice.category] ?? LEVELUP.categories.weapon;
    const card = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 10, 10, LEVELUP.cardFill, 0.96).setStrokeStyle(3, cat.color);
    const icon = this.add.graphics();
    drawIcon(icon, choice.id, cat.color);
    const name = this.add
      .text(0, 0, choice.name, { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5, 0);
    const delta = this.add
      .text(0, 0, choice.preview ?? '', { fontFamily: 'sans-serif', fontSize: '14px', color: cat.text, fontStyle: 'bold', align: 'center' })
      .setOrigin(0.5, 0);
    const desc = this.add
      .text(0, 0, choice.desc, { fontFamily: 'sans-serif', fontSize: '12px', color: '#b8c0c8', align: 'center' })
      .setOrigin(0.5, 0);
    const pips = this.add.graphics();
    card.add([bg, icon, name, delta, desc, pips]);
    Object.assign(card, { bg, icon, name, delta, desc, pips, choice, cat });

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(LEVELUP.cardHover, 0.96));
    bg.on('pointerout', () => bg.setFillStyle(LEVELUP.cardFill, 0.96));
    onTap(bg, () => this.ready && !this.picked, () => this.pick(index));
    return card;
  }

  layout() {
    const { width, height } = this.scale;
    const n = this.cards.length;
    const cw = Math.min(CARD_MAX_W, (width - PAD * 2 - GAP * (n - 1)) / n);
    // По центру экрана (раньше — у нижнего края: палец тянулся далеко, взгляд уходил вниз)
    const ch = Math.min(CARD_MAX_H, Math.max(height * 0.3, Math.min(height * 0.48, 150)));
    const total = n * cw + (n - 1) * GAP;
    const titleH = 32;
    const top = Math.max(titleH + 14, (height - ch) / 2 + titleH / 2);

    this.band.setPosition(0, top - titleH - 8).setSize(width, ch + titleH + 20);
    this.title.setPosition(width / 2, top - 6);

    this.cards.forEach((card, i) => {
      card.setPosition((width - total) / 2 + cw / 2 + i * (cw + GAP), top + ch / 2);
      card.bg.setSize(cw, ch).setOrigin(0.5);
      card.bg.input.hitArea.setSize(cw, ch);

      // Сверху вниз: иконка, название, «было → стало», описание, точки уровня
      const iconY = -ch / 2 + 22;
      card.icon.setPosition(0, iconY);

      // Название в одну строку: уменьшаем шрифт, пока не влезет
      let size = 17;
      card.name.setFontSize(size);
      while (card.name.width > cw - 10 && size > 10) card.name.setFontSize(--size);
      card.name.setY(iconY + 20);

      size = 14;
      card.delta.setFontSize(size).setWordWrapWidth(cw - 10);
      while (card.delta.height > 40 && size > 10) card.delta.setFontSize(--size);
      card.delta.setY(card.name.y + card.name.height + 4);

      // Описание — по ширине карточки; если не влезает по высоте, шрифт меньше
      const top0 = card.delta.y + card.delta.height + 4;
      const room = ch / 2 - 18 - top0;
      size = cw < 130 ? 11 : 12;
      card.desc.setFontSize(size).setWordWrapWidth(cw - 12);
      while (card.desc.height > room && size > 8) card.desc.setFontSize(--size);
      card.desc.setY(top0).setVisible(card.desc.height <= room + 2);

      // Уровень точками: закрашено — взято, обведённая — эта карточка
      const { level, max } = card.choice;
      const pg = card.pips.clear();
      const step = Math.min(14, (cw - 20) / max);
      for (let k = 0; k < max; k++) {
        const px = (k - (max - 1) / 2) * step;
        const py = ch / 2 - 11;
        if (k < level - 1) pg.fillStyle(card.cat.color, 1).fillCircle(px, py, 4);
        else if (k === level - 1) pg.lineStyle(2, card.cat.color, 1).strokeCircle(px, py, 4).fillStyle(card.cat.color, 0.45).fillCircle(px, py, 4);
        else pg.lineStyle(1, 0x6c7680, 1).strokeCircle(px, py, 3.5);
      }
    });
  }

  // Дождь гильз сверху на весь экран, как монеты из сундука в Vampire Survivors: короткий, за карточками
  casingRain() {
    if (!this.textures.exists('casing')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xd9a441).fillRect(0, 2, 5, 10);  // латунная гильза
      g.fillStyle(0xf2cf7a).fillRect(1, 2, 1, 10);  // блик
      g.fillStyle(0x8a6420).fillRect(0, 11, 5, 2);  // донце
      g.fillStyle(0xb98a34).fillRect(1, 0, 3, 2);   // дульце
      g.generateTexture('casing', 5, 13);
      g.destroy();
    }
    const { width } = this.scale;
    const C = LEVELUP.casings;
    const rain = this.add.particles(0, 0, 'casing', {
      x: { min: 0, max: width },
      y: -16,
      speedY: { min: 260, max: 520 },
      speedX: { min: -60, max: 60 },
      gravityY: 900,
      rotate: { start: 0, end: 720 },
      scale: { min: 1.1, max: 1.6 },
      lifespan: 1600,
      frequency: C.every,
      quantity: C.perTick,
      emitting: true,
    });
    this.time.delayedCall(C.duration * 1000, () => rain.stop());
    sfx.play('pickup');
  }

  pick(index) {
    if (!this.ready || this.picked) return;
    this.picked = true;
    const { choices, onPick } = this.data_;
    this.scene.stop();
    onPick(choices[index].id);
  }
}

// Простые иконки-знаки в круге 16 px, цвет — категории. Узнаются без чтения
function drawIcon(g, id, color) {
  g.fillStyle(0x000000, 0.35).fillCircle(0, 0, 17);
  g.lineStyle(2, color, 1).strokeCircle(0, 0, 17);
  g.fillStyle(color, 1);
  g.lineStyle(2.5, color, 1);
  switch (id) {
    case 'damage': // патрон
      g.fillRect(-3, -7, 6, 12);
      g.fillTriangle(-3, -7, 3, -7, 0, -12);
      g.fillRect(-4, 6, 8, 3);
      break;
    case 'fireRate': // очередь — три пули
      for (const x of [-7, 0, 7]) g.fillRect(x - 1.5, -8 + Math.abs(x) * 0.6, 3, 9);
      break;
    case 'missile': // ракета
      g.fillRect(-2.5, -6, 5, 12);
      g.fillTriangle(-2.5, -6, 2.5, -6, 0, -12);
      g.fillTriangle(-2.5, 6, -7, 10, -2.5, 2);
      g.fillTriangle(2.5, 6, 7, 10, 2.5, 2);
      break;
    case 'hp': // щит
      g.fillPoints([{ x: -9, y: -9 }, { x: 9, y: -9 }, { x: 8, y: 2 }, { x: 0, y: 11 }, { x: -8, y: 2 }], true);
      break;
    case 'flares': // разлёт ловушек
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        g.lineBetween(Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * 11, Math.sin(a) * 11);
      }
      g.fillCircle(0, 0, 3);
      break;
    case 'speed': // шевроны
      for (const x of [-5, 3]) g.strokePoints([{ x: x - 3, y: -7 }, { x: x + 4, y: 0 }, { x: x - 3, y: 7 }]);
      break;
    case 'magnet': // подкова
      g.beginPath();
      g.arc(0, 0, 8, 0, Math.PI, false);
      g.strokePath();
      g.lineBetween(-8, 0, -8, -9);
      g.lineBetween(8, 0, 8, -9);
      break;
  }
}
