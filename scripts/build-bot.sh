#!/bin/sh
# Сборка для прогонов бота: production-сборка, но с инструментами разработки (__game, __startBot, __botLevel).
# Без NODE_ENV=development Vite выкидывает import.meta.env.DEV-код — бота в сборке не будет.
# Результат — dist-dev/, его раздаёт конфигурация «bot» из .claude/launch.json (порт 4180).
# Замеры на dev-сервере (5173) хуже и непоказательны — баланс мерить только здесь.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
NODE_ENV=development npx vite build --mode development --outDir dist-dev --emptyOutDir
grep -lq "__botLevel" dist-dev/assets/*.js || { echo "В сборке нет бота — проверь NODE_ENV" >&2; exit 1; }
echo "Готово: dist-dev/ (с ботом). Запусти конфигурацию «bot» — http://localhost:4180"
