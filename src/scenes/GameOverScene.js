import * as Phaser from 'phaser';
import { RUN, TESTER_BUILD } from '../config.js';
import { formatTime } from '../format.js';
import { t } from '../i18n/index.js';
import { lt } from '../levels.js';
import { platform } from '../platform/platform.js';
import { copyReport } from '../systems/Telemetry.js';
import { onTap } from '../ui/tap.js';
import { KeyNav } from '../ui/keyNav.js';
import { metaSnapshot } from '../meta.js';
import {
  FONT, INK, INK_SOFT, RED, RED_CSS, GREEN_INK, BTN, makeSheet, drawSheet, makeStamp,
} from '../ui/paper.js';

// Итоги забега и «Ещё раз». data: { win, time, kills, level }
// Оформление — акт о вылете: лист с грифом, исход — штампом (выжил — зелёный, сбит / не успел — красный),
// цифры машинкой. Кнопки — как в меню

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(stats) {
    this.ready = false;
    this.time.delayedCall(RUN.gameOverInputDelay * 1000, () => (this.ready = true));

    const sheet = makeSheet(this);
    const header = this.add.text(0, 0, t('reportHeader'), { fontFamily: FONT, fontSize: '11px', color: INK_SOFT }).setOrigin(0, 0);
    const caseNo = this.add.text(0, 0, t('reportCase'), { fontFamily: FONT, fontSize: '11px', color: INK_SOFT }).setOrigin(1, 0);
    const divider = this.add.graphics(); // лёжа — черта между колонками акта
    // Исход — штампом поперёк акта; title — надпись штампа (её высоту берёт раскладка)
    const word = t(stats.win ? 'win' : stats.ending === 'nuke' ? 'loseNuke' : 'lose').toUpperCase();
    const titleBox = makeStamp(this, word, 40, stats.win ? GREEN_INK : RED, -4);
    const title = titleBox.label;

    // Концовка: исход забега. Ушли — награда уровня и вечный вопрос экипажа про премию; нет — «Черёмуха» зовёт
    const head = lt(`ending_${stats.ending}`);
    const medal = t(`medal_${stats.levelN}`);
    const award = medal !== `medal_${stats.levelN}` ? `\n${t('medalGot')}: ${medal}` : '';
    const endText = stats.win
      ? `${head}${award}\n\n${t('radioCallsign_vova')}: «${t('bonusAsk')}»\n${t('radioCallsign_cheryomukha')}: «${t('bonusAnswer')}»`
      : `${head}\n\n${t('radioCallsign_cheryomukha')}: «${t('cher_end_lose')}»`;
    const ending = this.add
      .text(0, 0, endText, {
        fontFamily: FONT,
        fontSize: '17px',
        color: INK,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    // Проигрыш: что сбило и когда — «танк (снаряд)», «провода», «свой обстрел»
    const causeLine = !stats.win && stats.cause ? `${t('downedAt')} ${formatTime(stats.time)}: ${causeText(stats.cause)}` : null;
    const lines = [
      `${t('time')}: ${formatTime(stats.time)}`,
      `${t('kills')}: ${stats.kills}`,
      `${t('level')}: ${stats.level}`,
    ];
    if (stats.ruined) lines.push(`${t('ruinedHouses')}: ${stats.ruined}`);
    if (stats.weapons?.length) lines.push(stats.weapons.join(' · '));
    if (stats.money || stats.parts) lines.push(`${t('loot')}: +${stats.money} ₽ · +${stats.parts} ⚙`);
    if (stats.xp) lines.push(`${t('heliXp')}: +${stats.xp}`);
    if (stats.convoy) lines.push(`${t('convoyResult')}: ${stats.convoy.saved} / ${stats.convoy.total}`);
    if (stats.milcrates) lines.push(`${t('milcrate')}: ${stats.milcrates}${stats.badges ? ` · ${t('badges')}: +${stats.badges}` : ''}`);
    if (stats.unlocked) lines.push(`${t('levelUnlocked')}: ${stats.unlocked} · ${t(`lvl_name_${stats.unlocked}`)}`);
    // Новый уровень вертолёта — отдельной строкой под цифрами, рядом с «Объектом»
    const heliUp = stats.levelUp ? `${t('heliLevelUp')} ${stats.levelUp}!` : null;
    const bossLine = stats.bossSeen ? t(stats.bossKilled ? 'bossKilled' : 'bossAlive') : null;
    const statsText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: INK,
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);

    const bestText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '20px', color: INK_SOFT })
      .setOrigin(0.5, 0);
    this.updateRecord(stats, bestText);

    const button = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 240, 72, BTN.main.fill).setStrokeStyle(3, BTN.main.stroke);
    const label = this.add
      .text(0, 0, t('again'), { fontFamily: 'sans-serif', fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    button.add([bg, label]);
    bg.setInteractive({ useHandCursor: true });
    onTap(bg, () => this.ready, () => this.restart());

    // «Ангар» — потратить добычу между забегами
    const hangar = this.add
      // Свой фон — читается и на тёмном, и на листе акта (лёжа кнопки лежат на нём)
      .text(0, 0, `${t('hangar')} →`, { fontFamily: 'sans-serif', fontSize: '20px', color: '#f2c94c', fontStyle: 'bold', backgroundColor: '#3a4148', padding: { x: 12, y: 8 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const goHangar = () => this.scene.start('HangarScene', { from: 'GameOverScene' });
    onTap(hangar, () => this.ready, goHangar);

    // Для плейтестов: все замеры текстом в буфер обмена. В сборке для Яндекса кнопки нет —
    // игрокам каталога она ни к чему (рекомендация 6.7)
    const copy = this.add
      .text(0, 0, t('copyStats'), {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#c8d0d8',
        backgroundColor: '#3a4148',
        padding: { x: 10, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    copy.setVisible(TESTER_BUILD);
    const copyStats = async () => {
      const ok = await copyReport();
      copy.setText(t(ok ? 'copied' : 'copyFailed'));
      this.time.delayedCall(1500, () => copy.setText(t('copyStats')));
    };
    onTap(copy, () => this.ready, copyStats);

    // Кнопки появляются, когда их уже можно нажать
    button.setAlpha(0);
    copy.setAlpha(0);
    hangar.setAlpha(0);
    this.tweens.add({ targets: [button, copy, hangar], alpha: 1, delay: RUN.gameOverInputDelay * 1000, duration: 200 });

    // Сверху вниз: заголовок, концовка, цифры, рекорд, кнопка.
    // На низком экране (телефон лёжа) цифры в одну строку, иначе кнопка не влезает.
    const layout = () => {
      const { width, height } = this.scale;
      // Сколько займёт акт в один столбик крупным шрифтом: строк в итогах всё больше
      // (ящики, колонна, открытый уровень) — не влезает, значит раскладка плотнее
      statsText.setText([causeLine, lines.join('\n'), bossLine, heliUp].filter(Boolean).join('\n'));
      statsText.setFontSize(22).setLineSpacing(8);
      ending.setFontSize(17).setWordWrapWidth(Math.min(480, Math.min(520, width - 16) - 24));
      const tallH = height * 0.12 + title.height + 12 + ending.height + 32 + statsText.height + 12 + bestText.height + 48 + 130;
      const short = height < 500 || tallH > height;
      // Телефон лёжа: всё в один столбик не влезало — кнопка «Ещё раз» ложилась на цифры.
      // Две колонки: заголовок и концовка слева, цифры, рекорд и кнопки — справа
      const wide = short && width >= 640;
      const sep = short && !wide ? '  ·  ' : '\n';
      // В одну строку через точки — пробелы внутри пункта неразрывные: перенос только между пунктами
      const items = sep === '\n' ? lines : lines.map((l) => l.replace(/ /g, ' '));
      statsText.setText([causeLine, items.join(sep), bossLine, heliUp].filter(Boolean).join('\n'));
      statsText.setFontSize(wide ? 15 : short ? 18 : 22).setLineSpacing(wide ? 2 : 8);
      ending.setFontSize(wide ? 14 : 17);
      bestText.setFontSize(wide ? 14 : 20);

      if (wide) {
        const lw = width * 0.44;
        const lx = lw / 2 + 12;
        const rx = lw + 12 + (width - lw - 12) / 2;
        statsText.setWordWrapWidth(width - lw - 40);
        ending.setWordWrapWidth(lw - 16);
        const leftH = title.height + 10 + ending.height;
        let y = Math.max(8, (height - leftH) / 2);
        titleBox.setPosition(lx, y + title.height / 2);
        ending.setPosition(lx, y + title.height + 10);
        // Лёжа акт — на весь экран, две колонки через черту; гриф — если над штампом есть место
        drawSheet(sheet, 6, 4, width - 12, height - 8, { header: 0, rule: 0 });
        header.setVisible(y >= 30).setPosition(16, 9);
        caseNo.setVisible(false);
        divider.clear().lineStyle(1, RED, 0.35).lineBetween(lw + 12, 14, lw + 12, height - 14);
        y = 10;
        statsText.setPosition(rx, y);
        y += statsText.height + 4;
        bestText.setPosition(rx, y);
        y += bestText.height + 8;
        // Кнопка — целиком под строкой рекорда (половина высоты кнопки — 36 px); места мало — кнопка ниже ростом
        const room = height - 60 - y; // до «Ангара» и «Скопировать» снизу
        const bh = Phaser.Math.Clamp(room - 8, 44, 72);
        button.setScale(1, bh / 72);
        button.list[1]?.setScale(1, 72 / bh); // надпись не сплющивается
        const by = y + bh / 2 + 2;
        button.setPosition(rx, by);
        hangar.setPosition(rx, by + bh / 2 + 16);
        copy.setPosition(rx, hangar.y + 30);
        return;
      }

      const sw = Math.min(520, width - 16);
      statsText.setWordWrapWidth(sw - 24);
      ending.setWordWrapWidth(Math.min(480, sw - 24));
      let y = height * (short ? 0.06 : 0.12);
      const sTop = y >= 36 ? y - 34 : Math.max(2, y - 10);
      titleBox.setPosition(width / 2, y + title.height / 2);
      y += title.height + 12;
      ending.setPosition(width / 2, y);
      y += ending.height + (short ? 16 : 32);
      statsText.setPosition(width / 2, y);
      y += statsText.height + 12;
      bestText.setPosition(width / 2, y);
      y += bestText.height + (short ? 20 : 48);
      const by = Math.min(y + 36, height - (short ? 104 : 130));
      // Акт — от грифа до рекорда; кнопки под ним, на тёмном, как в меню
      const sBottom = Math.min(bestText.y + bestText.height + 12, by - 36 - 8);
      drawSheet(sheet, (width - sw) / 2, sTop, sw, sBottom - sTop, { header: y >= 36 ? 20 : 0, rule: 0 });
      header.setVisible(y >= 36).setPosition((width - sw) / 2 + 10, sTop + 5);
      caseNo.setVisible(y >= 36).setPosition((width + sw) / 2 - 10, sTop + 5);
      divider.clear();
      button.setPosition(width / 2, by);
      hangar.setPosition(width / 2, by + 36 + (short ? 18 : 26));
      copy.setPosition(width / 2, hangar.y + (short ? 34 : 40));
    };
    // Клавиатура: стрелки/WASD — «Ещё раз», «Ангар», «Скопировать»; Enter или пробел — нажать.
    // По умолчанию выбрано «Ещё раз» — как раньше, Enter сразу в новый забег
    this.nav = new KeyNav(this, () => this.ready);
    this.nav.setItems([
      { obj: button, activate: () => this.restart() },
      { obj: hangar, activate: goHangar },
      ...(copy.visible ? [{ obj: copy, activate: copyStats }] : []),
    ]);
    // Рамка выбора проявляется вместе с кнопками, а не висит над пустым местом
    this.nav.ring.setAlpha(0);
    this.tweens.add({ targets: this.nav.ring, alpha: 1, delay: RUN.gameOverInputDelay * 1000, duration: 200 });
    // Рекорд приходит позже — лист подгоняется под его строку; рамка выбора — следом за кнопками
    this.layoutFn = () => {
      layout();
      this.nav.refresh();
    };
    this.layoutFn();
    this.scale.on('resize', this.layoutFn);
    this.events.once('shutdown', () => this.scale.off('resize', this.layoutFn));
  }

  async updateRecord(stats, text) {
    const save = await platform.loadProgress();
    const best = save.best;
    const run = { time: stats.time, kills: stats.kills, boss: stats.bossKilled };
    // Кошелёк и рекорд — одной записью (добыча уже в meta, её добавил GameScene.endRun)
    if (!best || isBetter(run, best)) {
      await platform.saveProgress({ ...save, best: run, meta: metaSnapshot() });
      // Пока ждали сохранения, игрок мог уже нажать «Ещё раз» — экрана больше нет
      if (!text.scene) return;
      text.setText(t('newBest')).setColor(RED_CSS);
      this.layoutFn?.();
    } else {
      await platform.saveProgress({ ...save, meta: metaSnapshot() });
      if (!text.scene) return;
      const boss = best.boss ? ` · ${t('bossShort')}` : '';
      text.setText(`${t('best')}: ${formatTime(best.time)} · ${best.kills}${boss}`);
      this.layoutFn?.();
    }
  }

  async restart() {
    if (!this.ready) return;
    this.ready = false;
    // Сейчас заглушка; на Яндекс Играх тут будет межстраничная реклама
    await platform.showFullscreenAd();
    this.scene.start('GameScene');
  }
}

// Убил босса — лучше, чем не убил; среди убивших — кто быстрее,
// среди остальных — кто дольше продержался; при равенстве — больше убитых.
function isBetter(a, b) {
  if (!!a.boss !== !!b.boss) return !!a.boss;
  if (a.time !== b.time) return a.boss ? a.time < b.time : a.time > b.time;
  return a.kills > b.kills;
}

// cause — «тип» или «тип:shell» (как в замерах)
function causeText(cause) {
  const [type, how] = cause.split(':');
  return t(`enemy_${type}`) + (how ? ` (${t('byShell')})` : '');
}
