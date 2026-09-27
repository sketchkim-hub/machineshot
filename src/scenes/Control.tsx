import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import anchors from "../anchors.json";
import { Callout, Captions, Card, ease, Narration, SceneHeader, shot, Stage } from "../components";
import { IconGauge, IconKey, IconThermo, IconWave } from "../icons";
import { C, FONT } from "../theme";
import { scene } from "../timeline";

type Move = { label: string; l: number; r: number; from: number; to: number };

/** 레버 한 개: 원 + 미는 방향 화살표 (각도: 0=앞, 90=오른쪽) */
const Lever: React.FC<{ angle: number | null; name: string; o: number }> = ({ angle, name, o }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
    <svg width={170} height={170} viewBox="-85 -85 170 170">
      <circle r={78} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)" strokeWidth={3} />
      <circle r={22} fill={C.accent} />
      {angle !== null ? (
        <g transform={`rotate(${angle})`} opacity={o}>
          <line x1={0} y1={-6} x2={0} y2={-52} stroke={C.accent} strokeWidth={12} strokeLinecap="round" />
          <polygon points="0,-76 -20,-48 20,-48" fill={C.accent} />
        </g>
      ) : null}
    </svg>
    <div style={{ fontFamily: FONT, color: C.sub, fontSize: 26, fontWeight: 700 }}>{name}</div>
  </div>
);

export const Control: React.FC = () => {
  const s = scene("control");
  const frame = useCurrentFrame();
  const L = s.lines;
  const W = 1100;

  // 셋째·넷째 문장: 위에서 본 기계 이동 시연
  const a = L[2].from;
  const da = L[2].frames;
  const b = L[3].from;
  const db = L[3].frames;
  const moves: Move[] = [
    { label: "전진", l: 0, r: 0, from: a, to: a + da * 0.5 },
    { label: "후진", l: 180, r: 180, from: a + da * 0.5, to: b },
    { label: "옆으로 이동", l: 90, r: 90, from: b, to: b + db * 0.45 },
    { label: "제자리 회전", l: 0, r: 180, from: b + db * 0.45, to: L[4].from },
  ];
  const cur = moves.find((m) => frame >= m.from && frame < m.to) ?? null;
  const k = (t0: number, t1: number) =>
    interpolate(frame, [t0, t1], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => t * t * (3 - 2 * t),
    });
  const y = -150 * k(a + da * 0.05, a + da * 0.42) + 150 * k(a + da * 0.55, a + da * 0.92);
  const x = 150 * k(b + db * 0.05, b + db * 0.4);
  const rot = 90 * k(b + db * 0.5, b + db * 0.95);

  const topO = ease(frame, a - 12, a + 6);
  const moveO = cur ? Math.min(ease(frame, cur.from, cur.from + 6), ease(frame, cur.to - 6, cur.to, 1, 0)) : 0;
  return (
    <AbsoluteFill>
      <SceneHeader no={4} title={s.title} />

      {/* 1~2문장: 레버 클로즈업 + 시동 단계 */}
      <div style={{ opacity: 1 - topO }}>
        <Stage x={30} y={170} w={W} src={shot("levers")} scale={1 + 0.05 * ease(frame, 0, a)}>
          <Callout
            at={[anchors.shots.levers.leverL[0], anchors.shots.levers.leverL[1]]}
            w={W}
            label="조종 레버"
            dx={-60}
            dy={-70}
            start={L[0].from + 10}
          />
          <Callout
            at={[anchors.shots.levers.leverR[0], anchors.shots.levers.leverR[1]]}
            w={W}
            label="조종 레버"
            dx={150}
            dy={-60}
            start={L[0].from + 16}
          />
        </Stage>
        <div style={{ position: "absolute", left: 1200, top: 260, display: "flex", flexDirection: "column", gap: 20 }}>
          <Card start={L[0].from} active={frame < L[1].from} icon={<IconKey />} title="시동" desc="운전석에 앉아 엔진 시동" width={620} />
          <Card
            start={L[1].from}
            active={frame >= L[1].from && frame < L[1].from + L[1].frames * 0.45}
            icon={<IconThermo />}
            title="예열"
            desc="엔진을 충분히 데우기"
            width={620}
          />
          <Card
            start={L[1].from + L[1].frames * 0.45}
            active={frame >= L[1].from + L[1].frames * 0.45}
            icon={<IconGauge />}
            title="스로틀 천천히 올리기"
            desc="로터 회전 속도 상승"
            width={620}
          />
        </div>
      </div>

      {/* 3~5문장: 위에서 본 이동 시연 + 레버 방향 */}
      {topO > 0 ? (
        <div style={{ opacity: topO }}>
          <div
            style={{
              position: "absolute",
              left: 90,
              top: 190,
              width: 1060,
              height: 700,
              borderRadius: 24,
              background: "rgba(255,255,255,0.03)",
              border: "2px dashed rgba(255,255,255,0.10)",
            }}
          />
          <Stage x={210} y={230} w={820} src={shot("top")} translate={[x, y]} rotate={rot} />
          <div
            style={{
              position: "absolute",
              left: 110,
              top: 205,
              fontFamily: FONT,
              fontSize: 26,
              color: C.sub,
            }}
          >
            ▲ 앞쪽 · 위에서 본 모습
          </div>
          <div
            style={{
              position: "absolute",
              left: 1220,
              top: 250,
              width: 620,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 30,
            }}
          >
            <div style={{ display: "flex", gap: 70 }}>
              <Lever angle={cur ? cur.l : null} name="왼쪽 레버" o={moveO} />
              <Lever angle={cur ? cur.r : null} name="오른쪽 레버" o={moveO} />
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 60,
                fontWeight: 900,
                color: C.text,
                height: 80,
                opacity: moveO,
              }}
            >
              {cur ? cur.label : ""}
            </div>
            <Card
              start={L[4].from}
              active
              icon={<IconWave />}
              title="부드럽게, 조금씩"
              desc="레버는 천천히 조작하는 것이 요령"
              width={600}
            />
          </div>
        </div>
      ) : null}

      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};
