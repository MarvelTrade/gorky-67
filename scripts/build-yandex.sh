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
# zip и unzip есть не везде (на Windows в Git Bash их нет) — тогда архив собирает Python
if command -v zip >/dev/null 2>&1; then
  (cd dist-yandex && zip -qrX "$OUT" .)
else
  python -c "import os,sys,zipfile
z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED)
for d,_,fs in os.walk('dist-yandex'):
  for f in fs:
    p=os.path.join(d,f); z.write(p,os.path.relpath(p,'dist-yandex').replace(os.sep,'/'))
z.close()" "$OUT"
fi
list() {
  if command -v unzip >/dev/null 2>&1; then unzip -Z1 "$OUT"
  else python -c "import sys,zipfile;print(chr(10).join(zipfile.ZipFile(sys.argv[1]).namelist()))" "$OUT"; fi
}

# Проверки требований 1.21 и 1.22
list | tr -d '\r' | grep -qx 'index.html' || { echo "В корне архива нет index.html" >&2; exit 1; }
if list | tr -d '\r' | LC_ALL=C grep -q '[^A-Za-z0-9._/-]'; then
  echo "В именах файлов есть пробелы или не-латинские символы" >&2
  exit 1
fi
SIZE=$(du -sk dist-yandex | cut -f1)
[ "$SIZE" -le 102400 ] || { echo "Распакованная игра больше 100 МБ" >&2; exit 1; }

echo "Готово: build/gorky-67-yandex.zip ($(du -h "$OUT" | cut -f1), распакованная игра ${SIZE} КБ)"
list
