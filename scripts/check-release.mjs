// Предрелизная проверка GORKY-67 (скил /release-check): тексты, запретные слова, архив для Яндекса.
//   npm run check:release          — всё, включая сборку архива
//   npm run check:release -- --no-build — только тексты (быстро)
// Ошибки — код выхода 1; предупреждения — посмотреть глазами, решает человек.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import ru from '../src/i18n/ru.js';
import en from '../src/i18n/en.js';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const errors = [];
const warnings = [];

// Исходники игры без текстов
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'i18n' ? [] : walk(p);
    return p.endsWith('.js') ? [p] : [];
  });
}
const files = walk(join(ROOT, 'src'));
const code = files.map((f) => readFileSync(f, 'utf8')).join('\n');

// 1. Одинаковые ключи в ru и en
const ruKeys = Object.keys(ru);
const enKeys = Object.keys(en);
for (const k of ruKeys) if (!(k in en)) errors.push(`Нет в en.js: ${k}`);
for (const k of enKeys) if (!(k in ru)) errors.push(`Нет в ru.js: ${k}`);

// 2. Ключи из кода есть в текстах: t('…') и lt('…')
for (const [, k] of code.matchAll(/\bl?t\('([a-zA-Z0-9_]+)'\)/g)) {
  if (!(k in ru)) errors.push(`Код зовёт t('${k}'), а такого ключа нет`);
}

// 3. Неиспользуемые ключи. Часть собирается в коде шаблоном — t(`enemy_${type}`), lt(`ending_${…}`):
// такие префиксы считаем использованными; у уровней свой префикс l2_, l3_ поверх общего ключа
const prefixes = [...code.matchAll(/\bl?t\(`([a-zA-Z0-9_]*)\$\{/g)].map((m) => m[1]).filter(Boolean);
const words = new Set(code.match(/[a-zA-Z0-9_]+/g));
// Ключ из двух переменных — t(`${key}_${id}_desc`) в «Ангаре»: считаем использованным, если обе части есть в коде
const twoPart = /\bl?t\(`\$\{[^}]+\}_\$\{/.test(code);
const fromParts = (k) => {
  const [a, ...rest] = k.replace(/_desc$/, '').split('_');
  return twoPart && rest.length > 0 && words.has(a) && words.has(rest.join('_'));
};
const used = (k) => words.has(k) || prefixes.some((p) => k.startsWith(p)) || fromParts(k);
for (const k of ruKeys) {
  const base = k.replace(/^l\d+_/, '');
  if (!used(k) && !used(base)) warnings.push(`Ключ не используется: ${k}`);
}

// 4. Запретное в текстах (требования Яндекс Игр, docs/story.md «Чего нельзя»)
const FORBIDDEN = [
  [/не готов|скоро будет|в разработке|coming soon|not ready|under construction|\bTODO\b|\bWIP\b/i, 'незавершённость (отклоняют за «скоро будет»)'],
  [/войн|\bwar\b|ополчен|ядерн|nuclear|атомн/i, 'политика и войны (3.4.4)'],
  [/лагер|\bcamp\b|правительств|government|президент|president/i, 'политика (3.4.4)'],
  [/церк|храм|колокол|church|temple|chapel|\bbell/i, 'религия (3.4.5)'],
  [/красн\S* крест|red cross/i, 'эмблема Красного Креста'],
  [/любовниц|mistress/i, 'возраст 8.3.6'],
];
for (const [lang, dict] of [['ru', ru], ['en', en]]) {
  for (const [k, v] of Object.entries(dict)) {
    if (typeof v !== 'string') continue;
    for (const [re, why] of FORBIDDEN) if (re.test(v)) warnings.push(`${lang}.${k}: ${why} — «${v.slice(0, 80)}»`);
  }
}

// 5. Надписи прямо в коде, мимо переводов: this.add.text(x, y, 'HELICOPTER SURVIVAL') — в русской версии
// останется английский (так и было с подзаголовком меню)
for (const f of files) {
  for (const [, s] of readFileSync(f, 'utf8').matchAll(/\.text\([^,()]+,[^,()]+,\s*'([^']*[A-Za-zА-Яа-яЁё]{3,}[^']*)'/g)) {
    warnings.push(`${relative(ROOT, f)}: надпись в коде мимо t() — «${s}»`);
  }
}

// 6. Архив для Яндекса: собирается, без бота и инструментов разработки
if (!process.argv.includes('--no-build')) {
  try {
    execSync('sh scripts/build-yandex.sh', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    errors.push(`Архив для Яндекса не собрался: ${String(e.stderr || e.message).trim().slice(0, 300)}`);
  }
  const out = join(ROOT, 'dist-yandex');
  if (existsSync(out)) {
    const js = walk(out).map((f) => readFileSync(f, 'utf8')).join('\n');
    for (const s of ['__startBot', '__botLevel', '__game']) if (js.includes(s)) errors.push(`В архиве для Яндекса есть ${s} — утекли инструменты разработки`);
    // SDK грузится из кода по относительному пути /sdk.js (src/platform/platform.js)
    if (!js.includes('/sdk.js')) errors.push('В архиве не подключается SDK Яндекса (/sdk.js)');
    const kb = Math.round(statSync(join(ROOT, 'build/gorky-67-yandex.zip')).size / 1024);
    console.log(`Архив: build/gorky-67-yandex.zip, ${kb} КБ`);
  }
}

for (const w of warnings) console.log(`  [?] ${w}`);
for (const e of errors) console.log(`  [!] ${e}`);
console.log(`\nОшибок: ${errors.length}, на проверку глазами: ${warnings.length} (файлов кода: ${files.length}, ключей: ${ruKeys.length})`);
process.exit(errors.length ? 1 : 0);
