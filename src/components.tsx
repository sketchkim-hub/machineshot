import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { Sequence } from "remotion";
import { C, FONT } from "./theme";
import { lineAt, Scene } from "./timeline";

export const RENDER_ASPECT = 1280 / 820;

const pad3 = (n: number) => String(n).padStart(3, "0");
export const turnFrame = (i: number) =>
  staticFile(`render/turn/t${pad3(((Math.round(i) % 240) + 240) % 240)}.png`);
export const bottomFrame = (i: number) =>
  staticFile(`render/bottom/b${pad3(((Math.floor(i) % 30) + 30) % 30)}.png`);
export const rotorFrame = (i: number) =>
  staticFile(`render/shots/rotor_${pad3(((Math.floor(i) % 15) + 15) % 15)}.png`);
export const shot = (name: string) => staticFile(`render/shots/${name}.png`);

export const ease = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

/** 어두운 산업용 배경 + 원근 그리드 + 비네팅 */
export const Background: React.FC<{ tint?: string }> = ({ tint }) => {
  const frame = useCurrentFrame();
  const drift = (frame * 0.6) % 80;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 60% at 60% 45%, ${tint ?? C.bg2} 0%, ${C.bg} 70%)`,
        }}
      />
      <AbsoluteFill style={{ perspective: 900, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: -1200,
            right: -1200,
            top: 560,
            height: 1400,
            transform: "rotateX(72deg)",
            transformOrigin: "top center",
            backgroundImage: `linear-gradient(${C.grid} 2px, transparent 2px), linear-gradient(90deg, ${C.grid} 2px, transparent 2px)`,
            backgroundSize: "80px 80px",
            backgroundPosition: `0 ${drift}px`,
            maskImage: "linear-gradient(to bottom, transparent, black 30%, black 60%, transparent)",
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** 렌더 이미지를 올려 두는 무대. 자식은 이미지 기준 정규화 좌표(0~1)를 쓸 수 있도록 같은 크기로 겹침 */
export const Stage: React.FC<{
  x: number;
  y: number;
  w: number;
  src: string;
  scale?: number;
  rotate?: number;
  translate?: [number, number];
  opacity?: number;
  children?: React.ReactNode;
}> = ({ x, y, w, src, scale = 1, rotate = 0, translate = [0, 0], opacity = 1, children }) => {
  const h = w / RENDER_ASPECT;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        opacity,
        transform: `translate(${translate[0]}px, ${translate[1]}px) scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      <Img src={src} style={{ width: "100%", height: "100%", filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.45))" }} />
      {children}
    </div>
  );
};

/** 부품 라벨: 점 → 꺾인 선 → 라벨 */
export const Callout: React.FC<{
  at: [number, number]; // 정규화 좌표
  w: number; // 무대 너비(px)
  label: string;
  dx: number;
  dy: number;
  start: number;
  end?: number;
  aspect?: number; // 이미지 가로세로비 (기본: 트로웰 렌더 1280x820)
}> = ({ at, w, label, dx, dy, start, end, aspect = RENDER_ASPECT }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const h = w / aspect;
  const p = spring({ frame: frame - start, fps, config: { damping: 200 }, durationInFrames: 18 });
  const out = end === undefined ? 1 : ease(frame, end, end + 10, 1, 0);
  const o = Math.min(p, out);
  if (o <= 0) return null;
  const px = at[0] * w;
  const py = at[1] * h;
  const ex = px + dx * p;
  const ey = py + dy * p;
  const right = dx >= 0;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, pointerEvents: "none" }}>
      <svg width={w} height={h} style={{ position: "absolute", overflow: "visible" }}>
        <circle cx={px} cy={py} r={9 + 8 * (1 - p)} fill="none" stroke={C.accent} strokeWidth={3} opacity={0.8} />
        <circle cx={px} cy={py} r={6} fill={C.accent} />
        <polyline
          points={`${px},${py} ${ex},${ey} ${ex + (right ? 24 : -24)},${ey}`}
          fill="none"
          stroke={C.line}
          strokeWidth={3}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: right ? ex + 30 : undefined,
          right: right ? undefined : w - ex + 30,
          top: ey - 28,
          padding: "8px 20px",
          borderRadius: 10,
          background: "rgba(8, 16, 14, 0.82)",
          border: `2px solid ${C.accent}`,
          color: C.text,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 32,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
};

/** 장면 제목 (좌상단 챕터 표시) */
export const SceneHeader: React.FC<{ no: number; title: string }> = ({ no, title }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, 0, 18);
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        top: 70,
        display: "flex",
        alignItems: "center",
        gap: 22,
        fontFamily: FONT,
        opacity: o,
        transform: `translateX(${(1 - o) * -30}px)`,
      }}
    >
      <div style={{ color: C.accent, fontSize: 30, fontWeight: 900, letterSpacing: 2 }}>
        {String(no).padStart(2, "0")}
      </div>
      <div style={{ width: 4, height: 44, background: C.accent, borderRadius: 2 }} />
      <div style={{ color: C.text, fontSize: 46, fontWeight: 900 }}>{title}</div>
    </div>
  );
};

/** 문장별 음성 */
export const Narration: React.FC<{ scene: Scene }> = ({ scene }) => (
  <>
    {scene.lines.map((l) => (
      <Sequence key={l.file} from={l.from} durationInFrames={l.frames + 2} layout="none">
        <Audio src={staticFile(l.file)} />
      </Sequence>
    ))}
  </>
);

/** 하단 자막 */
export const Captions: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const i = lineAt(scene, frame);
  if (i < 0) return null;
  const l = scene.lines[i];
  const endHold = l.from + l.frames + 6;
  const o = Math.min(ease(frame, l.from - 2, l.from + 6), ease(frame, endHold, endHold + 6, 1, 0));
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 56,
        display: "flex",
        justifyContent: "center",
        opacity: o,
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          padding: "16px 36px",
          borderRadius: 14,
          background: "rgba(4, 10, 9, 0.72)",
          color: C.text,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 40,
          lineHeight: 1.45,
          textAlign: "center",
          wordBreak: "keep-all",
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}
      >
        {l.text}
      </div>
    </div>
  );
};

/** 우측/좌측 설명 패널용 카드 */
export const Card: React.FC<{
  start: number;
  active?: boolean;
  done?: boolean;
  icon?: React.ReactNode;
  title: string;
  desc?: string;
  width?: number;
  compact?: boolean;
}> = ({ start, active, done, icon, title, desc, width = 640, compact }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - start, fps, config: { damping: 200 }, durationInFrames: 20 });
  if (p <= 0) return null;
  return (
    <div
      style={{
        width,
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: compact ? "12px 24px" : "20px 26px",
        borderRadius: 16,
        background: active ? "rgba(242, 154, 18, 0.16)" : "rgba(255,255,255,0.05)",
        border: `2px solid ${active ? C.accent : "rgba(255,255,255,0.10)"}`,
        opacity: p,
        transform: `translateX(${(1 - p) * 60}px)`,
        fontFamily: FONT,
      }}
    >
      {icon ? (
        <div
          style={{
            width: 64,
            height: 64,
            flex: "0 0 64px",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: done ? C.ok : active ? C.accent : "rgba(255,255,255,0.08)",
          }}
        >
          {icon}
        </div>
      ) : null}
      <div>
        <div style={{ color: C.text, fontSize: 36, fontWeight: 900 }}>{title}</div>
        {desc ? <div style={{ color: C.sub, fontSize: 26, fontWeight: 400, marginTop: 4 }}>{desc}</div> : null}
      </div>
    </div>
  );
};
