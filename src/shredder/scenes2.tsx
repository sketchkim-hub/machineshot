import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Captions, ease, Narration } from "../components";
import { IconCheck, IconDoc, IconGlasses, IconLock, IconNoEntry, IconStop, IconWarehouse } from "../icons";
import { FONT } from "../theme";
import { lineAt } from "../timeline";
import { CadHeader, D, Hatch, K, makeIso, Note, progress, TitleBlock } from "./cad";
import { Cutter, MachineIso } from "./machine";
import { SHEETS, T } from "./timeline";

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

const txt = (x: number, y: number, s: string, size: number, color: string, weight = 400, anchor: "start" | "middle" | "end" = "start") => (
  <text x={x} y={y} fill={color} fontSize={size} fontWeight={weight} textAnchor={anchor} fontFamily={FONT}>
    {s}
  </text>
);

/* ───────────── 4. HS 코드 ───────────── */
const ROWS = [
  { use: "폐기물 · 일반 재료 파쇄", code: "8479.82", desc: "혼합 · 파쇄 · 분쇄 · 선별 기계" },
  { use: "플라스틱 · 고무 가공", code: "8477.80", desc: "고무 · 플라스틱 가공 기계 (기타)" },
  { use: "암석 · 광물 파쇄", code: "8474.20", desc: "광물 파쇄기 · 분쇄기" },
  { use: "사무용 문서 파쇄", code: "8472.90", desc: "기타 사무용 기계 (문서 파쇄기)" },
];

export const HsCode: React.FC = () => {
  const s = T.scene("hscode");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const seg = [
    { t: "84", label: "류 (Chapter)", desc: "기계류" },
    { t: "79", label: "호 (Heading)", desc: "고유 기능 기계" },
    { t: ".82", label: "소호 (Sub-heading)", desc: "파쇄 · 분쇄 등" },
  ];
  const big = ease(frame, L[1].from, L[1].from + 16);
  const tableTop = 445;
  const rowH = 54;
  const cols = [180, 640, 900, 1740];
  return (
    <Frame id="hscode">
      <CadHeader no={3} title="수입 통관 HS 코드" />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {/* 코드 구조 풀이 */}
        <g opacity={ease(frame, 8, 24)}>
          {txt(180, 220, "HS 코드 구조 (국제 공통 6단위)", 26, K.cyan, 700)}
        </g>
        {seg.map((g, i) => {
          const x = 180 + i * 300;
          const o = ease(frame, L[0].from + 10 + i * 10, L[0].from + 24 + i * 10);
          const on = li >= 1;
          return (
            <g key={g.t} opacity={o}>
              <rect x={x} y={245} width={280} height={110} fill={on ? "rgba(255,181,71,0.12)" : "rgba(10,26,47,0.8)"} stroke={on ? K.amber : K.cyan} strokeWidth={2.5} />
              {txt(x + 140, 318, g.t, 64, on ? K.amber : K.text, 900, "middle")}
              {txt(x + 140, 390, g.label, 22, K.cyan, 700, "middle")}
              {txt(x + 140, 420, g.desc, 21, K.sub, 400, "middle")}
            </g>
          );
        })}
        <g opacity={big}>
          <line x1={1100} y1={300} x2={1170} y2={300} stroke={K.amber} strokeWidth={3} />
          <polygon points="1186,300 1168,290 1168,310" fill={K.amber} />
          {txt(1200, 290, "산업용 파쇄기 (일반)", 26, K.sub, 700)}
          {txt(1200, 345, "8479.82", 64, K.amber, 900)}
        </g>

        {/* 용도별 후보 표 */}
        <g opacity={ease(frame, L[1].from + 20, L[1].from + 36)}>
          <rect x={cols[0]} y={tableTop} width={cols[3] - cols[0]} height={rowH} fill="rgba(94,200,242,0.12)" stroke={K.dim} strokeWidth={1.5} />
          {txt(cols[0] + 20, tableTop + 36, "용도 · 처리 재료", 23, K.cyan, 700)}
          {txt(cols[1] + 20, tableTop + 36, "HS (6단위)", 23, K.cyan, 700)}
          {txt(cols[2] + 20, tableTop + 36, "품목 설명", 23, K.cyan, 700)}
        </g>
        {ROWS.map((r, i) => {
          const start = i === 0 ? L[1].from + 26 : L[2].from + (i - 1) * Math.round(L[2].frames / 3.4);
          const on = i === 0 ? li === 1 : li === 2 && frame >= start && (i === 3 || frame < L[2].from + i * Math.round(L[2].frames / 3.4));
          const y = tableTop + rowH * (i + 1);
          return (
            <g key={r.code} opacity={ease(frame, start, start + 12)}>
              <rect x={cols[0]} y={y} width={cols[3] - cols[0]} height={rowH} fill={on ? "rgba(255,181,71,0.13)" : "rgba(10,26,47,0.8)"} stroke={K.dim} strokeWidth={1} />
              <line x1={cols[1]} y1={y} x2={cols[1]} y2={y + rowH} stroke={K.dim} strokeWidth={1} />
              <line x1={cols[2]} y1={y} x2={cols[2]} y2={y + rowH} stroke={K.dim} strokeWidth={1} />
              {txt(cols[0] + 20, y + 37, r.use, 25, on ? K.amber : K.text, 700)}
              {txt(cols[1] + 20, y + 38, r.code, 30, on ? K.amber : K.text, 900)}
              {txt(cols[2] + 20, y + 37, r.desc, 24, on ? K.amber : K.sub)}
            </g>
          );
        })}
      </svg>
      <Note
        x={180}
        y={735}
        w={1560}
        start={L[3].from}
        active={li === 3}
        title="10단위(HSK) 확정 → 관세사 상담 · 품목분류 사전심사"
        desc="처리 재료와 용도에 따라 세 번이 달라질 수 있으므로 수입 전에 미리 확인"
        icon={<IconDoc color={li === 3 ? K.amber : K.cyan} />}
      />
    </Frame>
  );
};

/* ───────────── 5. 자율안전확인 · 세관장 확인 ───────────── */
export const Kcs: React.FC = () => {
  const s = T.scene("kcs");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const flow = [
    { t: "자율안전확인\n대상 기계", sub: "산업안전보건법", line: 0 },
    { t: "자율안전확인\n신고", sub: "안전보건공단", line: 1 },
    { t: "신고 증명서\n발급", sub: "", line: 3 },
    { t: "수입신고\n세관장 확인", sub: "요건 확인", line: 1 },
    { t: "수리 · 반출", sub: "", line: 3 },
  ];
  const bw = 300;
  const gap = 55;
  const x0 = 95;
  const y0 = 200;
  const docs = ["제품 설명서", "외관도 · 구조도", "전기 회로도", "시험 성적서"];
  const warn = ease(frame, L[4].from, L[4].from + 14);
  return (
    <Frame id="kcs">
      <CadHeader no={4} title="자율안전확인 · 세관장 확인" />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {flow.map((b, i) => {
          const x = x0 + i * (bw + gap);
          const start = L[b.line].from + (b.line === 1 && i === 3 ? 40 : 0) + (b.line === 3 && i === 4 ? 30 : 0);
          const o = ease(frame, start, start + 14);
          const on = li === b.line;
          const lines = b.t.split("\n");
          return (
            <g key={i} opacity={o}>
              <rect x={x} y={y0} width={bw} height={150} fill={on ? "rgba(255,181,71,0.13)" : "rgba(10,26,47,0.85)"} stroke={on ? K.amber : K.cyan} strokeWidth={2.5} />
              {lines.map((l, k) => txt(x + bw / 2, y0 + 60 + k * 38, l, 30, on ? K.amber : K.text, 900, "middle"))}
              {b.sub ? txt(x + bw / 2, y0 + 136, b.sub, 20, K.sub, 400, "middle") : null}
              {i > 0 ? (
                <g>
                  <line x1={x - gap + 4} y1={y0 + 75} x2={x - 14} y2={y0 + 75} stroke={K.cyan} strokeWidth={3} />
                  <polygon points={`${x - 2},${y0 + 75} ${x - 18},${y0 + 66} ${x - 18},${y0 + 84}`} fill={K.cyan} />
                </g>
              ) : null}
            </g>
          );
        })}
        {/* 신고 서류 */}
        <g opacity={ease(frame, L[2].from, L[2].from + 14)}>
          <line x1={x0 + bw + gap + bw / 2} y1={y0 + 150} x2={x0 + bw + gap + bw / 2} y2={420} stroke={K.dim} strokeWidth={1.5} strokeDasharray="8 6" />
          {txt(160, 445, "신고 서류 (예)", 24, K.cyan, 700)}
          {docs.map((d, i) => {
            const x = 160 + i * 250;
            const o = ease(frame, L[2].from + 8 + i * 12, L[2].from + 20 + i * 12);
            return (
              <g key={d} opacity={o}>
                <path d={`M ${x} 470 h 150 l 40 40 v 150 h -190 Z M ${x + 150} 470 v 40 h 40`} fill="rgba(10,26,47,0.85)" stroke={li === 2 ? K.amber : K.line} strokeWidth={2.5} strokeLinejoin="round" />
                {[0, 1, 2, 3].map((k) => (
                  <line key={k} x1={x + 24} y1={540 + k * 22} x2={x + 166 - (k === 3 ? 50 : 0)} y2={540 + k * 22} stroke={K.dim} strokeWidth={2} />
                ))}
                {txt(x + 95, 700, d, 23, K.text, 700, "middle")}
              </g>
            );
          })}
        </g>
        {/* KCs 표시 명판 */}
        <g opacity={ease(frame, L[3].from + 10, L[3].from + 26)}>
          <rect x={1260} y={440} width={560} height={260} fill="rgba(10,26,47,0.85)" stroke={li === 3 ? K.amber : K.cyan} strokeWidth={2.5} />
          {txt(1280, 475, "제품 명판 (부착 예)", 22, K.cyan, 700)}
          <rect x={1290} y={500} width={150} height={150} rx={75} fill="none" stroke={K.text} strokeWidth={4} />
          {txt(1365, 590, "KCs", 48, K.text, 900, "middle")}
          {txt(1470, 545, "자율안전확인 표시", 26, K.text, 900)}
          {txt(1470, 585, "신고번호 · 제조자 · 모델명", 21, K.sub)}
          {txt(1470, 620, "제조 연월 · 정격 출력 등", 21, K.sub)}
        </g>
      </svg>
      {warn > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 160,
            top: 760,
            width: 1660,
            padding: "18px 28px",
            border: `3px dashed ${K.red}`,
            background: "rgba(255,94,94,0.10)",
            fontFamily: FONT,
            display: "flex",
            alignItems: "center",
            gap: 24,
            opacity: warn,
          }}
        >
          <IconWarehouse color={K.red} />
          <div style={{ color: K.red, fontSize: 32, fontWeight: 900 }}>증명서 미비 → 수입신고 미수리 → 화물 창고 대기 · 보관료 증가</div>
        </div>
      ) : null}
    </Frame>
  );
};

/* ───────────── 6. 일정 · 창고 예약 (간트 차트) ───────────── */
const D0 = 45; // 표의 시작이 D-45
const DAYS = 50;
const GX = 470;
const GW = 1360;
const dx = (d: number) => GX + ((d + D0) / DAYS) * GW;

const TASKS = [
  { name: "서류 수집", sub: "설명서 · 도면 · 회로도 · 성적서", a: -45, b: -21, line: 1 },
  { name: "보세창고 예약", sub: "반입 공간 · 현품 확인 일정", a: -21, b: -14, line: 2, key: true },
  { name: "자율안전확인 신고", sub: "→ 신고 증명서", a: -16, b: -3, line: 2 },
  { name: "입항 · 창고 반입", sub: "", a: 0, b: 0, line: 3 },
  { name: "표시 부착 · 현품 확인", sub: "", a: 0, b: 2, line: 3 },
  { name: "수입신고 · 반출", sub: "증명서 제출", a: 2, b: 4, line: 3 },
];

export const Schedule: React.FC = () => {
  const s = T.scene("schedule");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const top = 250;
  const rowH = 86;
  const axis = ease(frame, 6, 26);
  const back = progress(frame, L[0].from + 30, 50);
  return (
    <Frame id="schedule">
      <CadHeader no={5} title="수입 일정 · 창고 예약" />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {/* 축 */}
        <g opacity={axis}>
          <line x1={GX} y1={top - 20} x2={GX + GW} y2={top - 20} stroke={K.dim} strokeWidth={2} />
          {[-45, -30, -21, -14, -7, 0, 5].map((d) => (
            <g key={d}>
              <line x1={dx(d)} y1={top - 28} x2={dx(d)} y2={top + rowH * TASKS.length} stroke={K.minor.replace("0.07", "0.18")} strokeWidth={1} />
              {txt(dx(d), top - 36, d === 0 ? "D-day" : `D${d > 0 ? "+" : ""}${d}`, 21, d === 0 ? K.amber : K.sub, d === 0 ? 900 : 400, "middle")}
            </g>
          ))}
        </g>
        {/* 행 */}
        {TASKS.map((t, i) => {
          const y = top + i * rowH;
          const start = L[t.line].from + (t.line === 3 ? (i - 3) * 30 : t.line === 2 ? (i - 1) * 40 : 0);
          const p = progress(frame, start, 24);
          const on = li === t.line;
          const c = t.key ? K.amber : on ? K.cyan : K.dim;
          return (
            <g key={t.name} opacity={ease(frame, 10 + i * 4, 24 + i * 4)}>
              <line x1={90} y1={y + rowH} x2={GX + GW} y2={y + rowH} stroke={K.minor.replace("0.07", "0.2")} strokeWidth={1} />
              {txt(100, y + 40, t.name, 27, on || t.key ? (t.key ? K.amber : K.text) : K.sub, 900)}
              {t.sub ? txt(100, y + 70, t.sub, 19, K.sub) : null}
              {t.a === t.b ? (
                <polygon
                  points={`${dx(t.a)},${y + 18} ${dx(t.a) + 24},${y + 43} ${dx(t.a)},${y + 68} ${dx(t.a) - 24},${y + 43}`}
                  fill={K.amber}
                  opacity={p}
                />
              ) : (
                <rect
                  x={dx(t.a)}
                  y={y + 22}
                  width={(dx(t.b) - dx(t.a)) * p}
                  height={42}
                  fill={t.key ? "rgba(255,181,71,0.35)" : "rgba(94,200,242,0.28)"}
                  stroke={c}
                  strokeWidth={2.5}
                />
              )}
            </g>
          );
        })}
        {/* 입항 예정일 기준선 */}
        <g opacity={ease(frame, L[0].from, L[0].from + 14)}>
          <line x1={dx(0)} y1={top - 20} x2={dx(0)} y2={top + rowH * TASKS.length + 10} stroke={K.amber} strokeWidth={3} strokeDasharray="12 8" />
          {txt(dx(0), top + rowH * TASKS.length + 40, "입항 예정일", 24, K.amber, 900, "middle")}
        </g>
        {back > 0 ? (
          <g>
            <line x1={dx(0) - 10} y1={top - 70} x2={dx(0) - 10 - (dx(0) - dx(-45) - 20) * back} y2={top - 70} stroke={K.amber} strokeWidth={3} />
            <polygon
              points={`${dx(0) - 10 - (dx(0) - dx(-45) - 20) * back - 16},${top - 70} ${dx(0) - 10 - (dx(0) - dx(-45) - 20) * back},${top - 80} ${dx(0) - 10 - (dx(0) - dx(-45) - 20) * back},${top - 60}`}
              fill={K.amber}
            />
            {txt(dx(-22), top - 84, "입항일 기준 역산 계획", 22, K.amber, 700, "middle")}
          </g>
        ) : null}
        {/* 창고 예약 강조 */}
        {li === 2 ? (
          <g opacity={ease(frame, L[2].from, L[2].from + 12)}>
            <rect x={dx(-21) - 10} y={top + rowH + 12} width={dx(-14) - dx(-21) + 20} height={62} fill="none" stroke={K.amber} strokeWidth={3} strokeDasharray="10 6" />
          </g>
        ) : null}
        {txt(100, top + rowH * TASKS.length + 90, "※ 예시 일정입니다. 실제 기간은 관세사 · 창고 · 안전보건공단과 협의해 정하세요.", 21, K.sub)}
      </svg>
    </Frame>
  );
};

/* ───────────── 7. 안전 수칙 ───────────── */
export const Safety: React.FC = () => {
  const s = T.scene("safety");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const cx = 500;
  const cy = 640;
  const ang = frame * 1.4;
  const draw = progress(frame, 0, 30);
  const tool = ease(frame, L[1].from + 20, L[1].from + 50);
  const lock = ease(frame, L[3].from + 10, L[3].from + 24);
  const estop = ease(frame, L[4].from, L[4].from + 14);
  const pulse = 0.55 + 0.45 * Math.sin(frame / 5);
  const items = [
    { t: "투입구에 손 · 몸 금지", d: "재료는 전용 도구로 투입", icon: <IconNoEntry color={K.red} />, line: 1 },
    { t: "보호구 착용", d: "보안경 · 청력 보호구, 헐렁한 옷 금지", icon: <IconGlasses color={K.cyan} />, line: 2 },
    { t: "걸림 제거", d: "역회전 사용 또는 전원 차단 · 잠금 후", icon: <IconLock color={K.cyan} />, line: 3 },
    { t: "매일 작업 전 점검", d: "비상 정지 스위치 · 덮개 인터록", icon: <IconStop color={K.cyan} />, line: 4 },
  ];
  return (
    <Frame id="safety">
      <CadHeader no={6} title="작동 중 안전 수칙" />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <Hatch id="hatchRed" color={K.red} gap={14} />
        </defs>
        {/* 호퍼 · 파쇄실 단면 */}
        <D d={`M ${cx - 330} 230 L ${cx - 230} 420 L ${cx - 230} 820`} p={draw} w={3} />
        <D d={`M ${cx + 330} 230 L ${cx + 230} 420 L ${cx + 230} 820`} p={draw} w={3} />
        <Cutter cx={cx - 95} cy={cy} R={110} angle={ang} p={draw} />
        <Cutter cx={cx + 95} cy={cy} R={110} angle={-ang + 60} p={draw} back />
        {/* 위험 구역 */}
        <g opacity={ease(frame, L[1].from, L[1].from + 12) * (0.6 + 0.4 * pulse)}>
          <path d={`M ${cx - 300} 250 L ${cx + 300} 250 L ${cx + 230} 420 L ${cx + 230} ${cy} L ${cx - 230} ${cy} L ${cx - 230} 420 Z`} fill="url(#hatchRed)" opacity={0.35} />
          <path d={`M ${cx - 300} 250 L ${cx + 300} 250 L ${cx + 230} 420 L ${cx + 230} ${cy} L ${cx - 230} ${cy} L ${cx - 230} 420 Z`} fill="none" stroke={K.red} strokeWidth={3} strokeDasharray="14 8" />
          {txt(cx, 215, "위험 구역 · 손 투입 금지", 30, K.red, 900, "middle")}
        </g>
        {/* 전용 투입 도구 */}
        {tool > 0 ? (
          <g opacity={tool} transform={`translate(${(1 - tool) * 120} ${(1 - tool) * -120})`}>
            <line x1={cx + 340} y1={160} x2={cx + 90} y2={430} stroke={K.green} strokeWidth={12} strokeLinecap="round" />
            <rect x={cx + 40} y={420} width={110} height={26} fill={K.green} transform={`rotate(-47 ${cx + 95} 433)`} />
            {txt(cx + 360, 150, "전용 투입 도구", 26, K.green, 900)}
          </g>
        ) : null}
        {/* 전원 차단 · 잠금 */}
        {lock > 0 ? (
          <g opacity={lock}>
            <rect x={cx + 300} y={600} width={150} height={190} fill="rgba(10,26,47,0.9)" stroke={K.amber} strokeWidth={2.5} />
            {txt(cx + 375, 630, "주전원", 21, K.text, 700, "middle")}
            <rect x={cx + 352} y={650} width={46} height={80} fill="none" stroke={K.text} strokeWidth={2.5} />
            <rect x={cx + 360} y={690} width={30} height={32} fill={K.text} />
            <path d={`M ${cx + 362} 760 v -14 a 13 13 0 0 1 26 0 v 14`} fill="none" stroke={K.amber} strokeWidth={4} />
            <rect x={cx + 355} y={758} width={40} height={30} fill={K.amber} />
            {txt(cx + 375, 830, "OFF · 잠금", 22, K.amber, 900, "middle")}
          </g>
        ) : null}
        {/* 비상 정지 */}
        {estop > 0 ? (
          <g opacity={estop}>
            <circle cx={140} cy={330} r={48} fill="rgba(255,94,94,0.25)" stroke={K.red} strokeWidth={4} />
            <circle cx={140} cy={330} r={30} fill={K.red} />
            {txt(140, 412, "비상 정지", 24, K.red, 900, "middle")}
            <rect x={cx - 300} y={240} width={600} height={14} fill={K.amber} opacity={0.8} />
            {txt(cx, 285, "덮개 인터록", 22, K.amber, 900, "middle")}
          </g>
        ) : null}
      </svg>
      {items.map((it, i) => (
        <Note
          key={it.t}
          x={1110}
          y={200 + i * 150}
          w={740}
          start={L[it.line].from}
          active={li === it.line}
          title={it.t}
          desc={it.d}
          icon={it.icon}
          color={i === 0 ? K.red : K.cyan}
        />
      ))}
    </Frame>
  );
};

/* ───────────── 8. 마무리 ───────────── */
export const Outro: React.FC = () => {
  const s = T.scene("outro");
  const frame = useCurrentFrame();
  const iso = makeIso(1290, 600, 2.7);
  const fade = ease(frame, s.frames - 30, s.frames, 1, 0);
  const list = ["작동 원리 이해", "HS 코드 · 품목분류 확인", "자율안전확인 신고 · 증명서", "입항 전 창고 · 일정 예약", "작동 중 안전 수칙 준수"];
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Frame id="outro">
        <svg width={1920} height={1080} style={{ position: "absolute" }}>
          <MachineIso iso={iso} p={progress(frame, 0, 60)} />
        </svg>
        <div style={{ position: "absolute", left: 110, top: 200, fontFamily: FONT }}>
          <div style={{ color: K.cyan, fontSize: 26, fontWeight: 700, letterSpacing: 6, opacity: ease(frame, 4, 20) }}>CHECKLIST</div>
          <div style={{ color: K.text, fontSize: 64, fontWeight: 900, marginTop: 12, opacity: ease(frame, 10, 26) }}>
            수입 · 운용 체크리스트
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 40 }}>
            {list.map((t, i) => {
              const o = ease(frame, 20 + i * 14, 32 + i * 14);
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 20, opacity: o, transform: `translateX(${(1 - o) * -30}px)` }}>
                  <div style={{ width: 52, height: 52, background: K.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconCheck />
                  </div>
                  <div style={{ color: K.text, fontSize: 36, fontWeight: 700 }}>{t}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Frame>
    </AbsoluteFill>
  );
};
