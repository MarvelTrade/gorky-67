import { platform } from '../platform/platform.js';
import ru from './ru.js';
import en from './en.js';

const STRINGS = { ru, en };

let lang = 'ru';

export function initLang() {
  lang = platform.getLang();
}

export function t(key) {
  return STRINGS[lang][key] ?? STRINGS.ru[key] ?? key;
}
