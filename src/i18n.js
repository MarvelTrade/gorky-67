import { platform } from './platform/platform.js';

const STRINGS = {
  ru: {
    title: 'Туалетный воин',
    play: 'Играть',
    hint: 'Коснись в любом месте и тяни — вертолёт полетит',
    levelUp: 'Уровень',
    wave: 'Волна',
    lose: 'Сбит!',
    win: 'Выжил!',
    time: 'Время',
    kills: 'Убито',
    level: 'Уровень',
    best: 'Рекорд',
    newBest: 'Новый рекорд!',
    again: 'Ещё раз',
    boss: 'Зенитный комплекс',
    bossIncoming: 'Босс!',
    bossKilled: 'Босс уничтожен!',
    bossAlive: 'Босс остался цел',
    bossShort: 'босс',
    lvl: 'ур.',
    upg_damage: 'Калибр',
    upg_damage_desc: 'Урон пулемёта +25%',
    upg_fireRate: 'Скорострельность',
    upg_fireRate_desc: 'Пулемёт стреляет на 20% чаще',
    upg_speed: 'Форсаж',
    upg_speed_desc: 'Скорость полёта +10%',
    upg_magnet: 'Магнит',
    upg_magnet_desc: 'Кристаллы притягиваются издалека',
    upg_hp: 'Броня',
    upg_hp_desc: '+25 к прочности и ремонт на 25',
    upg_missile: 'Ракеты',
    upg_missile_desc: '+1 самонаводящаяся ракета в залпе',
  },
  en: {
    title: 'Toilet Warrior',
    play: 'Play',
    hint: 'Touch anywhere and drag to fly',
    levelUp: 'Level',
    wave: 'Wave',
    lose: 'Shot down!',
    win: 'Survived!',
    time: 'Time',
    kills: 'Kills',
    level: 'Level',
    best: 'Best',
    newBest: 'New record!',
    again: 'Play again',
    boss: 'AA Fortress',
    bossIncoming: 'Boss!',
    bossKilled: 'Boss destroyed!',
    bossAlive: 'The boss survived',
    bossShort: 'boss',
    lvl: 'lv.',
    upg_damage: 'Caliber',
    upg_damage_desc: 'Machine gun damage +25%',
    upg_fireRate: 'Fire rate',
    upg_fireRate_desc: 'Machine gun fires 20% faster',
    upg_speed: 'Afterburner',
    upg_speed_desc: 'Flight speed +10%',
    upg_magnet: 'Magnet',
    upg_magnet_desc: 'Crystals are pulled from farther away',
    upg_hp: 'Armor',
    upg_hp_desc: '+25 max HP and repair 25',
    upg_missile: 'Missiles',
    upg_missile_desc: '+1 homing missile per salvo',
  },
};

let lang = 'ru';

export function initLang() {
  lang = platform.getLang();
}

export function t(key) {
  return STRINGS[lang][key] ?? STRINGS.ru[key] ?? key;
}
