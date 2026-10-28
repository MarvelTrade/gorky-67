import { TELEMETRY } from '../config.js';
import { formatTime } from '../format.js';
import { t } from '../i18n/index.js';

// Замеры для плейтестов: каждый забег пишется в localStorage,
// на экране итогов их можно скопировать текстом и прислать разработчику.
const KEY = 'gorky-67-telemetry';

// Сессия = одно открытие страницы. Считаем, сколько забегов подряд сыграно в ней.
const session = { id: Date.now().toString(36), runs: 0 };

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

function save(runs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(runs.slice(-TELEMETRY.maxRuns)));
  } catch {
    // приватный режим или нет места — замеры просто не сохранятся
  }
}

// run: { win, time, kills, level, cause, picks: [{ id, t }], firstLevelUpAt, bossSeen, bossKilled }
export function recordRun(run) {
  session.runs++;
  const runs = load();
  runs.push({ ...run, at: new Date().toISOString(), session: session.id, runInSession: session.runs });
  save(runs);
}

// Текст для «Скопировать статистику»: сводка сверху, дальше по забегу на строку
export function report() {
  const runs = load();
  if (runs.length === 0) return 'GORKY-67: забегов пока нет';

  const sessions = new Map();
  for (const r of runs) sessions.set(r.session, Math.max(sessions.get(r.session) ?? 0, r.runInSession));
  const perSession = [...sessions.values()];
  const causes = {};
  for (const r of runs) if (!r.win) causes[r.cause] = (causes[r.cause] ?? 0) + 1;
  const avg = runs.reduce((s, r) => s + r.time, 0) / runs.length;
  const firstLvl = runs.filter((r) => r.firstLevelUpAt != null);

  const lines = [
    `GORKY-67 · забегов: ${runs.length} · сессий: ${sessions.size}`,
    `Забегов подряд в сессии: ${perSession.join(', ')} (среднее ${(runs.length / sessions.size).toFixed(1)})`,
    `Выжили: ${runs.filter((r) => r.win).length} · среднее время: ${formatTime(avg)}`,
    `Дошли до Объекта: ${runs.filter((r) => r.bossSeen).length} · убили: ${runs.filter((r) => r.bossKilled).length}`,
    `Причины смерти: ${Object.entries(causes).map(([c, n]) => `${causeName(c)} ${n}`).join(', ') || '—'}`,
    firstLvl.length
      ? `Первый уровень в среднем на ${(firstLvl.reduce((s, r) => s + r.firstLevelUpAt, 0) / firstLvl.length).toFixed(0)} с`
      : null,
  ].filter(Boolean);
  lines.push('');
  runs.forEach((r, i) => {
    const result = r.win ? 'выжил' : `погиб от: ${causeName(r.cause)}`;
    const boss = r.bossKilled ? 'Объект убит' : r.bossSeen ? 'Объект жив' : 'до Объекта не дошёл';
    const picks = r.picks.map((p) => `${t(`upg_${p.id}`)} (${formatTime(p.t)})`).join(' → ') || '—';
    lines.push(
      `#${i + 1} ${r.at.slice(0, 16).replace('T', ' ')} · сессия ${r.session}, забег ${r.runInSession} · ` +
        `${formatTime(r.time)} · ${result}${r.revived ? ' (после воскрешения)' : ''} · ур. ${r.level} · убито ${r.kills} · ${boss}`,
      `   улучшения: ${picks}`
    );
  });
  return lines.join('\n');
}

// cause — «тип врага» или «тип врага:снаряд»
function causeName(cause) {
  if (!cause) return '?';
  const [type, how] = cause.split(':');
  return t(`enemy_${type}`) + (how ? ` (${t('byShell')})` : '');
}

// Копирование: Clipboard API работает только на https/localhost; по адресу
// в локальной сети (http://192.168…) — запасной путь через скрытое поле.
export async function copyReport() {
  const text = report();
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}
