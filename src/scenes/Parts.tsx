import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import anchors from "../anchors.json";
import { Callout, Captions, ease, Narration, SceneHeader, Stage, turnFrame } from "../components";
import { scene } from "../timeline";

type Part = keyof (typeof anchors.turn)[number];

// 문장 번호 → 해당 문장에서 보여줄 라벨
const LABELS: { line: number; part: Part; label: string; dx: number; dy: number }[] = [
  { line: 1, part: "engine", label: "엔진 · 연료 탱크", dx: -150, dy: -40 },
  { line: 1, part: "seat", label: "운전석", dx: 170, dy: -50 },
  { line: 2, part: "leverL", label: "조종 레버", dx: -130, dy: -60 },
  { line: 2, part: "leverR", label: "조종 레버", dx: 150, dy: -40 },
  { line: 3, part: "rotor", label: "로터 · 블레이드", dx: 190, dy: 20 },
  { line: 3, part: "guard", label: "가드 링", dx: -130, dy: -40 },
  { line: 4, part: "light", label: "작업등", dx: 180, dy: 20 },
];

export const Parts: React.FC = () => {
  const s = scene("parts");
  const frame = useCurrentFrame();
  const W = 1450;
  // 턴테이블 0번 프레임(앞쪽 3/4 뷰)에 고정하고 천천히 줌인. 라벨은 Blender 에서 투영한 좌표 사용
  const at = (p: Part): [number, number] => [anchors.turn[0][p][0], anchors.turn[0][p][1]];
  const zoom = 1 + 0.06 * ease(frame, 0, s.frames);
  return (
    <AbsoluteFill>
      <SceneHeader no={1} title={s.title} />
      <Stage x={235} y={80} w={W} src={turnFrame(0)} scale={zoom}>
        {LABELS.map((l) => {
          const line = s.lines[l.line];
          const next = s.lines[l.line + 1];
          return (
            <Callout
              key={l.part}
              at={at(l.part)}
              w={W}
              label={l.label}
              dx={l.dx}
              dy={l.dy}
              start={line.from + 4}
              end={next ? next.from - 4 : undefined}
            />
          );
        })}
      </Stage>
      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};
