import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Captions, ease, Narration, Stage, turnFrame } from "../components";
import { C, FONT } from "../theme";
import { scene } from "../timeline";

const Title: React.FC<{ kicker: string; title: string; sub: string; start: number }> = ({
  kicker,
  title,
  sub,
  start,
}) => {
  const frame = useCurrentFrame();
  const a = ease(frame, start, start + 20);
  const b = ease(frame, start + 8, start + 30);
  const c = ease(frame, start + 16, start + 38);
  return (
    <div style={{ position: "absolute", left: 110, top: 140, fontFamily: FONT }}>
      <div
        style={{
          color: C.accent,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 8,
          opacity: a,
          transform: `translateY(${(1 - a) * 20}px)`,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          color: C.text,
          fontSize: 104,
          fontWeight: 900,
          lineHeight: 1.1,
          marginTop: 16,
          whiteSpace: "pre-line",
          opacity: b,
          transform: `translateY(${(1 - b) * 30}px)`,
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: 140 * c,
          height: 8,
          background: C.accent,
          borderRadius: 4,
          margin: "30px 0 26px",
        }}
      />
      <div style={{ color: C.sub, fontSize: 40, fontWeight: 700, opacity: c }}>{sub}</div>
    </div>
  );
};

export const Intro: React.FC = () => {
  const s = scene("intro");
  const frame = useCurrentFrame();
  // 턴테이블: 영상 1프레임 = 렌더 1프레임(1.5도). 장면 끝에서 0번 프레임에 도착하도록 역산
  const idx = frame - s.frames;
  const zoom = 0.92 + 0.08 * ease(frame, 0, 60);
  return (
    <AbsoluteFill>
      <Stage x={520} y={170} w={1330} src={turnFrame(idx)} scale={zoom} opacity={ease(frame, 0, 20)} />
      <Title kicker="RIDE-ON POWER TROWEL" title={"승용식\n쌍발 트로웰"} sub="작동 소개" start={6} />
      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};

export const Outro: React.FC = () => {
  const s = scene("outro");
  const frame = useCurrentFrame();
  const fade = ease(frame, s.frames - 30, s.frames, 1, 0);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Stage x={520} y={170} w={1330} src={turnFrame(120 + frame)} opacity={ease(frame, 0, 20)} />
      <Title
        kicker="SAFETY FIRST"
        title={"안전하고\n완성도 높은 바닥"}
        sub="올바른 점검 · 올바른 조작 · 안전한 작업"
        start={6}
      />
      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};
