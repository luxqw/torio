#!/usr/bin/env bash
set -euo pipefail

echo "=== torio — установка ==="

# 1. Проверить Node.js
if ! command -v node &>/dev/null; then
  echo "Ошибка: Node.js не найден. Установите Node.js v22+ и повторите."
  exit 1
fi

echo "Node.js: $(node -v)"

# 2. Глобальная установка
echo "Устанавливаю torio..."
npm install -g torio

echo ""
echo "Готово! Запустите: torio"
