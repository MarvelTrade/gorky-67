import { platform } from './platform/platform.js';

const STRINGS = {
  ru: {
    title: 'Туалетный воин',
    play: 'Играть',
    hint: 'Веди пальцем — вертолёт летит следом',
  },
  en: {
    title: 'Toilet Warrior',
    play: 'Play',
    hint: 'Drag your finger — the chopper follows',
  },
};

let lang = 'ru';

export function initLang() {
  lang = platform.getLang();
}

export function t(key) {
  return STRINGS[lang][key] ?? STRINGS.ru[key] ?? key;
}
