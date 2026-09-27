import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import anchors from "../anchors.json";
import { Callout, Captions, Card, ease, Narration, SceneHeader, shot, Stage } from "../components";
import { IconBlade, IconBolt, IconCheck, IconFuel, IconOil, IconStop } from "../icons";
import { scene } from "../timeline";

const ITEMS = [
  { title: "연료", desc: "연료 탱크 잔량", icon: <IconFuel /> },
  { title: "엔진 오일", desc: "오일 양 · 누유 여부", icon: <IconOil /> },
  { title: "블레이드", desc: "마모 · 변형 상태", icon: <IconBlade /> },
  { title: "가드 링 · 체결부", desc: "볼트 풀림 · 파손 여부", icon: <IconBolt /> },
  { title: "비상 정지 스위치", desc: "정상 작동 확인", icon: <IconStop /> },
];

export const Check: React.FC = () => {
  const s = scene("check");
  const frame = useCurrentFrame();
  const L = s.lines;
  // 둘째 문장 동안 1~4번 항목을 차례로, 셋째 문장에서 5번 항목
  const starts = [0, 1, 2, 3].map((k) => L[1].from + Math.round((L[1].frames * k) / 4)).concat(L[2].from);
  const active = starts.reduce((a, st, k) => (frame >= st ? k : a), -1);
  const W = 1050;
  return (
    <AbsoluteFill>
      <SceneHeader no={3} title={s.title} />
      <Stage x={40} y={200} w={W} src={shot("engine")} scale={1 + 0.05 * ease(frame, 0, s.frames)}>
        <Callout
          at={[anchors.shots.engine.fuel[0], anchors.shots.engine.fuel[1]]}
          w={W}
          label="주유구"
          dx={-120}
          dy={-80}
          start={starts[0] + 4}
          end={starts[2]}
        />
        <Callout
          at={[anchors.shots.engine.guard[0], anchors.shots.engine.guard[1]]}
          w={W}
          label="가드 링 · 블레이드"
          dx={-170}
          dy={90}
          start={starts[2] + 4}
        />
      </Stage>
      <div style={{ position: "absolute", left: 1150, top: 150, display: "flex", flexDirection: "column", gap: 12 }}>
        {ITEMS.map((it, k) => (
          <Card
            key={it.title}
            start={12 + k * 6}
            active={active === k}
            done={active > k}
            icon={active > k ? <IconCheck /> : it.icon}
            title={it.title}
            desc={it.desc}
            width={680}
            compact
          />
        ))}
      </div>
      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};
