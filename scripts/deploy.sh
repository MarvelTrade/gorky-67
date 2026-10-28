#!/bin/sh
# Обновляет игру для тестеров: собирает dist/ и кладёт его в публичный
# репозиторий MarvelTrade/gorky-67-play, откуда её раздаёт GitHub Pages.
# Исходники туда не попадают — только содержимое dist/.
#
#   npm run deploy            — собрать и выложить
#   npm run deploy -- --dry   — собрать и показать, что изменится, без пуша
set -eu

PLAY_REPO="MarvelTrade/gorky-67-play"
URL="https://marveltrade.github.io/gorky-67-play/"
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DRY=0
[ "${1:-}" = "--dry" ] && DRY=1

cd "$ROOT"
if [ -n "$(git status --porcelain)" ]; then
  echo "Есть незакоммиченные изменения — сначала закоммить, чтобы сборка соответствовала коммиту." >&2
  exit 1
fi
REV=$(git rev-parse --short HEAD)

rm -rf dist
npm run build

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
gh repo clone "$PLAY_REPO" "$TMP" -- -q
cd "$TMP"
git rm -rq --ignore-unmatch .
cp -R "$ROOT/dist/." .
touch .nojekyll
git add -A

if git diff --cached --quiet; then
  echo "Сборка не изменилась — выкладывать нечего."
  exit 0
fi
git status --short
if [ "$DRY" = 1 ]; then
  echo "Пробный запуск: ничего не отправлено."
  exit 0
fi

git commit -q -m "Сборка из gorky-67 @ $REV"
git push -q origin main
echo "Готово. Через минуту-две новая версия будет по ссылке: $URL"
