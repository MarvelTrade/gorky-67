import * as Phaser from 'phaser';
import { drawIcon } from '../ui/icons.js';
import { LEVELUP } from '../config.js';
import { t } from '../i18n/index.js';
import { onTap } from '../ui/tap.js';
import { sfx } from '../systems/Sfx.js';
import { CATEGORY } from '../systems/Upgrades.js';
import { FONT, PAPER, PAPER_HI, PAPER_DIM, EDGE, INK, INK_SOFT, LIGHT, CAT_INK } from '../ui/paper.js';

const PAD = 12;
const GAP = 8;
const CARD_MAX_W = 200;
const CARD_MAX_H = 210;
const IDS = Object.keys(CATEGORY);

// Пауза с выбором 1 из 3 улучшений поверх приостановленной GameScene.
// Три узкие карточки в ряд посередине экрана, игра видна сверху и снизу (как в DRG: Survivor).
// Окна сначала крутятся, как барабаны (Halls of Torment), и встают по очереди; потом — выбрать или перекрутить.
// data: { level, choices: [{ id, name, desc, level, max }], rerolls, onReroll() → choices | null, onPick(id) }
export class LevelUpScene extends Phaser.Scene {
  constructor() {
    super('LevelUpScene');
  }

  create(data) {
    this.data_ = data;
    this.picked = false;
    this.ready = false;
    this.rerolls = data.rerolls ?? 0;

    // Полоса затемнения за карточками посередине экрана — игра сверху и снизу видна
    this.band = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.6).setOrigin(0);
    this.casingRain();
    this.title = this.add
      .text(0, 0, `${t('levelUp')} ${data.level}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#f2c94c',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setLetterSpacing(2);

    this.cards = data.choices.map((c, i) => this.makeCard(c, i));
    this.rerollBtn = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '16px',
        color: LIGHT,
        fontStyle: 'bold',
        backgroundColor: '#3a4128',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    onTap(this.rerollBtn, () => this.ready && !this.picked, () => this.reroll());

    this.input.keyboard.on('keydown', (e) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < this.cards.length) this.pick(i);
      if (e.code === 'KeyR') this.reroll();
    });

    this.layout();
    this.spin();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  // Карточка — учётный бланк: бумага, цветная полоса и знак категории, машинописное название,
  // крупно «было → стало», мелко описание, уровень точками.
  // Категория — полосой, знаком и цветом «было → стало» (Ходент: различимость, «функция → форма»)
  makeCard(choice, index) {
    const card = this.add.container(0, 0);
    const shadow = this.add.rectangle(4, 4, 10, 10, 0x000000, 0.4);
    const bg = this.add.rectangle(0, 0, 10, 10, PAPER, 1).setStrokeStyle(1, EDGE);
    const deco = this.add.graphics(); // полоса категории сверху и номер графы
    const no = this.add.text(0, 0, `${index + 1}`, { fontFamily: FONT, fontSize: '11px', color: INK_SOFT }).setOrigin(0, 0);
    const icon = this.add.graphics();
    const name = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '17px', color: INK, fontStyle: 'bold' })
      .setOrigin(0.5, 0);
    const delta = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: INK, fontStyle: 'bold', align: 'center' })
      .setOrigin(0.5, 0);
    const desc = this.add
      .text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '12px', color: INK_SOFT, align: 'center' })
      .setOrigin(0.5, 0);
    const pips = this.add.graphics();
    card.add([shadow, bg, deco, no, icon, name, delta, desc, pips]);
    Object.assign(card, { shadow, bg, deco, no, icon, name, delta, desc, pips });
    this.setChoice(card, choice);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => this.ready && bg.setFillStyle(PAPER_HI, 1));
    bg.on('pointerout', () => this.ready && bg.setFillStyle(PAPER, 1));
    onTap(bg, () => this.ready && !this.picked, () => this.pick(index));
    return card;
  }

  setChoice(card, choice) {
    const cat = CAT_INK[choice.category] ?? CAT_INK.weapon;
    card.choice = choice;
    card.cat = cat;
    drawDeco(card, cat.color, 1);
    drawIcon(card.icon.clear(), choice.id, cat.color);
    card.name.setText(choice.name);
    card.delta.setText(choice.preview ?? '').setColor(cat.text);
    card.desc.setText(choice.desc);
  }

  // Барабаны: в окнах мелькают случайные улучшения, окна встают слева направо с глухим «тук».
  // Пока крутятся — выбрать нельзя; «было → стало», описание и уровень — когда окно встало
  spin() {
    const R = LEVELUP.reels;
    this.ready = false;
    this.spinning = this.cards.length;
    this.updateReroll();
    this.cards.forEach((card, i) => {
      for (const o of [card.delta, card.desc, card.pips]) o.setVisible(false);
      card.bg.setFillStyle(PAPER_DIM, 1); // пока крутится — лист темнее
      let last = null;
      const flick = this.time.addEvent({
        delay: R.tick * 1000,
        loop: true,
        callback: () => {
          // Не одно и то же дважды подряд — иначе кажется, что окно уже встало
          const id = Phaser.Utils.Array.GetRandom(IDS.filter((x) => x !== last));
          last = id;
          const cat = CAT_INK[CATEGORY[id]];
          drawIcon(card.icon.clear(), id, cat.color);
          drawDeco(card, cat.color, 0.5);
          card.name.setText(t(`upg_${id}`));
          this.fitCard(card);
          // Лента барабана едет сверху вниз: новая картинка въезжает сверху на место
          card.icon.y -= 16;
          card.name.y -= 16;
          this.tweens.add({ targets: [card.icon, card.name], y: '+=16', duration: R.tick * 900, ease: 'Sine.Out' });
          if (i === this.cards.length - 1) sfx.play('reelTick');
        },
      });
      this.time.delayedCall(R.stop[i] * 1000, () => {
        flick.remove();
        this.tweens.killTweensOf([card.icon, card.name]);
        this.setChoice(card, this.data_.choices[i]);
        for (const o of [card.delta, card.desc, card.pips]) o.setVisible(true);
        card.bg.setFillStyle(PAPER, 1);
        this.fitCard(card);
        this.tweens.add({ targets: card, scale: { from: 1.12, to: 1 }, duration: 220, ease: 'Back.Out' });
        sfx.play('reelStop');
        if (--this.spinning === 0) {
          this.time.delayedCall(LEVELUP.inputDelay * 1000, () => {
            this.ready = true;
            this.updateReroll();
          });
        }
      });
    });
  }

  reroll() {
    if (!this.ready || this.picked || this.rerolls <= 0) return;
    const next = this.data_.onReroll?.();
    if (!next || next.length === 0) return;
    this.rerolls--;
    this.data_.choices = next;
    // Улучшений осталось меньше трёх — лишние окна убираем
    while (this.cards.length > next.length) this.cards.pop().destroy();
    this.layout();
    this.spin();
  }

  updateReroll() {
    this.rerollBtn
      .setText(`↻ ${t('reroll')} (${this.rerolls})`)
      .setVisible(!!this.data_.onReroll)
      .setAlpha(this.ready && this.rerolls > 0 ? 1 : 0.4);
  }

  layout() {
    const { width, height } = this.scale;
    const n = this.cards.length;
    const cw = Math.min(CARD_MAX_W, (width - PAD * 2 - GAP * (n - 1)) / n);
    // По центру экрана (раньше — у нижнего края: палец тянулся далеко, взгляд уходил вниз)
    const ch = Math.min(CARD_MAX_H, Math.max(height * 0.3, Math.min(height * 0.48, 150)));
    const total = n * cw + (n - 1) * GAP;
    const titleH = 32;
    const btnH = 44;
    const top = Math.max(titleH + 14, (height - ch - btnH) / 2 + titleH / 2);

    this.band.setPosition(0, top - titleH - 8).setSize(width, ch + titleH + btnH + 24);
    this.title.setPosition(width / 2, top - 6);
    this.rerollBtn.setPosition(width / 2, top + ch + 10);

    this.cards.forEach((card, i) => {
      card.setPosition((width - total) / 2 + cw / 2 + i * (cw + GAP), top + ch / 2);
      card.bg.setSize(cw, ch).setOrigin(0.5);
      card.bg.input.hitArea.setSize(cw, ch);
      card.shadow.setSize(cw, ch).setOrigin(0.5);
      Object.assign(card, { cw, ch });
      card.no.setPosition(-cw / 2 + 5, -ch / 2 + 8);
      drawDeco(card, card.cat.color, card.delta.visible ? 1 : 0.5);
      this.fitCard(card);
    });
  }

  // Раскладка внутри карточки зависит от текста — пересчитываем после каждой смены
  fitCard(card) {
    const { cw, ch } = card;
    // Сверху вниз: иконка, название, «было → стало», описание, точки уровня
    const iconY = -ch / 2 + 22;
    card.icon.setPosition(0, iconY);

    // Название в одну строку: уменьшаем шрифт, пока не влезет
    let size = 17;
    card.name.setFontSize(size);
    // Машинка шире рубленого шрифта — разрешаем на кегль меньше
    while (card.name.width > cw - 8 && size > 9) card.name.setFontSize(--size);
    card.name.setY(iconY + 20);
    if (!card.delta.visible) return;

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
      else pg.lineStyle(1, EDGE, 1).strokeCircle(px, py, 3.5);
    }
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

// Полоса категории по верху бланка. alpha 0.5 — пока барабан крутится
function drawDeco(card, color, alpha) {
  const g = card.deco.clear();
  if (!card.cw) return;
  const { cw, ch } = card;
  g.fillStyle(color, alpha).fillRect(-cw / 2, -ch / 2, cw, 4);
  g.lineStyle(1, EDGE, 0.3).lineBetween(-cw / 2 + 4, ch / 2 - 17, cw / 2 - 4, ch / 2 - 17); // графа «уровень»
}
