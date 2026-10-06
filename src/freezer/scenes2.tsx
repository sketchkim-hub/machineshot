import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../components";

import { FONT } from "../theme";
import { lineAt } from "../timeline";
import { CadHeader, D, K, makeIso, progress } from "../shredder/cad";
import { FreezerIso } from "./drawing";
import { Frame, txt } from "./scenes1";
import { T } from "./timeline";

const boxEl = (x: number, y: number, w: number, h: number, lines: string[], on: boolean, o: number, sub?: string, color = K.cyan) => (
  <g opacity={o}>
    <rect x={x} y={y} width={w} height={h} fill={on ? "rgba(255,181,71,0.13)" : "rgba(10,26,47,0.85)"} stroke={on ? K.amber : color} strokeWidth={2.5} />
    {lines.map((l, k) => (
      <text
        key={k}
        x={x + w / 2}
        y={y + h / 2 + 10 - ((lines.length - 1) * 19) + k * 38 - (sub ? 12 : 0)}
        fill={on ? K.amber : K.text}
        fontSize={28}
        fontWeight={900}
        textAnchor="middle"
        fontFamily={FONT}
      >
        {l}
      </text>
    ))}
    {sub ? txt(x + w / 2, y + h - 16, sub, 19, K.sub, 400, "middle") : null}
  </g>
);

const arrowR = (x1: number, x2: number, y: number, o: number, c = K.cyan) => (
  <g opacity={o}>
    <line x1={x1} y1={y} x2={x2 - 14} y2={y} stroke={c} strokeWidth={3} />
    <polygon points={`${x2},${y} ${x2 - 16},${y - 9} ${x2 - 16},${y + 9}`} fill={c} />
  </g>
);

/* ───────────── 4. 냉동 능력 · 냉매 ───────────── */
export const Capacity: React.FC = () => {
  const s = T.scene("capacity");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const o = (k: number) => ease(frame, L[0].from + k * 12, L[0].from + 14 + k * 12);
  const curve = progress(frame, L[0].from + 30, 90);
  // 동결 곡선 (시간 → 중심 온도)
  const gx = 120;
  const gy = 400;
  const gw = 760;
  const gh = 420;
  const tY = (c: number) => gy + ((25 - c) / 50) * gh;
  const pts = [
    [0, 20],
    [0.12, 8],
    [0.24, 0],
    [0.3, -1],
    [0.55, -2],
    [0.66, -6],
    [0.8, -14],
    [1, -20],
  ];
  const d = pts.map(([t, c], i) => `${i ? "L" : "M"} ${gx + t * gw} ${tY(c)}`).join(" ");
  const conds = ["증발 온도", "제품 종류 · 크기 · 두께", "입고 · 출고 온도", "체류(냉동) 시간"];
  const refs = [
    { n: "암모니아 (R717)", d: "독성 · 가연성\n별도 안전 관리" },
    { n: "이산화탄소 (R744)", d: "매우 높은\n운전 압력" },
    { n: "프레온 계열 (HFC)", d: "R404A · R507A 등\n온실가스 감축 규제" },
  ];
  return (
    <Frame id="capacity">
      <CadHeader no={3} title="냉동 능력 · 냉매 확인" />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {/* 필요 능력 계산 흐름 */}
        {boxEl(110, 180, 300, 120, ["시간당 처리량"], li === 0, o(0), "kg/h")}
        {txt(445, 252, "×", 44, K.cyan, 900, "middle")}
        {boxEl(480, 180, 420, 120, ["입고 온도 → 목표 중심 온도"], li === 0, o(1), "온도 차 · 동결 잠열")}
        {txt(935, 252, "+", 44, K.cyan, 900, "middle")}
        {boxEl(970, 180, 260, 120, ["여유율"], li === 0, o(2), "포장 · 트레이 · 손실")}
        {txt(1265, 252, "=", 44, K.cyan, 900, "middle")}
        {boxEl(1300, 180, 400, 120, ["필요 냉동 능력"], true, o(3), "kW (RT)")}

        {/* 동결 곡선 */}
        <g opacity={ease(frame, L[0].from + 24, L[0].from + 40)}>
          <line x1={gx} y1={gy} x2={gx} y2={gy + gh} stroke={K.dim} strokeWidth={2} />
          <line x1={gx} y1={tY(0)} x2={gx + gw} y2={tY(0)} stroke={K.dim} strokeWidth={1.2} strokeDasharray="8 6" />
          <line x1={gx} y1={gy + gh} x2={gx + gw} y2={gy + gh} stroke={K.dim} strokeWidth={2} />
          {txt(gx + 8, gy - 14, "제품 중심 온도", 20, K.cyan, 700)}
          {txt(gx + gw, gy + gh + 30, "시간 →", 20, K.sub, 400, "end")}
          {txt(gx - 10, tY(0) + 6, "0 °C", 18, K.dim, 400, "end")}
          <rect x={gx + 0.27 * gw} y={tY(4)} width={0.33 * gw} height={tY(-7) - tY(4)} fill="rgba(94,200,242,0.10)" />
          {txt(gx + 0.43 * gw, tY(5) - 6, "동결 구간 (잠열)", 19, K.cyan, 700, "middle")}
          <line x1={gx} y1={tY(-18)} x2={gx + gw} y2={tY(-18)} stroke={K.green} strokeWidth={1.5} strokeDasharray="6 6" />
          {txt(gx + 10, tY(-18) - 10, "목표 중심 온도 (예: -18 °C)", 19, K.green, 700)}
          {txt(gx + 14, tY(20) - 10, "입고 온도", 19, K.amber, 700)}
        </g>
        <D d={d} p={curve} color={K.amber} w={4} />

        {/* 제조사 제시 능력 조건 확인 */}
        <g opacity={ease(frame, L[1].from, L[1].from + 14)}>
          <rect x={980} y={390} width={870} height={230} fill={li === 1 ? "rgba(255,181,71,0.10)" : "rgba(10,26,47,0.85)"} stroke={li === 1 ? K.amber : K.cyan} strokeWidth={2.5} />
          {txt(1005, 428, "제조사 제시 능력 → 어떤 조건의 값인가?", 26, li === 1 ? K.amber : K.text, 900)}
          {conds.map((c, i) => {
            const on = frame >= L[1].from + 12 + i * 14;
            return (
              <g key={c} opacity={on ? 1 : 0.25}>
                <rect x={1005 + (i % 2) * 420} y={455 + Math.floor(i / 2) * 70} width={34} height={34} fill={on ? K.green : "none"} stroke={on ? K.green : K.dim} strokeWidth={2} />
                {on ? <path d={`M ${1012 + (i % 2) * 420} ${472 + Math.floor(i / 2) * 70} l 8 8 l 14 -16`} fill="none" stroke={K.bg} strokeWidth={3.5} /> : null}
                {txt(1052 + (i % 2) * 420, 481 + Math.floor(i / 2) * 70, c, 24, K.text, 700)}
              </g>
            );
          })}
        </g>

        {/* 냉매 종류 */}
        {refs.map((r, i) => {
          const x = 980 + i * 295;
          const oo = ease(frame, L[2].from + 30 + i * 18, L[2].from + 44 + i * 18);
          return (
            <g key={r.n} opacity={oo}>
              <rect x={x} y={650} width={280} height={190} fill={li === 2 ? "rgba(255,181,71,0.10)" : "rgba(10,26,47,0.85)"} stroke={li === 2 ? K.amber : K.cyan} strokeWidth={2.5} />
              {txt(x + 140, 692, r.n, 23, li === 2 ? K.amber : K.text, 900, "middle")}
              {r.d.split("\n").map((l, k) => txt(x + 140, 745 + k * 34, l, 22, K.sub, 700, "middle"))}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
};

/* ───────────── 5. 세관장 확인 · 전기 · 전파 ───────────── */
export const Customs: React.FC = () => {
  const s = T.scene("customs");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const flow = ["해외 제조사\n자료 준비", "국내 인증\n시험 · 평가", "수입신고\n세관장 확인", "통관 · 반출"];
  const docs = ["시험 성적서", "회로도 · 부품 목록", "부품 인증서", "사용 설명서"];
  const delay = ["자료 지연", "인증 지연", "통관 지연", "설치 지연"];
  return (
    <Frame id="customs">
      <CadHeader no={4} title="세관장 확인 · 전기 · 전파 인증" />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {flow.map((f, i) => {
          const x = 110 + i * 440;
          const on = (li === 0 && (i === 1 || i === 2)) || (li === 1 && i === 0);
          return (
            <g key={f}>
              {boxEl(x, 175, 360, 130, f.split("\n"), on, ease(frame, L[0].from + i * 12, L[0].from + 14 + i * 12))}
              {i > 0 ? arrowR(x - 75, x - 6, 240, ease(frame, L[0].from + i * 12, L[0].from + 14 + i * 12)) : null}
            </g>
          );
        })}
        {/* 두 가지 인증 */}
        {[
          { t: "전기안전 인증", d: "전기용품 및 생활용품 안전관리법", k: "KC 안전" },
          { t: "전파법 적합성평가", d: "전자파 적합성 (EMC)", k: "KC 적합성" },
        ].map((c, i) => {
          const x = 550 + i * 440 - (i ? 0 : 0);
          const oo = ease(frame, L[0].from + 60 + i * 20, L[0].from + 76 + i * 20);
          return (
            <g key={c.t} opacity={oo}>
              <line x1={x + 180} y1={305} x2={x + 180} y2={345} stroke={K.dim} strokeWidth={1.5} strokeDasharray="6 5" />
              <rect x={x} y={345} width={360} height={150} fill={li === 0 ? "rgba(255,181,71,0.10)" : "rgba(10,26,47,0.85)"} stroke={li === 0 ? K.amber : K.cyan} strokeWidth={2.5} />
              <circle cx={x + 58} cy={420} r={38} fill="none" stroke={K.text} strokeWidth={3} />
              {txt(x + 58, 428, "KC", 24, K.text, 900, "middle")}
              {txt(x + 110, 400, c.t, 25, li === 0 ? K.amber : K.text, 900)}
              {txt(x + 110, 435, c.d, 17, K.sub)}
              {txt(x + 110, 470, c.k, 17, K.cyan, 700)}
            </g>
          );
        })}
        {/* 해외 제조사 준비 자료 */}
        <g opacity={ease(frame, L[1].from, L[1].from + 14)}>
          {txt(110, 548, "해외 제조사가 미리 준비할 자료 (예)", 24, K.cyan, 700)}
          {docs.map((dname, i) => {
            const x = 110 + i * 240;
            const oo = ease(frame, L[1].from + 10 + i * 14, L[1].from + 24 + i * 14);
            return (
              <g key={dname} opacity={oo}>
                <path d={`M ${x} 570 h 130 l 36 36 v 120 h -166 Z M ${x + 130} 570 v 36 h 36`} fill="rgba(10,26,47,0.85)" stroke={li === 1 ? K.amber : K.line} strokeWidth={2.5} strokeLinejoin="round" />
                {[0, 1, 2, 3].map((k) => (
                  <line key={k} x1={x + 20} y1={630 + k * 20} x2={x + 146 - (k === 3 ? 40 : 0)} y2={630 + k * 20} stroke={K.dim} strokeWidth={2} />
                ))}
                {txt(x + 83, 760, dname, 21, K.text, 700, "middle")}
              </g>
            );
          })}
        </g>
        {/* 지연 연쇄 */}
        {delay.map((dl, i) => {
          const start = L[2].from + 10 + i * 16;
          const oo = ease(frame, start, start + 10);
          const tilt = interpolate(frame, [start + 10, start + 22], [0, 14], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x = 1110 + i * 190;
          return (
            <g key={dl} opacity={oo} transform={`rotate(${li === 2 ? tilt : 0} ${x + 140} 760)`}>
              <rect x={x} y={590} width={150} height={170} fill="rgba(255,94,94,0.12)" stroke={K.red} strokeWidth={2.5} />
              {txt(x + 75, 685, dl, 24, K.red, 900, "middle")}
            </g>
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 1110,
          top: 785,
          width: 760,
          padding: li === 3 ? "10px 16px" : 0,
          border: li === 3 ? `2px solid ${K.amber}` : "none",
          background: li === 3 ? "rgba(255,181,71,0.12)" : "transparent",
          fontFamily: FONT,
          fontSize: li === 3 ? 23 : 19,
          fontWeight: li === 3 ? 900 : 400,
          color: li === 3 ? K.amber : K.sub,
          opacity: ease(frame, L[0].from + 80, L[0].from + 96),
        }}
      >
        ※ 적용 대상과 인증 범위는 제품 구성(전기 · 무선 부품)에 따라 다름 → 계약 전 국내 인증 기관과 확인
      </div>
    </Frame>
  );
};

/* ───────────── 6. 고압가스 안전검사 ───────────── */
const STEPS = [
  { t: "한국 기준 전달 (제작 전)", lines: [6] },
  { t: "1차 서류 검사", lines: [1, 2] },
  { t: "2차 현장 검사", lines: [1] },
  { t: "내진 설계 · 앵커 고정", lines: [3] },
  { t: "질소 가압 시험", lines: [4, 5] },
  { t: "중간검사", lines: [7] },
  { t: "냉매 충전 → 완성검사", lines: [7] },
];

export const Gas: React.FC = () => {
  const s = T.scene("gas");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  // 압력용기 (수평 수액기)
  const vx = 940;
  const vy = 420;
  const vw = 620;
  const vh = 190;
  const shake = li === 3 ? Math.sin(frame / 2.2) * 6 * ease(frame, L[3].from + 10, L[3].from + 20) : 0;
  const n2 = ease(frame, L[4].from, L[4].from + 14);
  const press = interpolate(frame, [L[4].from + 20, L[4].from + 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const burst = li === 5 ? ease(frame, L[5].from + 25, L[5].from + 32) : 0;
  const drop = li === 5 ? interpolate(frame, [L[5].from + 30, L[5].from + 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const good = li >= 6;
  const gaugeVal = li >= 4 ? press * (1 - drop * 0.85) : 0;
  const needle = -120 + 240 * gaugeVal * 0.82;
  const fill = li === 7 ? ease(frame, L[7].from + 40, L[7].from + L[7].frames - 10) : 0;
  const stamp = li === 7 ? ease(frame, L[7].from + L[7].frames - 30, L[7].from + L[7].frames - 15) : 0;
  const badValve = li === 5;
  const valveColor = badValve ? K.red : good ? K.green : K.line;
  const valve = (x: number, y: number, c: string, w = 3) => (
    <g>
      <path d={`M ${x - 22} ${y - 14} L ${x + 22} ${y + 14} L ${x + 22} ${y - 14} L ${x - 22} ${y + 14} Z`} fill="rgba(10,26,47,0.9)" stroke={c} strokeWidth={w} strokeLinejoin="round" />
      <line x1={x} y1={y} x2={x} y2={y - 26} stroke={c} strokeWidth={w} />
      <line x1={x - 14} y1={y - 26} x2={x + 14} y2={y - 26} stroke={c} strokeWidth={w} />
    </g>
  );
  return (
    <Frame id="gas">
      <CadHeader no={5} title="고압가스 안전검사" />
      {/* 단계 목록 */}
      {STEPS.map((st, i) => {
        const last = Math.max(...st.lines);
        const done = li > last || (li === 7 && last === 7 && frame > L[7].from + L[7].frames - 20);
        const on = st.lines.includes(li);
        return (
          <div
            key={st.t}
            style={{
              position: "absolute",
              left: 90,
              top: 178 + i * 92,
              width: 600,
              height: 76,
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "0 18px",
              border: `2px solid ${on ? K.amber : done ? K.green : "rgba(134,180,224,0.4)"}`,
              background: on ? "rgba(255,181,71,0.13)" : "rgba(10,26,47,0.8)",
              fontFamily: FONT,
              opacity: ease(frame, 6 + i * 5, 18 + i * 5),
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                flex: "0 0 42px",
                background: done ? K.green : on ? K.amber : "transparent",
                border: `2px solid ${done ? K.green : on ? K.amber : K.dim}`,
                color: done || on ? K.bg : K.dim,
                fontSize: 22,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </div>
            <div style={{ color: on ? K.amber : K.text, fontSize: 28, fontWeight: 900 }}>{st.t}</div>
          </div>
        );
      })}
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <g transform={`translate(${shake} 0)`}>
          {/* 용기 본체 */}
          <D
            d={`M ${vx + vh / 2} ${vy} H ${vx + vw - vh / 2} A ${vh / 2} ${vh / 2} 0 0 1 ${vx + vw - vh / 2} ${vy + vh} H ${vx + vh / 2} A ${vh / 2} ${vh / 2} 0 0 1 ${vx + vh / 2} ${vy}`}
            p={progress(frame, 0, 40)}
            w={3.5}
            color={li === 0 ? K.amber : K.line}
            fill="rgba(94,200,242,0.05)"
          />
          {/* 냉매 충전 수위 */}
          {fill > 0 ? (
            <clipPath id="vclip">
              <rect x={vx} y={vy} width={vw} height={vh} rx={vh / 2} />
            </clipPath>
          ) : null}
          {fill > 0 ? <rect x={vx} y={vy + vh * (1 - 0.6 * fill)} width={vw} height={vh} fill="rgba(94,200,242,0.35)" clipPath="url(#vclip)" /> : null}
          {txt(vx + vw / 2, vy + vh / 2 + 10, fill > 0 ? "냉매 충전" : "압력용기 (수액기)", 28, fill > 0 ? K.cyan : K.sub, 900, "middle")}
          {/* 노즐 · 밸브 */}
          {[vx + 160, vx + vw - 160].map((x, i) => (
            <g key={x} opacity={progress(frame, 20, 20)}>
              <line x1={x} y1={vy} x2={x} y2={vy - 40} stroke={K.line} strokeWidth={3} />
              {valve(x, vy - 54, i === 1 ? valveColor : K.line, i === 1 && (badValve || good) ? 4 : 3)}
            </g>
          ))}
          {/* 압력계 */}
          <g opacity={progress(frame, 24, 20)}>
            <line x1={vx + vw / 2} y1={vy} x2={vx + vw / 2} y2={vy - 60} stroke={K.line} strokeWidth={3} />
            <circle cx={vx + vw / 2} cy={vy - 112} r={52} fill="rgba(10,26,47,0.95)" stroke={K.line} strokeWidth={3} />
            <path d={`M ${vx + vw / 2 + 44 * Math.cos((-210 * Math.PI) / 180)} ${vy - 112 + 44 * Math.sin((-210 * Math.PI) / 180)} A 44 44 0 1 1 ${vx + vw / 2 + 44 * Math.cos((30 * Math.PI) / 180)} ${vy - 112 + 44 * Math.sin((30 * Math.PI) / 180)}`} fill="none" stroke={K.dim} strokeWidth={2} />
            {/* 시험 압력 표시 */}
            <line
              x1={vx + vw / 2 + 36 * Math.cos(((-90 + 240 * 0.82 - 120) * Math.PI) / 180)}
              y1={vy - 112 + 36 * Math.sin(((-90 + 240 * 0.82 - 120) * Math.PI) / 180)}
              x2={vx + vw / 2 + 50 * Math.cos(((-90 + 240 * 0.82 - 120) * Math.PI) / 180)}
              y2={vy - 112 + 50 * Math.sin(((-90 + 240 * 0.82 - 120) * Math.PI) / 180)}
              stroke={K.amber}
              strokeWidth={4}
              opacity={n2}
            />
            <line
              x1={vx + vw / 2}
              y1={vy - 112}
              x2={vx + vw / 2 + 40 * Math.cos(((-90 + needle) * Math.PI) / 180)}
              y2={vy - 112 + 40 * Math.sin(((-90 + needle) * Math.PI) / 180)}
              stroke={drop > 0.3 ? K.red : K.amber}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <circle cx={vx + vw / 2} cy={vy - 112} r={6} fill={K.line} />
            {txt(vx + vw / 2 + 66, vy - 150, n2 > 0 ? "시험 압력" : "", 20, K.amber, 700)}
          </g>
          {/* 받침 · 앵커 */}
          {[vx + 130, vx + vw - 130].map((x) => (
            <g key={x} opacity={progress(frame, 30, 20)}>
              <path d={`M ${x - 60} ${vy + vh + 50} L ${x - 30} ${vy + vh - 6} L ${x + 30} ${vy + vh - 6} L ${x + 60} ${vy + vh + 50} Z`} fill="rgba(10,26,47,0.9)" stroke={K.line} strokeWidth={2.5} />
              {[-42, 42].map((dx) => (
                <g key={dx}>
                  <line x1={x + dx} y1={vy + vh + 30} x2={x + dx} y2={vy + vh + 80} stroke={li === 3 ? K.amber : K.dim} strokeWidth={li === 3 ? 6 : 3} />
                  <rect x={x + dx - 9} y={vy + vh + 42} width={18} height={8} fill={li === 3 ? K.amber : K.dim} />
                </g>
              ))}
            </g>
          ))}
        </g>
        {/* 바닥 · 기초 */}
        <g opacity={progress(frame, 30, 20)}>
          <line x1={vx - 80} y1={vy + vh + 50} x2={vx + vw + 80} y2={vy + vh + 50} stroke={K.line} strokeWidth={3} />
          {Array.from({ length: 28 }).map((_, i) => (
            <line key={i} x1={vx - 70 + i * 28} y1={vy + vh + 50} x2={vx - 90 + i * 28} y2={vy + vh + 72} stroke={K.dim} strokeWidth={1.5} />
          ))}
        </g>
        {li === 3 ? (
          <g opacity={ease(frame, L[3].from + 6, L[3].from + 18)}>
            {[0, 1].map((k) => (
              <g key={k} transform={`translate(${k ? vx + vw + 40 : vx - 150} ${vy + vh / 2})`}>
                <path d="M 0 0 h 110 M 0 0 l 18 -12 M 0 0 l 18 12 M 110 0 l -18 -12 M 110 0 l -18 12" stroke={K.amber} strokeWidth={4} fill="none" />
              </g>
            ))}
            {txt(vx + vw / 2, vy + vh + 118, "내진 설계 · 앵커 볼트로 기초에 고정", 26, K.amber, 900, "middle")}
          </g>
        ) : null}
        {/* 질소 용기 */}
        {n2 > 0 && li >= 4 && li <= 5 ? (
          <g opacity={n2}>
            <rect x={760} y={330} width={80} height={250} rx={36} fill="rgba(10,26,47,0.95)" stroke={K.cyan} strokeWidth={3} />
            <rect x={784} y={300} width={32} height={34} fill="none" stroke={K.cyan} strokeWidth={3} />
            {txt(800, 470, "N₂", 32, K.cyan, 900, "middle")}
            {txt(800, 620, "질소", 22, K.cyan, 700, "middle")}
            <path d={`M 800 300 C 800 250, ${vx + 160} 250, ${vx + 160} ${vy - 80}`} fill="none" stroke={K.cyan} strokeWidth={3} strokeDasharray="10 7" strokeDashoffset={-frame * 2} />
          </g>
        ) : null}
        {li === 4 ? (
          <g opacity={ease(frame, L[4].from + 60, L[4].from + 75)}>
            {txt(vx + vw / 2, vy + vh + 118, "일정 압력을 걸고 → 압력 유지(누설 · 변형 없음) 확인", 25, K.green, 900, "middle")}
          </g>
        ) : null}
        {/* 규격 미달 밸브 파열 */}
        {burst > 0 ? (
          <g opacity={burst}>
            {Array.from({ length: 10 }).map((_, i) => {
              const a = (i * 36 * Math.PI) / 180;
              const cx = vx + vw - 160;
              const cy = vy - 54;
              return <line key={i} x1={cx + 30 * Math.cos(a)} y1={cy + 30 * Math.sin(a)} x2={cx + (70 + (i % 2) * 30) * Math.cos(a)} y2={cy + (70 + (i % 2) * 30) * Math.sin(a)} stroke={K.red} strokeWidth={4} />;
            })}
            {txt(vx + vw / 2, vy + vh + 118, "한국 규격에 맞지 않는 밸브 → 압력을 못 견디고 파열", 25, K.red, 900, "middle")}
          </g>
        ) : null}
        {/* 1차 서류 검사 내용 */}
        {li === 2 ? (
          <g opacity={ease(frame, L[2].from, L[2].from + 14)}>
            {["설계 도면", "강도 계산서", "재료 증명서"].map((t, i) => (
              <g key={t}>
                <path d={`M ${880 + i * 260} 700 h 150 l 34 34 v 70 h -184 Z`} fill="rgba(10,26,47,0.9)" stroke={K.amber} strokeWidth={2.5} strokeLinejoin="round" opacity={ease(frame, L[2].from + i * 14, L[2].from + 12 + i * 14)} />
                <g opacity={ease(frame, L[2].from + i * 14, L[2].from + 12 + i * 14)}>{txt(880 + i * 260 + 92, 778, t, 24, K.text, 900, "middle")}</g>
              </g>
            ))}
          </g>
        ) : null}
        {/* 제조사에 기준 전달 */}
        {li === 6 ? (
          <g opacity={ease(frame, L[6].from, L[6].from + 14)}>
            <rect x={790} y={700} width={330} height={90} fill="rgba(10,26,47,0.9)" stroke={K.amber} strokeWidth={2.5} />
            {txt(955, 755, "한국 가스 검사 기준", 25, K.amber, 900, "middle")}
            {arrowR(1130, 1260, 745, ease(frame, L[6].from + 14, L[6].from + 26), K.amber)}
            <rect x={1270} y={700} width={290} height={90} fill="rgba(10,26,47,0.9)" stroke={K.cyan} strokeWidth={2.5} />
            {txt(1415, 755, "해외 제조사", 25, K.text, 900, "middle")}
            {arrowR(1570, 1680, 745, ease(frame, L[6].from + 30, L[6].from + 42), K.green)}
            <g opacity={ease(frame, L[6].from + 40, L[6].from + 54)}>
              <rect x={1690} y={680} width={190} height={130} fill="rgba(92,208,142,0.15)" stroke={K.green} strokeWidth={2.5} />
              {txt(1785, 730, "기준 충족", 24, K.green, 900, "middle")}
              {txt(1785, 765, "밸브 · 용기", 19, K.text, 700, "middle")}
              {txt(1785, 792, "배관 · 안전밸브", 19, K.text, 700, "middle")}
            </g>
          </g>
        ) : null}
        {/* 완성검사 도장 */}
        {stamp > 0 ? (
          <g opacity={stamp} transform={`rotate(-12 ${vx + vw - 60} ${vy + vh + 120}) translate(${vx + vw - 170} ${vy + vh + 80}) scale(${1.4 - 0.4 * stamp})`}>
            <rect x={0} y={0} width={230} height={76} fill="rgba(92,208,142,0.12)" stroke={K.green} strokeWidth={4} />
            {txt(115, 50, "완성검사 합격", 28, K.green, 900, "middle")}
          </g>
        ) : null}
      </svg>
    </Frame>
  );
};

/* ───────────── 7. 요약 ───────────── */
export const Outro: React.FC = () => {
  const s = T.scene("outro");
  const frame = useCurrentFrame();
  const L = s.lines;
  const fade = ease(frame, s.frames - 30, s.frames, 1, 0);
  const iso = makeIso(980, 330, 0.95);
  const nodes = [
    ["배치도", "평면 · 동선"],
    ["냉동 능력", "조건 확인"],
    ["냉매", "규제 · 안전"],
    ["인증 자료", "전기 · 전파"],
    ["가스 기준", "부품 사양"],
    ["통관", "세관장 확인"],
    ["검사", "중간 · 완성"],
    ["가동", ""],
  ];
  const x0 = 140;
  const step = 235;
  const y = 640;
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Frame id="outro">
        <CadHeader no={6} title="수입 준비 요약" />
        <svg width={1920} height={1080} style={{ position: "absolute" }}>
          <FreezerIso iso={iso} p={progress(frame, 0, 50)} frame={frame} products air />
          <line x1={x0} y1={y} x2={x0 + step * 7 * progress(frame, L[1].from, L[1].frames * 0.8)} y2={y} stroke={K.cyan} strokeWidth={4} />
          {nodes.map(([a, b], i) => {
            const t = L[1].from + (L[1].frames * 0.8 * i) / 7;
            const o = ease(frame, t - 6, t + 6);
            const last = i === nodes.length - 1;
            return (
              <g key={a} opacity={Math.max(0.25, o)}>
                <circle cx={x0 + i * step} cy={y} r={22} fill={o >= 1 ? (last ? K.green : K.amber) : K.bg} stroke={last ? K.green : K.amber} strokeWidth={3} />
                {txt(x0 + i * step, y - 42, i < 5 ? "계약 전" : "", 17, K.sub, 400, "middle")}
                {txt(x0 + i * step, y + 62, a, 27, K.text, 900, "middle")}
                {b ? txt(x0 + i * step, y + 96, b, 20, K.sub, 700, "middle") : null}
              </g>
            );
          })}
          <g opacity={ease(frame, L[0].from, L[0].from + 14)}>
            <rect x={x0 - 40} y={y - 75} width={step * 4 + 80} height={210} fill="none" stroke={K.amber} strokeWidth={2} strokeDasharray="12 8" />
            {txt(x0 - 30, y - 88, "계약 단계부터 챙길 것", 22, K.amber, 900)}
          </g>
        </svg>
      </Frame>
    </AbsoluteFill>
  );
};

