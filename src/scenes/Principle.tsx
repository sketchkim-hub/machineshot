import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { bottomFrame, Callout, Captions, ease, Narration, rotorFrame, SceneHeader, Stage } from "../components";
import anchors from "../anchors.json";
import { C, FONT } from "../theme";
import { lineAt, scene } from "../timeline";

// 아래에서 본 렌더(1000x560, 정사영 2.4) 기준 로터 중심 · 블레이드 반지름
const BW = 1100;
const BH = (BW * 560) / 1000;
const ROTORS = [
  { x: 0.5 - 0.5 / 2.4, dir: -1, label: "반시계 방향" },
  { x: 0.5 + 0.5 / 2.4, dir: 1, label: "시계 방향" },
];
const R = (0.5 / 2.4) * BW;

/** 로터 둘레를 도는 회전 화살표 */
const SpinArrow: React.FC<{ cx: number; cy: number; r: number; dir: number; phase: number; o: number }> = ({
  cx,
  cy,
  r,
  dir,
  phase,
  o,
}) => {
  const arcs = [0, 180].map((base) => {
    const a0 = ((base + phase * dir) * Math.PI) / 180;
    const a1 = a0 + ((dir * 110) * Math.PI) / 180;
    const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    // 화살촉: 끝점 접선 방향
    const tx = -Math.sin(a1) * dir;
    const ty = Math.cos(a1) * dir;
    const nx = Math.cos(a1);
    const ny = Math.sin(a1);
    const s = 22;
    const head = `${x1 + tx * s},${y1 + ty * s} ${x1 + nx * s * 0.7},${y1 + ny * s * 0.7} ${x1 - nx * s * 0.7},${y1 - ny * s * 0.7}`;
    return (
      <g key={base}>
        <path
          d={`M ${x0} ${y0} A ${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${x1} ${y1}`}
          fill="none"
          stroke={C.accent}
          strokeWidth={9}
          strokeLinecap="round"
        />
        <polygon points={head} fill={C.accent} />
      </g>
    );
  });
  return <g opacity={o}>{arcs}</g>;
};

export const Principle: React.FC = () => {
  const s = scene("principle");
  const frame = useCurrentFrame();
  const li = lineAt(s, frame);
  const L = s.lines;
  const bx = 110;
  const by = 190;
  const arrows = ease(frame, L[1].from, L[1].from + 15);
  const cancel = ease(frame, L[2].from, L[2].from + 18);
  const toRotor = ease(frame, L[3].from - 6, L[3].from + 12);
  return (
    <AbsoluteFill>
      <SceneHeader no={2} title={s.title} />

      {/* 아래에서 본 로터 반대 회전 */}
      <div style={{ position: "absolute", left: bx, top: by, width: BW, height: BH, opacity: 1 - toRotor }}>
        <Img src={bottomFrame(frame)} style={{ width: "100%", height: "100%" }} />
        <svg width={BW} height={BH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {ROTORS.map((r) => (
            <SpinArrow key={r.x} cx={r.x * BW} cy={BH / 2} r={R * 1.08} dir={r.dir} phase={frame * 3} o={arrows} />
          ))}
        </svg>
        {ROTORS.map((r) => (
          <div
            key={r.label}
            style={{
              position: "absolute",
              left: r.x * BW - 150,
              width: 300,
              top: BH / 2 + R * 1.08 + 26,
              textAlign: "center",
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 36,
              color: C.text,
              opacity: arrows,
            }}
          >
            {r.label}
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: -52,
            textAlign: "center",
            fontFamily: FONT,
            fontSize: 28,
            color: C.sub,
            opacity: ease(frame, 6, 24),
          }}
        >
          ▲ 기계 앞쪽 · 아래에서 올려다본 모습
        </div>
      </div>

      {/* 회전력 상쇄 */}
      <div
        style={{
          position: "absolute",
          right: 90,
          top: 300,
          width: 560,
          fontFamily: FONT,
          opacity: cancel * (1 - toRotor),
          transform: `translateX(${(1 - cancel) * 40}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <Glyph dir={-1} phase={frame * 3} />
          <span style={{ color: C.sub, fontSize: 64, fontWeight: 900 }}>+</span>
          <Glyph dir={1} phase={frame * 3} />
          <span style={{ color: C.sub, fontSize: 64, fontWeight: 900 }}>=</span>
          <span style={{ color: C.ok, fontSize: 96, fontWeight: 900 }}>0</span>
        </div>
        <div style={{ color: C.text, fontSize: 40, fontWeight: 900, textAlign: "center", marginTop: 26 }}>
          회전력 상쇄 → 균형 유지
        </div>
        <div style={{ color: C.sub, fontSize: 28, textAlign: "center", marginTop: 12 }}>
          기계가 한쪽으로 돌지 않아요
        </div>
      </div>

      {/* 로터 클로즈업 (블레이드 4매) */}
      {li >= 3 ? (
        <Stage x={280} y={130} w={1360} src={rotorFrame(frame)} opacity={toRotor} scale={0.96 + 0.04 * toRotor}>
          <Callout
            at={[anchors.shots.rotor.rotor[0], anchors.shots.rotor.rotor[1]]}
            w={1360}
            label="블레이드 4매 × 2"
            dx={160}
            dy={-120}
            start={L[3].from + 14}
          />
        </Stage>
      ) : null}

      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};

const Glyph: React.FC<{ dir: number; phase: number }> = ({ dir, phase }) => (
  <svg width={130} height={130} style={{ overflow: "visible" }}>
    <circle cx={65} cy={65} r={60} fill="rgba(242,154,18,0.12)" />
    <SpinArrow cx={65} cy={65} r={38} dir={dir} phase={phase} o={1} />
  </svg>
);
