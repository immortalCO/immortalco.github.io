#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"   # 确保在 gallery 目录下执行

for f in *.mp4; do
  # 跳过已经是预览版的文件
  if [[ "$f" == *_preview.mp4 ]]; then
    continue
  fi

  # 跳过 motion_ref_full 文件
  if [[ "$f" == *_motion_ref_full.mp4 ]]; then
    continue
  fi

  echo "Compressing $f ..."
  python compress.py "$f"
done

echo "All preview videos generated."
