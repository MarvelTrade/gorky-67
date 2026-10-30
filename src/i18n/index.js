import { platform } from '../platform/platform.js';
import ru from './ru.js';
import en from './en.js';

const STRINGS = { ru, en };

let lang = 'ru';

// override — язык, выбранный в настройках (иначе — платформы или браузера)
export function initLang(override = null) {
  lang = override ?? platform.getLang();
}

export function getLang() {
  return lang;
}

export function t(key) {
  return STRINGS[lang][key] ?? STRINGS.ru[key] ?? key;
}
