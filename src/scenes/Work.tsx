import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Captions, Card, ease, Narration, rotorFrame, SceneHeader, Stage } from "../components";
import { IconCalendar, IconCross, IconLayers, IconWave } from "../icons";
import { C, FONT } from "../theme";
import { lineAt, scene } from "../timeline";

const STEPS = [
  { title: "작업 적기 확인", desc: "밟았을 때 자국이 살짝 남을 때", icon: <IconCalendar /> },
  { title: "초벌 작업", desc: "블레이드를 평평하게 두고 고르기", icon: <IconWave /> },
  { title: "마감 반복", desc: "블레이드 각도를 조금씩 세우며", icon: <IconLayers /> },
  { title: "교차 진행", desc: "회차마다 방향을 바꿔 겹치게", icon: <IconCross /> },
];

/** 블레이드 각도 도해: 바닥 위 블레이드 단면이 점점 기울어짐 */
const BladeAngle: React.FC<{ deg: number }> = ({ deg }) => (
  <svg width={440} height={200} viewBox="0 0 440 200">
    <rect x={20} y={150} width={400} height={34} rx={4} fill="#6F7773" />
    <text x={30} y={176} fill="#DDE3E0" fontSize={20} fontFamily={FONT}>
      콘크리트
    </text>
    <g transform={`translate(150 146) rotate(${-deg})`}>
      <rect x={0} y={-10} width={200} height={10} rx={2} fill="#C9D1D4" />
    </g>
    <path
      d={`M 270 146 A 120 120 0 0 0 ${150 + 120 * Math.cos((deg * Math.PI) / 180)} ${146 - 120 * Math.sin((deg * Math.PI) / 180)}`}
      fill="none"
      stroke={C.accent}
      strokeWidth={4}
      opacity={deg > 1 ? 1 : 0}
    />
    <text x={20} y={40} fill={C.text} fontSize={28} fontWeight={900} fontFamily={FONT}>
      블레이드 각도 {deg < 1 ? "평평하게" : "↑ 세우기"}
    </text>
  </svg>
);

/** 교차 진행 도해: 가로 패스 후 세로 패스 */
const CrossPass: React.FC<{ p1: number; p2: number }> = ({ p1, p2 }) => {
  const n = 5;
  const size = 300;
  const band = size / n;
  return (
    <svg width={size + 40} height={size + 40} viewBox={`-20 -20 ${size + 40} ${size + 40}`}>
      <rect x={0} y={0} width={size} height={size} rx={6} fill="#5E6663" />
      {Array.from({ length: n }).map((_, i) => {
        const w = Math.max(0, Math.min(1, p1 * n - i)) * size;
        const x0 = i % 2 === 0 ? 0 : size - w;
        return <rect key={`h${i}`} x={x0} y={i * band + 4} width={w} height={band - 8} rx={band / 2 - 4} fill="rgba(242,154,18,0.55)" />;
      })}
      {Array.from({ length: n }).map((_, i) => {
        const h = Math.max(0, Math.min(1, p2 * n - i)) * size;
        const y0 = i % 2 === 0 ? 0 : size - h;
        return <rect key={`v${i}`} x={i * band + 4} y={y0} width={band - 8} height={h} rx={band / 2 - 4} fill="rgba(92,208,142,0.55)" />;
      })}
    </svg>
  );
};

export const Work: React.FC = () => {
  const s = scene("work");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const deg = interpolate(frame, [L[2].from + 10, L[2].from + L[2].frames - 10], [0, 14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p1 = ease(frame, L[3].from + 5, L[3].from + L[3].frames * 0.45);
  const p2 = ease(frame, L[3].from + L[3].frames * 0.5, L[3].from + L[3].frames - 5);
  const diag = (from: number, to?: number) =>
    to === undefined ? ease(frame, from, from + 12) : Math.min(ease(frame, from, from + 12), ease(frame, to - 10, to, 1, 0));
  return (
    <AbsoluteFill>
      <SceneHeader no={5} title={s.title} />
      <Stage x={30} y={160} w={1080} src={rotorFrame(frame)} />

      {/* 도해 패널 */}
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 560,
          padding: 20,
          borderRadius: 18,
          background: "rgba(6, 12, 11, 0.85)",
          border: "2px solid rgba(255,255,255,0.12)",
          opacity: Math.max(diag(L[1].from, L[3].from), diag(L[3].from)),
        }}
      >
        {li < 3 ? <BladeAngle deg={deg} /> : <CrossPass p1={p1} p2={p2} />}
      </div>

      <div style={{ position: "absolute", left: 1170, top: 210, display: "flex", flexDirection: "column", gap: 20 }}>
        {STEPS.map((st, k) => (
          <Card
            key={st.title}
            start={L[k].from}
            active={li === k}
            done={li > k}
            icon={st.icon}
            title={`${k + 1}. ${st.title}`}
            desc={st.desc}
            width={680}
          />
        ))}
      </div>
      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};
