import { platform } from './platform/platform.js';

const STRINGS = {
  ru: {
    title: 'Туалетный воин',
    play: 'Играть',
    hint: 'Веди пальцем — вертолёт летит следом',
    levelUp: 'Уровень',
    wave: 'Волна',
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
    hint: 'Drag your finger — the chopper follows',
    levelUp: 'Level',
    wave: 'Wave',
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
