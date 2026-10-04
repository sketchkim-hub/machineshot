import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Captions, ease, Narration } from "../components";
import { FONT } from "../theme";
import { lineAt } from "../timeline";
import { Balloon, CadHeader, D, Dim, Hatch, K, makeIso, Note, progress, TitleBlock } from "./cad";
import { Cutter, MachineIso, PART_POINTS, SpinArc } from "./machine";
import { T, SHEETS } from "./timeline";

const Frame: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const s = T.scene(id);
  return (
    <AbsoluteFill>
      {children}
      <TitleBlock title={s.title} sheet={SHEETS.indexOf(id) + 1} total={SHEETS.length} />
      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};

/* ───────────── 1. 인트로 ───────────── */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const iso = makeIso(1290, 560, 2.9);
  const p = progress(frame, 5, 110);
  const a = ease(frame, 10, 30);
  const b = ease(frame, 20, 42);
  const c = ease(frame, 34, 56);
  return (
    <Frame id="intro">
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <MachineIso iso={iso} p={p} />
      </svg>
      <div style={{ position: "absolute", left: 100, top: 250, fontFamily: FONT }}>
        <div style={{ color: K.cyan, fontSize: 26, fontWeight: 700, letterSpacing: 6, opacity: a }}>
          INDUSTRIAL TWIN-SHAFT SHREDDER
        </div>
        <div
          style={{
            color: K.text,
            fontSize: 100,
            fontWeight: 900,
            lineHeight: 1.1,
            marginTop: 16,
            opacity: b,
            transform: `translateY(${(1 - b) * 24}px)`,
          }}
        >
          산업용
          <br />
          2축 파쇄기
        </div>
        <div style={{ width: 160 * c, height: 6, background: K.amber, margin: "28px 0 24px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: c }}>
          {["작동 원리", "수입 통관 HS 코드", "자율안전확인 · 세관장 확인", "수입 일정 · 창고 예약", "작동 중 안전 수칙"].map(
            (t, i) => (
              <div key={t} style={{ color: K.sub, fontSize: 30, fontWeight: 700, opacity: ease(frame, 40 + i * 6, 52 + i * 6) }}>
                <span style={{ color: K.cyan, marginRight: 14 }}>{String(i + 1).padStart(2, "0")}</span>
                {t}
              </div>
            ),
          )}
        </div>
      </div>
    </Frame>
  );
};

/* ───────────── 2. 구조 ───────────── */
const PARTS: { key: string; n: number; label: string; to: [number, number] }[] = [
  { key: "hopper", n: 1, label: "투입 호퍼", to: [70, -150] },
  { key: "chamber", n: 2, label: "파쇄실", to: [-230, 120] },
  { key: "shaft", n: 3, label: "칼날 축 (2축)", to: [-40, -245] },
  { key: "gearbox", n: 4, label: "감속기", to: [150, 140] },
  { key: "motor", n: 5, label: "모터", to: [70, -130] },
  { key: "panel", n: 6, label: "제어반", to: [-110, -40] },
  { key: "frame", n: 7, label: "프레임", to: [250, 70] },
];

export const Structure: React.FC = () => {
  const s = T.scene("structure");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const iso = makeIso(760, 560, 2.9);
  const p = progress(frame, 0, 50);
  const step = L[0].frames / PARTS.length;
  const detail = ease(frame, L[1].from, L[1].from + 20);
  return (
    <Frame id="structure">
      <CadHeader no={1} title="구조" />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <MachineIso iso={iso} p={p} highlight={li === 1 ? ["shaft"] : []} />
        {PARTS.map((pt, i) => {
          const at = iso(...PART_POINTS[pt.key]);
          return (
            <Balloon
              key={pt.key}
              at={at}
              to={[at[0] + pt.to[0], at[1] + pt.to[1]]}
              n={pt.n}
              label={pt.label}
              start={L[0].from + i * step}
              active={li === 1 ? pt.key === "shaft" : frame < L[0].from + (i + 1) * step && frame >= L[0].from + i * step}
            />
          );
        })}
        {/* 부품표 */}
        <g opacity={ease(frame, 10, 30)}>
          <rect x={1400} y={170} width={464} height={44} fill="rgba(94,200,242,0.12)" stroke={K.dim} strokeWidth={1.2} />
          <text x={1420} y={200} fill={K.cyan} fontSize={20} fontWeight={700} fontFamily={FONT}>
            번호
          </text>
          <text x={1500} y={200} fill={K.cyan} fontSize={20} fontWeight={700} fontFamily={FONT}>
            부품명
          </text>
          {PARTS.map((pt, i) => {
            const on = li === 1 ? pt.key === "shaft" : frame >= L[0].from + i * step && frame < L[0].from + (i + 1) * step;
            return (
              <g key={pt.key} opacity={ease(frame, L[0].from + i * step, L[0].from + i * step + 8)}>
                <rect
                  x={1400}
                  y={214 + i * 44}
                  width={464}
                  height={44}
                  fill={on ? "rgba(255,181,71,0.14)" : "rgba(10,26,47,0.75)"}
                  stroke={K.dim}
                  strokeWidth={1}
                />
                <text x={1432} y={244 + i * 44} fill={on ? K.amber : K.text} fontSize={21} fontWeight={700} textAnchor="middle" fontFamily={FONT}>
                  {pt.n}
                </text>
                <text x={1500} y={244 + i * 44} fill={on ? K.amber : K.text} fontSize={22} fontFamily={FONT}>
                  {pt.label}
                </text>
              </g>
            );
          })}
        </g>
        {/* 상세도 A: 위에서 본 두 축과 엇갈린 칼날 */}
        {detail > 0 ? <DetailA x={1400} y={560} w={464} h={300} o={detail} /> : null}
      </svg>
    </Frame>
  );
};

const DetailA: React.FC<{ x: number; y: number; w: number; h: number; o: number }> = ({ x, y, w, h, o }) => {
  const y1 = y + h * 0.4;
  const y2 = y + h * 0.66;
  const n = 9;
  const pitch = (w - 60) / n;
  return (
    <g opacity={o}>
      <rect x={x} y={y} width={w} height={h} fill="rgba(10,26,47,0.85)" stroke={K.cyan} strokeWidth={2} />
      <text x={x + 14} y={y + 32} fill={K.cyan} fontSize={21} fontWeight={700} fontFamily={FONT}>
        상세 A · 위에서 본 칼날 배치
      </text>
      {[y1, y2].map((yy, k) => (
        <g key={k}>
          <line x1={x + 20} y1={yy} x2={x + w - 20} y2={yy} stroke={K.dim} strokeWidth={1.5} strokeDasharray="18 5 3 5" />
          {Array.from({ length: n }).map((_, i) =>
            i % 2 === k ? null : (
              <rect
                key={i}
                x={x + 30 + i * pitch}
                y={yy - 52}
                width={pitch * 0.8}
                height={104}
                fill={k ? "rgba(255,181,71,0.2)" : "rgba(94,200,242,0.2)"}
                stroke={k ? K.amber : K.cyan}
                strokeWidth={2}
              />
            ),
          )}
        </g>
      ))}
      <text x={x + w - 14} y={y + h - 14} fill={K.sub} fontSize={18} textAnchor="end" fontFamily={FONT}>
        두 축의 칼날이 서로 엇갈려 맞물림
      </text>
    </g>
  );
};

/* ───────────── 3. 작동 원리 (단면도) ───────────── */
const CX = 620;
const CY = 560;
const R = 150;
const OFF = 135;
const W = 300; // 파쇄실 반폭

const rand = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const Principle: React.FC = () => {
  const s = T.scene("principle");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const draw = progress(frame, 0, 40);

  // 회전각: 마지막 문장 중간에 잠시 역회전
  const w0 = L[3].from + L[3].frames * 0.5;
  const w1 = w0 + 45;
  const om = 1.4;
  const f = frame;
  const ang = om * (Math.min(f, w0) - (Math.min(Math.max(f, w0), w1) - w0) + Math.max(0, f - w1));
  const reversing = f >= w0 && f < w1;

  // 재료 투입: 둘째 문장부터 일정 간격으로 블록이 떨어지고 아래로 조각이 배출됨
  const feedStart = L[1].from;
  const cycle = 50;
  const blocks: React.ReactNode[] = [];
  const chips: React.ReactNode[] = [];
  if (frame >= feedStart) {
    const kMax = Math.floor((frame - feedStart) / cycle);
    for (let k = Math.max(0, kMax - 3); k <= kMax; k++) {
      const age = frame - (feedStart + k * cycle);
      if (age < 0) continue;
      const by = 130 + (CY - 60 - 130) * Math.min(1, (age / 46) ** 1.6);
      if (age < 70) {
        const bw = 110 + rand(k) * 50;
        blocks.push(
          <rect key={`b${k}`} x={CX - bw / 2} y={by} width={bw} height={70} fill="url(#hatchA)" stroke={K.cyan} strokeWidth={2} />,
        );
      }
      if (age > 38 && age < 110) {
        const t = (age - 38) / 72;
        for (let j = 0; j < 8; j++) {
          const r = rand(k * 10 + j);
          const x = CX + (r - 0.5) * 160 * t * 1.6;
          const y = CY + 90 + t * 380 + rand(k * 7 + j) * 40;
          chips.push(
            <rect
              key={`c${k}-${j}`}
              x={x}
              y={y}
              width={14 + r * 12}
              height={10 + rand(j * 3 + k) * 10}
              fill="rgba(94,200,242,0.35)"
              stroke={K.cyan}
              strokeWidth={1.5}
              transform={`rotate(${(r - 0.5) * 120 + t * 200 * (j % 2 ? 1 : -1)} ${x} ${y})`}
              opacity={1 - Math.max(0, t - 0.8) * 5}
            />,
          );
        }
      }
    }
  }

  const scr = li === 3 ? K.amber : K.line;
  const box = (x: number, y: number, w: number, h: number, label: string, on: boolean, start: number) => (
    <g opacity={ease(frame, start, start + 14)}>
      <rect x={x} y={y} width={w} height={h} fill={on ? "rgba(255,181,71,0.14)" : "rgba(10,26,47,0.8)"} stroke={on ? K.amber : K.cyan} strokeWidth={2.5} />
      <text x={x + w / 2} y={y + h / 2 + 9} fill={on ? K.amber : K.text} fontSize={26} fontWeight={900} textAnchor="middle" fontFamily={FONT}>
        {label}
      </text>
    </g>
  );
  const arrow = (x1: number, x2: number, y: number, o: number) => (
    <g opacity={o}>
      <line x1={x1} y1={y} x2={x2 - 14} y2={y} stroke={K.cyan} strokeWidth={3} />
      <polygon points={`${x2},${y} ${x2 - 16},${y - 9} ${x2 - 16},${y + 9}`} fill={K.cyan} />
    </g>
  );
  const on0 = li === 0;
  return (
    <Frame id="principle">
      <CadHeader no={2} title="작동 원리" />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <Hatch id="hatchA" color={K.cyan} gap={12} />
          <Hatch id="hatchWall" color={K.dim} gap={9} />
          <clipPath id="feedClip">
            <rect x={CX - W + 6} y={100} width={W * 2 - 12} height={CY - 60 - 100 + 70} />
          </clipPath>
          <clipPath id="outClip">
            <rect x={CX - W - 100} y={CY + 60} width={W * 2 + 200} height={400} />
          </clipPath>
        </defs>

        {/* 호퍼 + 파쇄실 벽 (단면 빗금) */}
        <D d={`M ${CX - W - 130} 150 L ${CX - W} 300 L ${CX - W} ${CY + 230}`} p={draw} w={3} />
        <D d={`M ${CX + W + 130} 150 L ${CX + W} 300 L ${CX + W} ${CY + 230}`} p={draw} w={3} />
        <g opacity={draw}>
          <rect x={CX - W - 26} y={300} width={26} height={CY + 230 - 300} fill="url(#hatchWall)" stroke={K.dim} strokeWidth={1.5} />
          <rect x={CX + W} y={300} width={26} height={CY + 230 - 300} fill="url(#hatchWall)" stroke={K.dim} strokeWidth={1.5} />
          <line x1={CX - W} y1={CY + 230} x2={CX + W} y2={CY + 230} stroke={K.hidden} strokeWidth={1.6} strokeDasharray="10 7" />
          <text x={CX} y={CY + 262} fill={K.sub} fontSize={20} textAnchor="middle" fontFamily={FONT}>
            배출구 ▼
          </text>
          <text x={CX - W - 70} y={250} fill={K.sub} fontSize={20} textAnchor="middle" fontFamily={FONT}>
            호퍼
          </text>
        </g>

        {/* 스크레이퍼 */}
        <D d={`M ${CX - W} ${CY - 40} L ${CX - OFF - R + 6} ${CY} L ${CX - W} ${CY + 40} Z`} p={draw} color={scr} w={2.5} fill="url(#hatchWall)" />
        <D d={`M ${CX + W} ${CY - 40} L ${CX + OFF + R - 6} ${CY} L ${CX + W} ${CY + 40} Z`} p={draw} color={scr} w={2.5} fill="url(#hatchWall)" />

        {/* 칼날 (뒤쪽 축은 반투명) */}
        <Cutter cx={CX + OFF} cy={CY} R={R} angle={-ang + 60} p={draw} back color={li === 1 ? K.amber : K.line} />
        <Cutter cx={CX - OFF} cy={CY} R={R} angle={ang} p={draw} color={li === 1 ? K.amber : K.line} />

        {/* 회전 방향 */}
        <SpinArc cx={CX - OFF} cy={CY} r={R + 34} from={reversing ? 0 : -150} sweep={reversing ? -70 : 70} color={reversing ? K.red : K.amber} o={ease(frame, L[1].from, L[1].from + 12)} />
        <SpinArc cx={CX + OFF} cy={CY} r={R + 34} from={reversing ? 180 : -30} sweep={reversing ? 70 : -70} color={reversing ? K.red : K.amber} o={ease(frame, L[1].from, L[1].from + 12)} />

        <g clipPath="url(#feedClip)">{blocks}</g>
        <g clipPath="url(#outClip)">{chips}</g>

        {/* 치수 */}
        <Dim x1={CX - OFF} y1={CY} x2={CX + OFF} y2={CY} label="축간 거리" o={ease(frame, 30, 50) * (li >= 1 ? 0.5 : 1)} off={-215} />
        <g opacity={ease(frame, 36, 56)}>
          <line x1={CX - OFF - R * 0.7} y1={CY + R * 0.7} x2={CX - OFF - 240} y2={CY + 250} stroke={K.dim} strokeWidth={1.5} />
          <text x={CX - OFF - 250} y={CY + 280} fill={K.dim} fontSize={22} textAnchor="middle" fontFamily={FONT}>
            Ø 칼날 외경
          </text>
        </g>

        {li === 3 ? (
          <g opacity={ease(frame, L[3].from, L[3].from + 10)}>
            <line x1={CX - W + 8} y1={CY + 30} x2={CX - W - 60} y2={CY + 140} stroke={K.amber} strokeWidth={2} />
            <text x={CX - W - 70} y={CY + 172} fill={K.amber} fontSize={26} fontWeight={900} textAnchor="middle" fontFamily={FONT}>
              스크레이퍼
            </text>
          </g>
        ) : null}
        {reversing ? (
          <g>
            <rect x={CX - 140} y={190} width={280} height={56} fill="rgba(255,94,94,0.15)" stroke={K.red} strokeWidth={2.5} />
            <text x={CX} y={228} fill={K.red} fontSize={28} fontWeight={900} textAnchor="middle" fontFamily={FONT}>
              과부하 → 자동 역회전
            </text>
          </g>
        ) : null}

        {/* 동력 전달 계통도 */}
        <g>
          <text x={1180} y={210} fill={K.cyan} fontSize={22} fontWeight={700} fontFamily={FONT} opacity={ease(frame, 6, 20)}>
            동력 전달 계통
          </text>
          {box(1180, 235, 170, 80, "모터", on0, 8)}
          {arrow(1350, 1440, 275, ease(frame, 16, 28))}
          {box(1440, 235, 170, 80, "감속기", on0, 18)}
          {arrow(1610, 1700, 275, ease(frame, 26, 38))}
          {box(1700, 235, 160, 80, "2축", on0, 28)}
          <text x={1395} y={350} fill={K.sub} fontSize={19} textAnchor="middle" fontFamily={FONT} opacity={ease(frame, 30, 44)}>
            고속 · 저토크
          </text>
          <text x={1655} y={350} fill={on0 ? K.amber : K.sub} fontSize={19} fontWeight={700} textAnchor="middle" fontFamily={FONT} opacity={ease(frame, 30, 44)}>
            저속 · 고토크
          </text>
        </g>
      </svg>
      <Note x={1180} y={400} w={680} start={L[0].from} active={li === 0} title="① 감속" desc="느리지만 강한 회전력으로 변환" />
      <Note x={1180} y={510} w={680} start={L[1].from} active={li === 1} title="② 물림" desc="두 축이 안쪽으로 반대 회전" />
      <Note x={1180} y={620} w={680} start={L[2].from} active={li === 2} title="③ 전단 · 배출" desc="칼날 폭 크기의 조각으로 절단" />
      <Note x={1180} y={730} w={680} start={L[3].from} active={li === 3} title="④ 스크레이퍼 · 역회전" desc="낀 재료 제거, 과부하 시 걸림 해소" />
    </Frame>
  );
};
