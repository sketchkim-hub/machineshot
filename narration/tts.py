"""대본(script.json) → 문장별 TTS 음성(public/voice/*.wav) + 타임라인(src/narration.json)

오프라인 TTS: sherpa-onnx + Supertonic 3 (한국어 지원)
  모델: https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2

사용법:
  pip install sherpa-onnx soundfile numpy
  TTS_MODEL_DIR=/path/to/sherpa-onnx-supertonic-3-tts-int8-2026-05-11 python3 narration/tts.py
  # 발음 검증(선택): 한국어 ASR 로 다시 받아써서 문자 오류율(CER)을 출력
  ASR_MODEL_DIR=/path/to/sherpa-onnx-zipformer-korean-2024-06-24 python3 narration/tts.py --verify
"""
import argparse, json, os, re, sys
import numpy as np
import sherpa_onnx
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ROOT, "narration", "script.json")
VOICE_DIR = os.path.join(ROOT, "public", "voice")
TIMELINE = os.path.join(ROOT, "src", "narration.json")


def make_tts(d):
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
                duration_predictor=f"{d}/duration_predictor.int8.onnx",
                text_encoder=f"{d}/text_encoder.int8.onnx",
                vector_estimator=f"{d}/vector_estimator.int8.onnx",
                vocoder=f"{d}/vocoder.int8.onnx",
                tts_json=f"{d}/tts.json",
                unicode_indexer=f"{d}/unicode_indexer.bin",
                voice_style=f"{d}/voice.bin",
            ),
            num_threads=4,
            provider="cpu",
        )
    )
    if not cfg.validate():
        sys.exit("TTS 설정 오류: 모델 경로를 확인하세요")
    return sherpa_onnx.OfflineTts(cfg)


def make_asr(d):
    return sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=f"{d}/encoder-epoch-99-avg-1.int8.onnx",
        decoder=f"{d}/decoder-epoch-99-avg-1.onnx",
        joiner=f"{d}/joiner-epoch-99-avg-1.int8.onnx",
        tokens=f"{d}/tokens.txt",
        num_threads=4,
    )


def trim(x, sr, thresh=0.01, pad=0.06):
    """앞뒤 무음 제거 + 짧은 페이드"""
    idx = np.where(np.abs(x) > thresh)[0]
    if len(idx) == 0:
        return x
    p = int(pad * sr)
    x = x[max(0, idx[0] - p): idx[-1] + p].copy()
    f = int(0.02 * sr)
    x[:f] *= np.linspace(0, 1, f)
    x[-f:] *= np.linspace(1, 0, f)
    return x


def cer(ref, hyp):
    ref, hyp = re.sub(r"[^가-힣]", "", ref), re.sub(r"[^가-힣]", "", hyp)
    d = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, h in enumerate(hyp, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (r != h))
    return d[-1] / max(1, len(ref))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--sid", type=int)
    args = ap.parse_args()

    script = json.load(open(SCRIPT, encoding="utf-8"))
    v = script["voice"]
    sid = v["sid"] if args.sid is None else args.sid
    tts = make_tts(os.environ.get("TTS_MODEL_DIR", "models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11"))
    asr = make_asr(os.environ["ASR_MODEL_DIR"]) if args.verify else None

    os.makedirs(VOICE_DIR, exist_ok=True)
    timeline, errs = [], []
    for scene in script["scenes"]:
        lines = []
        for i, text in enumerate(scene["lines"]):
            g = sherpa_onnx.GenerationConfig()
            g.sid, g.speed, g.num_steps = sid, v["speed"], v["steps"]
            g.extra["lang"] = v["lang"]
            a = tts.generate(text, g)
            x = trim(np.asarray(a.samples, dtype=np.float32), a.sample_rate)
            x *= 0.89 / max(1e-6, np.abs(x).max())          # 피크 -1 dBFS 정규화
            name = f"{scene['id']}_{i}.wav"
            sf.write(os.path.join(VOICE_DIR, name), x, a.sample_rate, subtype="PCM_16")
            dur = len(x) / a.sample_rate
            lines.append({"text": text, "file": f"voice/{name}", "duration": round(dur, 3)})
            msg = f"{name:14s} {dur:5.2f}s"
            if asr:
                s = asr.create_stream()
                y = x if a.sample_rate == 16000 else np.interp(
                    np.arange(0, len(x), a.sample_rate / 16000), np.arange(len(x)), x).astype(np.float32)
                s.accept_waveform(16000, y)
                asr.decode_stream(s)
                e = cer(text, s.result.text)
                errs.append(e)
                msg += f"  CER {e:5.1%}  | {s.result.text}"
            print(msg, flush=True)
        timeline.append({"id": scene["id"], "title": scene["title"], "lines": lines})

    json.dump(timeline, open(TIMELINE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    total = sum(l["duration"] for s in timeline for l in s["lines"])
    print(f"총 음성 길이 {total:.1f}s → {TIMELINE}")
    if errs:
        print(f"평균 CER {np.mean(errs):.1%}")


if __name__ == "__main__":
    main()
