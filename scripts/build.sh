#!/usr/bin/env bash
# 전체 파이프라인: Blender 렌더 → TTS 나레이션 → 배경음 → Remotion 영상 합성
#
#   TTS_MODEL_DIR=/path/to/sherpa-onnx-supertonic-3-tts-int8-2026-05-11 ./scripts/build.sh
#
# 단계별로 건너뛰기: SKIP_BLENDER=1 SKIP_TTS=1 ./scripts/build.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${SKIP_BLENDER:-}" ]]; then
  echo "== Blender 렌더 (pip install bpy==4.2.0)"
  RES=1280x820 python3 blender/trowel3d.py turn public/render/turn 0 240 1
  python3 blender/trowel3d.py bottom public/render/bottom
  python3 blender/trowel3d.py shots public/render/shots
  RES=1280x820 python3 blender/trowel3d.py anchors src/anchors.json
fi

if [[ -z "${SKIP_TTS:-}" ]]; then
  echo "== TTS 나레이션 (pip install sherpa-onnx soundfile numpy)"
  python3 narration/tts.py
  python3 narration/tts.py --script narration/shredder_script.json --name shredder
  python3 narration/tts.py --script narration/freezer_script.json --name freezer
fi

echo "== 배경음"
[[ -f public/music.wav ]] || python3 narration/music.py 240

echo "== Remotion 렌더"
npx remotion render src/index.ts TrowelIntro out/trowel_intro.mp4 --codec=h264 --crf=18 --audio-bitrate=192k
npx remotion render src/index.ts ShredderGuide out/shredder_guide.mp4 --codec=h264 --crf=20 --audio-bitrate=160k
npx remotion render src/index.ts FreezerGuide out/freezer_guide.mp4 --codec=h264 --crf=20 --audio-bitrate=160k
echo "완료: out/trowel_intro.mp4, out/shredder_guide.mp4, out/freezer_guide.mp4"
