import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Captions, Card, ease, Narration, SceneHeader, shot, Stage } from "../components";
import { IconHelmet, IconNoEntry, IconPower, IconWater } from "../icons";
import { C, FONT } from "../theme";
import { scene } from "../timeline";

export const Safety: React.FC = () => {
  const s = scene("safety");
  const frame = useCurrentFrame();
  const L = s.lines;
  const W = 1060;
  const H = W / (1280 / 820);
  const mid = L[1].from + Math.round(L[1].frames * 0.42);
  const items = [
    { title: "보호구 착용", desc: "안전모 · 안전화", icon: <IconHelmet />, from: L[1].from, to: mid },
    { title: "로터 접근 금지", desc: "회전 중 누구도 가까이 가지 않기", icon: <IconNoEntry />, from: mid, to: L[2].from },
    { title: "정지 후 하차", desc: "로터 완전 정지 → 엔진 정지", icon: <IconPower />, from: L[2].from, to: L[3].from },
    { title: "작업 후 세척", desc: "블레이드 · 가드 링 콘크리트 제거", icon: <IconWater />, from: L[3].from, to: s.frames },
  ];
  // 로터 접근 금지 구간: 기계 둘레에 붉은 위험 구역 표시
  const zone = Math.min(ease(frame, mid, mid + 12), ease(frame, L[2].from, L[2].from + 12, 1, 0));
  const pulse = 0.6 + 0.4 * Math.sin(frame / 5);
  return (
    <AbsoluteFill>
      <SceneHeader no={6} title={s.title} />
      <Stage x={40} y={190} w={W} src={shot("front")} scale={1 + 0.04 * ease(frame, 0, s.frames)}>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: zone }}>
          <ellipse
            cx={W * 0.5}
            cy={H * 0.68}
            rx={W * 0.44}
            ry={H * 0.2}
            fill={`rgba(217, 72, 58, ${0.12 * pulse})`}
            stroke={C.red}
            strokeWidth={5}
            strokeDasharray="22 14"
            strokeDashoffset={-frame * 2}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: H * 0.9,
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 38,
            color: C.red,
            opacity: zone,
          }}
        >
          회전 구역 접근 금지
        </div>
      </Stage>
      <div style={{ position: "absolute", left: 1160, top: 220, display: "flex", flexDirection: "column", gap: 20 }}>
        {items.map((it) => (
          <Card
            key={it.title}
            start={it.from}
            active={frame >= it.from && frame < it.to}
            done={frame >= it.to}
            icon={it.icon}
            title={it.title}
            desc={it.desc}
            width={680}
          />
        ))}
      </div>
      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};
