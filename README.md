# 승용식 쌍발 트로웰 — 작동 소개 영상

Blender로 렌더한 3D 모델과 한국어 TTS 나레이션을 Remotion으로 합성해 약 2분 30초 분량의 1080p 소개 영상을 만듭니다.

## 구성

| 경로 | 내용 |
| --- | --- |
| `blender/trowel3d.py` | 트로웰 3D 모델과 렌더 모드(턴테이블, 아래에서 본 뷰, 클로즈업 컷, 라벨 좌표 추출) |
| `narration/script.json` | 대본(장면별 문장)과 목소리 설정 |
| `narration/tts.py` | 오프라인 TTS(sherpa-onnx + Supertonic 3)로 문장별 음성과 `src/narration.json` 타임라인 생성 |
| `narration/music.py` | 잔잔한 배경음을 numpy로 합성 (`public/music.wav`) |
| `src/` | Remotion 영상. 장면 길이는 나레이션 길이에 맞춰 자동으로 계산 |
| `scripts/build.sh` | 전체 파이프라인 한 번에 실행 |

장면 순서: 인트로 → 주요 구성 → 작동 원리(로터 반대 회전) → 작업 전 점검 → 시동과 조작 → 마감 작업 순서 → 안전 수칙 → 마무리

## 만들기

```bash
npm install
pip install bpy==4.2.0 sherpa-onnx soundfile numpy scipy

# TTS 모델 (약 140MB)
curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2
tar xjf sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2 -C models/

TTS_MODEL_DIR=models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11 ./scripts/build.sh
```

- 대본을 고친 경우에는 `narration/tts.py`만 다시 실행하면 됩니다. 영상 타이밍은 자동으로 따라갑니다.
- 목소리는 `narration/script.json`의 `voice.sid`로 바꿉니다(0–4는 여성, 5–9는 남성). `speed` 값이 클수록 말이 빨라집니다.
- 미리보기: `npm run dev`
- Chromium을 따로 받을 수 없는 환경이라면 `REMOTION_BROWSER=/path/to/headless_shell`을 지정합니다.
- 렌더 이미지(`public/render/`)와 배경음은 용량 문제로 저장소에 넣지 않았습니다. `build.sh`를 실행하면 다시 만들어집니다.

## 라이선스 메모

- 폰트: Noto Sans KR (SIL OFL, `public/fonts/OFL.txt`)
- TTS: Supertonic 3 (Supertone) ONNX 모델, sherpa-onnx 런타임
