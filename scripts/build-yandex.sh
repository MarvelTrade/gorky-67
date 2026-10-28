#!/bin/sh
# Архив для загрузки в Консоль разработчика Яндекс Игр.
# Сборка с VITE_PLATFORM=yandex (.env.yandex): подключает SDK, прячет инструменты плейтеста.
# В корне архива — index.html (требование 1.22), без пробелов и кириллицы в именах.
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/build/gorky-67-yandex.zip"
cd "$ROOT"

npx vite build --mode yandex --outDir dist-yandex --emptyOutDir

mkdir -p build
rm -f "$OUT"
(cd dist-yandex && zip -qrX "$OUT" .)

# Проверки требований 1.21 и 1.22
unzip -Z1 "$OUT" | grep -qx 'index.html' || { echo "В корне архива нет index.html" >&2; exit 1; }
if unzip -Z1 "$OUT" | LC_ALL=C grep -q '[^A-Za-z0-9._/-]'; then
  echo "В именах файлов есть пробелы или не-латинские символы" >&2
  exit 1
fi
SIZE=$(du -sk dist-yandex | cut -f1)
[ "$SIZE" -le 102400 ] || { echo "Распакованная игра больше 100 МБ" >&2; exit 1; }

echo "Готово: build/gorky-67-yandex.zip ($(du -h "$OUT" | cut -f1), распакованная игра ${SIZE} КБ)"
unzip -Z1 "$OUT"
