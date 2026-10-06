import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Captions, ease, Narration } from "../components";
import { FONT } from "../theme";
import { lineAt } from "../timeline";
import { Balloon, CadHeader, D, Dim, K, makeIso, Note, progress, TitleBlock } from "../shredder/cad";
import { FreezerIso, FZ_POINTS } from "./drawing";
import { SHEETS, T } from "./timeline";

export const Frame: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const s = T.scene(id);
  return (
    <AbsoluteFill>
      {children}
      <TitleBlock title={s.title} sheet={SHEETS.indexOf(id) + 1} total={SHEETS.length} prefix="SFZ" />
      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};

export const txt = (
  x: number,
  y: number,
  s: string,
  size: number,
  color: string,
  weight = 400,
  anchor: "start" | "middle" | "end" = "start",
) => (
  <text x={x} y={y} fill={color} fontSize={size} fontWeight={weight} textAnchor={anchor} fontFamily={FONT}>
    {s}
  </text>
);

/* ───────────── 1. 인트로 ───────────── */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const iso = makeIso(1200, 430, 1.8);
  const a = ease(frame, 10, 30);
  const b = ease(frame, 20, 42);
  const c = ease(frame, 34, 56);
  return (
    <Frame id="intro">
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <FreezerIso iso={iso} p={progress(frame, 4, 110)} frame={frame} products={frame > 90} air={frame > 100} />
      </svg>
      <div style={{ position: "absolute", left: 100, top: 230, fontFamily: FONT }}>
        <div style={{ color: K.cyan, fontSize: 26, fontWeight: 700, letterSpacing: 6, opacity: a }}>SPIRAL QUICK FREEZER</div>
        <div style={{ color: K.text, fontSize: 92, fontWeight: 900, lineHeight: 1.12, marginTop: 16, opacity: b, transform: `translateY(${(1 - b) * 24}px)` }}>
          나선형
          <br />
          급속 냉동기
        </div>
        <div style={{ width: 160 * c, height: 6, background: K.amber, margin: "28px 0 24px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: c }}>
          {["구조와 원리", "공장 배치도", "냉동 능력 · 냉매", "세관장 확인 · 전기 · 전파 인증", "고압가스 안전검사"].map((t, i) => (
            <div key={t} style={{ color: K.sub, fontSize: 30, fontWeight: 700, opacity: ease(frame, 40 + i * 6, 52 + i * 6) }}>
              <span style={{ color: K.cyan, marginRight: 14 }}>{String(i + 1).padStart(2, "0")}</span>
              {t}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
};

/* ───────────── 2. 구조와 원리 ───────────── */
const LABELS: { key: string; n: number; label: string; to: [number, number]; line: number }[] = [
  { key: "drum", n: 1, label: "회전 드럼", to: [-90, -110], line: 0 },
  { key: "belt", n: 2, label: "나선 벨트", to: [170, 40], line: 0 },
  { key: "infeed", n: 3, label: "입구 컨베이어", to: [-170, 60], line: 1 },
  { key: "evapL", n: 4, label: "증발기 · 팬", to: [-120, -120], line: 1 },
  { key: "outfeed", n: 5, label: "출구 컨베이어", to: [150, 70], line: 1 },
  { key: "bridge", n: 6, label: "상부 이송부", to: [60, -150], line: 1 },
];

export const Structure: React.FC = () => {
  const s = T.scene("structure");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const iso = makeIso(640, 440, 1.8);
  const hl = li === 0 ? ["drum", "belt"] : li === 1 ? ["infeed", "outfeed", "evap"] : [];
  const cmp = ease(frame, L[2].from + 10, L[2].from + 40);
  return (
    <Frame id="structure">
      <CadHeader no={1} title="구조와 원리" />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <FreezerIso iso={iso} p={progress(frame, 0, 60)} frame={frame} products={li >= 1} air={li >= 1} highlight={hl} />
        {LABELS.map((l, i) => {
          const at = iso(...FZ_POINTS[l.key]);
          return (
            <Balloon
              key={l.key}
              at={at}
              to={[at[0] + l.to[0], at[1] + l.to[1]]}
              n={l.n}
              label={l.label}
              start={L[l.line].from + 6 + (i % 4) * 14}
              active={li === l.line}
            />
          );
        })}
        {/* 면적 대비 벨트 길이 비교 */}
        {cmp > 0 ? (
          <g opacity={cmp}>
            <rect x={1300} y={640} width={560} height={220} fill="rgba(10,26,47,0.85)" stroke={K.cyan} strokeWidth={2} />
            {txt(1320, 675, "같은 벨트를 펼치면", 22, K.cyan, 700)}
            <rect x={1320} y={700} width={80} height={60} fill="rgba(255,181,71,0.2)" stroke={K.amber} strokeWidth={2.5} />
            {txt(1360, 790, "나선형", 20, K.amber, 700, "middle")}
            <rect x={1430} y={720} width={410 * cmp} height={20} fill="rgba(94,200,242,0.2)" stroke={K.cyan} strokeWidth={2} />
            {txt(1635, 790, "긴 직선 컨베이어", 20, K.sub, 400, "middle")}
            {txt(1320, 840, "→ 좁은 면적에서 긴 냉동 시간 확보", 22, K.text, 700)}
          </g>
        ) : null}
      </svg>
      <Note x={1300} y={180} w={560} start={L[0].from} active={li === 0} title="① 드럼 + 나선 벨트" desc="벨트가 드럼을 따라 감겨 올라감" />
      <Note x={1300} y={300} w={560} start={L[1].from} active={li === 1} title="② 찬 공기로 급속 냉동" desc="증발기 팬 → 벨트 사이로 냉기 순환" />
      <Note x={1300} y={420} w={560} start={L[2].from} active={li === 2} title="③ 대량 생산 라인" desc="입구 → 상승 → 이송 → 하강 → 출구" />
    </Frame>
  );
};

/* ───────────── 3. 공장 배치도 (평면도) ───────────── */
const PX0 = 140;
const PY0 = 190;
const PX1 = 1470;
const PY1 = 840;
const COLS = [140, 472, 805, 1137, 1470];
const ROWS = [190, 515, 840];

export const Layout: React.FC = () => {
  const s = T.scene("layout");
  const frame = useCurrentFrame();
  const L = s.lines;
  const pw = progress(frame, L[0].from, 40);
  const p1 = progress(frame, L[1].from, 40);
  const p2 = progress(frame, L[2].from, 50);
  const p3 = progress(frame, L[3].from, 30);
  const crate = ease(frame, L[3].from + 20, L[3].from + L[3].frames - 10);
  const ck = (i: number) => frame >= [L[1].from, L[1].from + 50, L[2].from, L[2].from + 60, L[3].from][i];
  const wall = (d: string) => <D d={d} p={pw} w={5} color={K.line} />;
  const lbl = (x: number, y: number, t: string, o: number, c = K.sub, size = 22) => <g opacity={o}>{txt(x, y, t, size, c, 700, "middle")}</g>;
  // 냉동기 평면 (트윈 드럼)
  const fx0 = 470;
  const fx1 = 1030;
  const fy0 = 390;
  const fy1 = 640;
  return (
    <Frame id="layout">
      <CadHeader no={2} title="공장 배치도" />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {/* 기둥 열 · 그리드 */}
        <g opacity={pw}>
          {COLS.map((x, i) => (
            <g key={x}>
              <line x1={x} y1={150} x2={x} y2={PY1 + 10} stroke={K.dim} strokeWidth={1} strokeDasharray="22 6 4 6" opacity={0.6} />
              <circle cx={x} cy={150} r={16} fill={K.bg} stroke={K.dim} strokeWidth={1.5} />
              {txt(x, 157, `X${i + 1}`, 15, K.dim, 700, "middle")}
              {ROWS.map((y) => (
                <rect key={y} x={x - 10} y={y - 10} width={20} height={20} fill={K.dim} opacity={0.6} />
              ))}
            </g>
          ))}
          {ROWS.map((y, i) => (
            <g key={y}>
              <line x1={PX0 - 30} y1={y} x2={PX1} y2={y} stroke={K.dim} strokeWidth={1} strokeDasharray="22 6 4 6" opacity={0.6} />
              <circle cx={PX0 - 46} cy={y} r={16} fill={K.bg} stroke={K.dim} strokeWidth={1.5} />
              {txt(PX0 - 46, y + 6, `Y${i + 1}`, 15, K.dim, 700, "middle")}
            </g>
          ))}
        </g>
        {/* 외벽 · 칸막이 (반입구는 위쪽 벽 X2~X3 사이) */}
        {wall(`M 640 ${PY0} L ${PX0} ${PY0} L ${PX0} ${PY1} L ${PX1} ${PY1} L ${PX1} ${PY0} L 860 ${PY0}`)}
        {wall(`M 420 ${PY0} L 420 470 M 420 560 L 420 ${PY1}`)}
        {wall(`M 1090 ${PY0} L 1090 470 M 1090 560 L 1090 ${PY1}`)}
        {wall(`M 1090 470 L ${PX1} 470`)}
        {lbl(280, 230, "전처리 · 가공실", pw)}
        {lbl(1280, 515 + 290, "포장실", pw)}

        {/* 냉동기 · 점검 공간 · 컨베이어 */}
        <g opacity={p1}>
          <rect x={fx0 - 30} y={fy0 - 30} width={fx1 - fx0 + 60} height={fy1 - fy0 + 60} fill="none" stroke={K.amber} strokeWidth={2} strokeDasharray="12 8" />
          {txt(fx0 - 22, fy0 - 40, "점검 공간 (사방 여유)", 20, K.amber, 700)}
        </g>
        <D d={`M ${fx0} ${fy0} H ${fx1} V ${fy1} H ${fx0} Z`} p={p1} w={3} fill="rgba(94,200,242,0.06)" />
        <D d={`M ${fx0 + 60} ${fy0} V ${fy1} M ${fx1 - 60} ${fy0} V ${fy1}`} p={p1} w={2} />
        {[640, 860].map((cx) => (
          <g key={cx}>
            <D d={`M ${cx + 100} 515 A 100 100 0 1 1 ${cx - 100} 515 A 100 100 0 1 1 ${cx + 100} 515`} p={p1} w={2.5} color={K.cyan} />
            <circle cx={cx} cy={515} r={58} fill="none" stroke={K.dim} strokeWidth={1.5} opacity={p1} />
          </g>
        ))}
        {lbl(750, 520, "나선형 냉동기", p1, K.text, 24)}
        {lbl(fx0 + 30, fy0 + 140, "증발기", p1, K.sub, 17)}
        {lbl(fx1 - 30, fy0 + 140, "증발기", p1, K.sub, 17)}
        <D d={`M 250 600 H 640 M 250 625 H 640`} p={p1} w={2} color={K.amber} />
        <D d={`M 860 600 H 1300 M 860 625 H 1300`} p={p1} w={2} color={K.amber} />
        {lbl(330, 660, "입구 컨베이어", p1, K.amber, 19)}
        {lbl(1200, 660, "출구 컨베이어", p1, K.amber, 19)}
        <g opacity={p1}>
          <Dim x1={fx0} y1={fy1} x2={fx1} y2={fy1} label="장비 길이" o={1} off={75} />
          <Dim x1={fx1} y1={fy0} x2={fx1} y2={fy1} label="" o={1} off={-48} />
        </g>

        {/* 기계실 · 냉매 배관 · 전기 · 배수 */}
        <D d={`M 1130 230 h 140 v 90 h -140 Z`} p={p2} w={2.5} />
        <D d={`M 1300 230 h 140 v 90 h -140 Z`} p={p2} w={2.5} />
        {lbl(1200, 283, "압축기", p2, K.text, 22)}
        {lbl(1370, 283, "응축기", p2, K.text, 22)}
        {lbl(1280, 420, "기계실", p2, K.sub, 22)}
        <D d={`M 1200 320 V 360 H ${fx0 + 30} V ${fy0}`} p={p2} w={3} color={K.cyan} />
        <D d={`M 1215 320 V 372 H ${fx1 - 30} V ${fy0}`} p={p2} w={3} color={K.cyan} />
        {p2 >= 1 ? (
          <path
            d={`M 1200 320 V 360 H ${fx0 + 30} V ${fy0}`}
            fill="none"
            stroke={K.text}
            strokeWidth={3}
            strokeDasharray="6 24"
            strokeDashoffset={-frame * 2}
          />
        ) : null}
        {lbl(820, 350, "냉매 배관 경로", p2, K.cyan, 20)}
        <g opacity={p2}>
          <rect x={1040} y={680} width={36} height={90} fill="rgba(255,181,71,0.15)" stroke={K.amber} strokeWidth={2.5} />
          {txt(1058, 795, "전기 패널", 18, K.amber, 700, "middle")}
          {[fx0 + 30, fx1 - 30].map((x) => (
            <g key={x}>
              <circle cx={x} cy={fy1 + 60} r={13} fill="none" stroke={K.cyan} strokeWidth={2} />
              <path d={`M ${x - 9} ${fy1 + 51} L ${x + 9} ${fy1 + 69} M ${x + 9} ${fy1 + 51} L ${x - 9} ${fy1 + 69}`} stroke={K.cyan} strokeWidth={2} />
            </g>
          ))}
          {txt(fx0 + 50, fy1 + 106, "배수구 (제상수)", 18, K.cyan, 700, "start")}
        </g>

        {/* 반입구 · 반입 동선 */}
        <g opacity={p3}>
          <path d={`M 640 ${PY0} A 220 220 0 0 1 860 ${PY0 + 0.1}`} fill="none" stroke={K.amber} strokeWidth={2} strokeDasharray="8 6" />
          <Dim x1={640} y1={PY0} x2={860} y2={PY0} label="반입구 폭 ≥ 모듈 폭" o={1} off={-28} />
          <path d={`M 750 ${PY0 - 10} V ${fy0 - 40}`} stroke={K.amber} strokeWidth={3} strokeDasharray="12 8" />
        </g>
        {crate > 0 ? (
          <g transform={`translate(0 ${crate * 85})`}>
            <rect x={690} y={PY0 - 40} width={120} height={70} fill="rgba(255,181,71,0.25)" stroke={K.amber} strokeWidth={2.5} />
            <path d={`M 690 ${PY0 - 40} L 810 ${PY0 + 30} M 810 ${PY0 - 40} L 690 ${PY0 + 30}`} stroke={K.amber} strokeWidth={1.5} />
            {txt(750, PY0 + 2, "모듈", 18, K.text, 900, "middle")}
          </g>
        ) : null}
      </svg>
      {["장비 크기 · 점검 공간", "입 · 출구 라인 연결", "기계실 · 냉매 배관", "전기 패널 · 배수", "반입구 크기 · 동선"].map((t, i) => (
        <div
          key={t}
          style={{
            position: "absolute",
            left: 1530,
            top: 200 + i * 78,
            width: 340,
            display: "flex",
            gap: 12,
            alignItems: "center",
            fontFamily: FONT,
            opacity: ease(frame, L[0].from + 10 + i * 5, L[0].from + 22 + i * 5),
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              border: `2px solid ${ck(i) ? K.green : K.dim}`,
              background: ck(i) ? K.green : "transparent",
              color: K.bg,
              fontWeight: 900,
              fontSize: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {ck(i) ? (
              <svg width={22} height={22} viewBox="0 0 24 24">
                <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={K.bg} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </div>
          <div style={{ color: ck(i) ? K.text : K.sub, fontSize: 23, fontWeight: 700 }}>{t}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 1530, top: 610, width: 340, fontFamily: FONT, fontSize: 19, color: K.sub, opacity: ease(frame, L[0].from + 30, L[0].from + 44), lineHeight: 1.5 }}>
        평면도 (예시) · 실제 배치는 공장 도면과 장비 사양에 맞춰 작성
      </div>
    </Frame>
  );
};
