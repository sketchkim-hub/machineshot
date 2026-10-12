import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { fade } from "@remotion/transitions/fade";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { Callout, Captions, ease, Narration } from "../components";
import { FONT } from "../theme";
import { lineAt, makeTimeline, TRANSITION } from "../timeline";
import { CadHeader, K, Note, Sheet, TitleBlock } from "../shredder/cad";
import anchors from "./anchors.json";
import narration from "./narration.json";

const T = makeTimeline(narration);
const SHEETS = T.scenes.map((s) => s.id);
export const STICKPACK_FRAMES = T.total;

const pad = (n: number) => String(n).padStart(3, "0");
const mod = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
/** 0~119 영웅 컷을 왕복 재생 (정면 120° 궤도) */
const pingpong = (t: number) => {
  const p = mod(t, 238);
  return p < 120 ? p : 238 - p;
};
const img = {
  hero: (i: number) => staticFile(`render3d_sp/hero/h${pad(pingpong(i))}.png`),
  seal: (i: number) => staticFile(`render3d_sp/seal/s${pad(mod(i, 60))}.png`),
  top: (i: number) => staticFile(`render3d_sp/top/t${pad(mod(i, 60))}.png`),
};
type Key = keyof typeof anchors.seal;
const at = (a: Record<string, number[]>, k: Key): [number, number] => [a[k][0], a[k][1]];

const txt = (x: number, y: number, s: string, size: number, color: string, weight = 400, anchor: "start" | "middle" | "end" = "start") => (
  <text x={x} y={y} fill={color} fontSize={size} fontWeight={weight} textAnchor={anchor} fontFamily={FONT}>
    {s}
  </text>
);

const Frame: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const s = T.scene(id);
  return (
    <AbsoluteFill>
      {children}
      <TitleBlock title={s.title} sheet={SHEETS.indexOf(id) + 1} total={SHEETS.length} prefix="STK" />
      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};

const Shot: React.FC<{ src: string; x: number; y: number; w: number; opacity?: number; children?: (w: number, h: number) => React.ReactNode }> = ({
  src,
  x,
  y,
  w,
  opacity = 1,
  children,
}) => {
  const h = (w * 9) / 16;
  if (opacity <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity }}>
      <Img src={src} style={{ width: "100%", height: "100%" }} />
      {children ? children(w, h) : null}
    </div>
  );
};

const C: React.FC<{ a: [number, number]; w: number; label: string; dx: number; dy: number; start: number; end?: number }> = (p) => (
  <Callout at={p.a} w={p.w} label={p.label} dx={p.dx} dy={p.dy} start={p.start} end={p.end} aspect={16 / 9} />
);

const chip = (t: string, c: string, key?: string, o = 1, size = 27) => (
  <div key={key ?? t} style={{ padding: "11px 20px", border: `2.5px solid ${c}`, background: "rgba(10,26,47,0.9)", color: c, fontSize: size, fontWeight: 900, fontFamily: FONT, opacity: o }}>
    {t}
  </div>
);

/** 문장 k 동안만 보이는 투명도 (앞뒤로 살짝 겹침) */
const during = (frame: number, L: { from: number }[], k: number, ks: number[] = [k]) => {
  const a = Math.min(...ks);
  const b = Math.max(...ks);
  const fin = ease(frame, L[a].from - 8, L[a].from + 6);
  const fout = b + 1 < L.length ? ease(frame, L[b + 1].from - 8, L[b + 1].from + 4, 1, 0) : 1;
  return Math.min(fin, fout);
};

/* ───────────── 1. 인트로 ───────────── */
const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Frame id="intro">
      <Shot src={img.hero(frame * 0.5 + 30)} x={560} y={70} w={1450} opacity={ease(frame, 0, 20)} />
      <div style={{ position: "absolute", left: 100, top: 240, fontFamily: FONT }}>
        <div style={{ color: K.cyan, fontSize: 26, fontWeight: 700, letterSpacing: 6, opacity: ease(frame, 10, 30) }}>MULTI-LANE STICK PACKING MACHINE</div>
        <div style={{ color: K.text, fontSize: 96, fontWeight: 900, lineHeight: 1.12, marginTop: 16, opacity: ease(frame, 20, 42) }}>
          다열
          <br />
          스틱 포장기
        </div>
        <div style={{ width: 160 * ease(frame, 34, 56), height: 6, background: K.amber, margin: "28px 0 24px" }} />
        <div style={{ color: K.sub, fontSize: 32, fontWeight: 700, opacity: ease(frame, 34, 56) }}>액상 · 과립 · 분말</div>
      </div>
    </Frame>
  );
};

/* ───────────── 2. 작동 원리 ───────────── */
const STEPS = [
  { t: "필름 풀림", l: 0 },
  { t: "슬리팅 (6열 분리)", l: 0 },
  { t: "튜브 성형 · 세로 실링", l: 1 },
  { t: "바닥 가로 실링", l: 2 },
  { t: "정량 충전", l: 2 },
  { t: "윗면 실링 · 커팅", l: 3 },
  { t: "배출 컨베이어", l: 3 },
];

const Principle: React.FC = () => {
  const s = T.scene("principle");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const W = 1360;
  const hi = 40 + frame * 0.15;
  const Hh = anchors.hero[pingpong(hi)];
  return (
    <Frame id="principle">
      <CadHeader no={1} title="작동 원리" />
      <Shot src={img.hero(hi)} x={10} y={150} w={W} opacity={during(frame, L, 0)}>
        {(w) => (
          <>
            <div style={{ position: "absolute", left: 30, top: 24, padding: "10px 18px", border: `2.5px solid ${K.cyan}`, background: "rgba(10,26,47,0.88)", color: K.cyan, fontFamily: FONT, fontSize: 27, fontWeight: 900, opacity: ease(frame, L[0].from + 8, L[0].from + 20) }}>
              필름 롤은 기계 뒤쪽에서 공급
            </div>
            <C a={at(Hh, "slitter")} w={w} label="슬리터 → 6열로 분리" dx={-230} dy={-80} start={L[0].from + 50} />
          </>
        )}
      </Shot>
      <Shot src={img.seal(frame)} x={10} y={150} w={W} opacity={Math.max(during(frame, L, 1), during(frame, L, 3))}>
        {(w) => (
          <>
            {li === 1 ? (
              <>
                <C a={[0.355, 0.42]} w={w} label="성형 튜브 (필름이 감쌈)" dx={250} dy={120} start={L[1].from + 8} />
                <C a={at(anchors.seal, "vseal")} w={w} label="세로 실링 바" dx={240} dy={-60} start={L[1].from + 40} />
              </>
            ) : null}
            {li === 3 ? (
              <>
                <C a={at(anchors.seal, "jaws")} w={w} label="가로 실링 조" dx={230} dy={-50} start={L[3].from + 8} />
                <C a={at(anchors.seal, "cutter")} w={w} label="커터" dx={-200} dy={60} start={L[3].from + 30} />
              </>
            ) : null}
          </>
        )}
      </Shot>
      <Shot src={img.top(frame)} x={10} y={150} w={W} opacity={during(frame, L, 2)}>
        {(w) => <C a={at(anchors.top, "dosing")} w={w} label="계량 장치 → 정량 충전" dx={-240} dy={-60} start={L[2].from + 8} />}
      </Shot>
      <div style={{ position: "absolute", left: 1410, top: 170, display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT }}>
        {STEPS.map((st, i) => {
          const on = li === st.l;
          const done = li > st.l;
          return (
            <React.Fragment key={st.t}>
              {i ? <div style={{ color: K.dim, fontSize: 18, textAlign: "center", lineHeight: 1 }}>▼</div> : null}
              <div
                style={{
                  width: 460,
                  padding: "10px 16px",
                  border: `2px solid ${on ? K.amber : done ? K.green : "rgba(134,180,224,0.4)"}`,
                  background: on ? "rgba(255,181,71,0.13)" : "rgba(10,26,47,0.85)",
                  color: on ? K.amber : K.text,
                  fontSize: 25,
                  fontWeight: 900,
                  opacity: ease(frame, 6 + i * 5, 18 + i * 5),
                }}
              >
                {i + 1}. {st.t}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </Frame>
  );
};

/* ───────────── 3. 계량 방식 ───────────── */
const PumpIcon: React.FC<{ f: number; c: string }> = ({ f, c }) => {
  const y = 20 * Math.sin(f / 6);
  return (
    <svg width={300} height={300} viewBox="0 0 220 220">
      <rect x={70} y={30} width={80} height={130} fill="none" stroke={c} strokeWidth={4} />
      <rect x={74} y={70 + y} width={72} height={16} fill={c} />
      <line x1={110} y1={20} x2={110} y2={70 + y} stroke={c} strokeWidth={6} />
      <rect x={76} y={86 + y} width={68} height={70 - y} fill="rgba(94,200,242,0.35)" />
      <path d="M 110 160 v 30" stroke={c} strokeWidth={6} />
      <circle cx={110} cy={202 + (f % 20)} r={6} fill={K.cyan} opacity={1 - (f % 20) / 20} />
    </svg>
  );
};
const CupIcon: React.FC<{ f: number; c: string }> = ({ f, c }) => (
  <svg width={300} height={300} viewBox="0 0 220 220">
    <g transform={`rotate(${f * 2} 110 110)`}>
      <circle cx={110} cy={110} r={80} fill="none" stroke={c} strokeWidth={4} />
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i * 60 * Math.PI) / 180;
        return <rect key={i} x={110 + 55 * Math.cos(a) - 14} y={110 + 55 * Math.sin(a) - 14} width={28} height={28} fill="rgba(255,181,71,0.3)" stroke={c} strokeWidth={3} />;
      })}
    </g>
    {Array.from({ length: 8 }).map((_, i) => (
      <circle key={i} cx={100 + (i % 4) * 7} cy={196 + Math.floor(i / 4) * 8} r={3.5} fill={K.amber} />
    ))}
  </svg>
);
const AugerIcon: React.FC<{ f: number; c: string }> = ({ f, c }) => (
  <svg width={300} height={300} viewBox="0 0 220 220">
    <path d="M 50 20 L 170 20 L 130 80 L 90 80 Z" fill="none" stroke={c} strokeWidth={4} />
    <rect x={88} y={80} width={44} height={110} fill="none" stroke={c} strokeWidth={4} />
    <line x1={110} y1={10} x2={110} y2={190} stroke={c} strokeWidth={4} />
    {Array.from({ length: 8 }).map((_, i) => {
      const yy = 30 + i * 20 - ((f * 1.5) % 20);
      return <path key={i} d={`M 92 ${yy} L 128 ${yy + 12}`} stroke={c} strokeWidth={3} />;
    })}
    <ellipse cx={110} cy={203} rx={18} ry={6} fill="rgba(234,243,255,0.6)" />
  </svg>
);

const Dosing: React.FC = () => {
  const s = T.scene("dosing");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const items = [
    { t: "액상", m: "피스톤 펌프", Icon: PumpIcon, ex: "시럽 · 꿀 · 소스" },
    { t: "과립", m: "계량 컵", Icon: CupIcon, ex: "커피 · 설탕 · 과립차" },
    { t: "분말", m: "오거 충전기", Icon: AugerIcon, ex: "분유 · 프로틴 · 가루약" },
  ];
  return (
    <Frame id="dosing">
      <CadHeader no={2} title="액상 · 과립 · 분말 계량 방식" />
      {items.map((it, i) => {
        const start = L[1].from + i * Math.round(L[1].frames / 3.2);
        const o = li === 0 ? ease(frame, L[0].from + 10 + i * 10, L[0].from + 24 + i * 10) * 0.6 : Math.max(0.6, ease(frame, start, start + 14));
        const on = li === 1 && frame >= start && frame < start + Math.round(L[1].frames / 3.2);
        const c = on ? K.amber : K.cyan;
        return (
          <div
            key={it.t}
            style={{
              position: "absolute",
              left: 110 + i * 590,
              top: 190,
              width: 540,
              height: 560,
              border: `2.5px solid ${c}`,
              background: on ? "rgba(255,181,71,0.08)" : "rgba(10,26,47,0.85)",
              fontFamily: FONT,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 30,
              opacity: o,
            }}
          >
            <div style={{ color: c, fontSize: 52, fontWeight: 900 }}>{it.t}</div>
            <div style={{ color: K.text, fontSize: 32, fontWeight: 700, marginTop: 6 }}>{it.m}</div>
            <div style={{ marginTop: 24 }}>
              <it.Icon f={frame} c={c} />
            </div>
            <div style={{ color: K.sub, fontSize: 24, marginTop: 30 }}>예: {it.ex}</div>
          </div>
        );
      })}
      {li === 2 ? (
        <div style={{ position: "absolute", left: 110, top: 785, width: 1700, display: "flex", justifyContent: "center", gap: 18, alignItems: "center", fontFamily: FONT, opacity: ease(frame, L[2].from, L[2].from + 14) }}>
          {chip("계량 장치 교체", K.amber)}
          <div style={{ color: K.amber, fontSize: 34, fontWeight: 900 }}>→</div>
          {chip("다른 내용물 포장 가능", K.cyan)}
          <div style={{ color: K.dim, fontSize: 34, fontWeight: 900 }}>·</div>
          {chip("도입 전 내용물 확정", K.green)}
        </div>
      ) : null}
    </Frame>
  );
};

/* ───────────── 4. 생산 속도 ───────────── */
const Speed: React.FC = () => {
  const s = T.scene("speed");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const n = Math.round(interpolate(frame, [L[1].from + 30, L[1].from + 90], [0, 240], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const box = (x: number, w: number, title: string, val: string, on: boolean, o: number, c = K.cyan) => (
    <g opacity={o}>
      <rect x={x} y={240} width={w} height={170} fill={on ? "rgba(255,181,71,0.12)" : "rgba(10,26,47,0.88)"} stroke={on ? K.amber : c} strokeWidth={3} />
      {txt(x + w / 2, 290, title, 28, K.sub, 700, "middle")}
      {txt(x + w / 2, 375, val, 72, on ? K.amber : K.text, 900, "middle")}
    </g>
  );
  const ex = li >= 1;
  return (
    <Frame id="speed">
      <CadHeader no={3} title="생산 속도" />
      <Shot src={img.hero(70 + frame * 0.3)} x={1230} y={500} w={660} opacity={0.85} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {box(110, 400, "분당 절단 횟수", ex ? "40회" : "N회", li === 0, ease(frame, L[0].from, L[0].from + 14))}
        {txt(560, 345, "×", 70, K.cyan, 900, "middle")}
        {box(610, 330, "열 수", ex ? "6열" : "M열", li === 0, ease(frame, L[0].from + 12, L[0].from + 26))}
        {txt(990, 345, "=", 70, K.cyan, 900, "middle")}
        {box(1040, 500, "분당 생산량", ex ? `${n}개` : "N × M", true, ease(frame, L[0].from + 24, L[0].from + 38), K.green)}
        {ex ? (
          <g opacity={ease(frame, L[1].from + 90, L[1].from + 104)}>
            {txt(1050, 470, `→ 1시간 ${(240 * 60).toLocaleString()}개 (예시)`, 30, K.green, 900)}
          </g>
        ) : null}
      </svg>
      {li === 2 ? (
        <div style={{ position: "absolute", left: 110, top: 560, display: "flex", flexDirection: "column", gap: 16, fontFamily: FONT, opacity: ease(frame, L[2].from, L[2].from + 14) }}>
          <div style={{ color: K.amber, fontSize: 30, fontWeight: 900 }}>실제 속도에 영향을 주는 것</div>
          <div style={{ display: "flex", gap: 14 }}>
            {["내용물 흐름성", "충전량", "필름 재질 · 두께"].map((t, i) => chip(t, K.cyan, t, ease(frame, L[2].from + 10 + i * 14, L[2].from + 22 + i * 14)))}
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ color: K.green, fontSize: 34, fontWeight: 900 }}>→</div>
            {chip("도입 전 샘플 시험으로 확인", K.green, "s", ease(frame, L[2].from + 60, L[2].from + 74))}
          </div>
        </div>
      ) : null}
    </Frame>
  );
};

/* ───────────── 5. 실링 · 커팅 디자인 ───────────── */
const Stick: React.FC<{ x: number; y: number; w?: number; h?: number; seal: "3" | "4"; cut: "flat" | "zigzag" | "round"; notch?: boolean; o?: number; tear?: number }> = ({
  x,
  y,
  w = 120,
  h = 380,
  seal,
  cut,
  notch,
  o = 1,
  tear = 0,
}) => {
  const band = 34;
  const zig = (yy: number, dir: number) =>
    Array.from({ length: 9 })
      .map((_, i) => `${x + (i * w) / 8} ${yy + (i % 2 ? 9 : 0) * dir}`)
      .join(" L ");
  const r = cut === "round" ? 18 : 0;
  const outline =
    cut === "zigzag"
      ? `M ${zig(y, 1)} L ${x + w} ${y + h} L ${zig(y + h, -1).split(" L ").reverse().join(" L ")} Z`
      : `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  return (
    <g opacity={o}>
      {tear > 0 ? (
        <>
          <clipPath id="tearBottom">
            <rect x={x - 20} y={y + band + 18} width={w + 40} height={h} />
          </clipPath>
          <clipPath id="tearTop">
            <rect x={x - 20} y={y - 20} width={w + 40} height={band + 38} />
          </clipPath>
          <path d={outline} fill="rgba(231,195,90,0.25)" stroke={K.amber} strokeWidth={3} clipPath="url(#tearBottom)" />
          <g transform={`translate(${-tear * 10} ${-tear * 40}) rotate(${-tear * 14} ${x + w} ${y + band + 18})`}>
            <path d={outline} fill="rgba(231,195,90,0.35)" stroke={K.amber} strokeWidth={3} clipPath="url(#tearTop)" />
          </g>
        </>
      ) : (
        <path d={outline} fill="rgba(231,195,90,0.25)" stroke={K.amber} strokeWidth={3} />
      )}
      <rect x={x + 3} y={y + 3} width={w - 6} height={band} fill="url(#sealHatch)" opacity={0.9} />
      <rect x={x + 3} y={y + h - band - 3} width={w - 6} height={band} fill="url(#sealHatch)" opacity={0.9} />
      {seal === "3" ? (
        <rect x={x + w / 2 - 10} y={y + band} width={20} height={h - band * 2} fill="url(#sealHatch)" opacity={0.9} />
      ) : (
        <>
          <rect x={x + 3} y={y + band} width={16} height={h - band * 2} fill="url(#sealHatch)" opacity={0.9} />
          <rect x={x + w - 19} y={y + band} width={16} height={h - band * 2} fill="url(#sealHatch)" opacity={0.9} />
        </>
      )}
      {notch ? <path d={`M ${x + w} ${y + band + 10} l -14 8 l 14 8`} fill={K.bg} stroke={K.red} strokeWidth={3} /> : null}
    </g>
  );
};

const Design: React.FC = () => {
  const s = T.scene("design");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const o0 = ease(frame, L[0].from, L[0].from + 14);
  const o1 = li >= 1 ? ease(frame, L[1].from, L[1].from + 14) : 0;
  const o2 = li >= 2 ? ease(frame, L[2].from, L[2].from + 14) : 0;
  const tear = li === 2 ? interpolate(frame, [L[2].from + 40, L[2].from + 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return (
    <Frame id="design">
      <CadHeader no={4} title="실링 · 커팅 디자인" />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <pattern id="sealHatch" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={8} stroke={K.amber} strokeWidth={2} />
          </pattern>
        </defs>
        {/* 접합 형태 */}
        <g opacity={o0}>
          {txt(130, 200, "접합 형태", 28, K.cyan, 900)}
          <Stick x={150} y={240} seal="3" cut="flat" />
          {txt(210, 670, "3면 실링", 28, li === 0 ? K.amber : K.text, 900, "middle")}
          {txt(210, 705, "뒷면 + 위 · 아래", 21, K.sub, 400, "middle")}
          <Stick x={360} y={240} seal="4" cut="flat" />
          {txt(420, 670, "4면 실링", 28, li === 0 ? K.amber : K.text, 900, "middle")}
          {txt(420, 705, "네 변 모두", 21, K.sub, 400, "middle")}
        </g>
        {/* 커팅 모양 */}
        <g opacity={o1}>
          {txt(640, 200, "커팅 모양", 28, K.cyan, 900)}
          {(["flat", "zigzag", "round"] as const).map((c, i) => (
            <g key={c} opacity={ease(frame, L[1].from + i * 16, L[1].from + 14 + i * 16)}>
              <Stick x={660 + i * 210} y={240} seal="3" cut={c} />
              {txt(720 + i * 210, 670, ["일자", "지그재그", "라운드"][i], 28, li === 1 ? K.amber : K.text, 900, "middle")}
            </g>
          ))}
        </g>
        {/* 이지 컷 노치 */}
        <g opacity={o2}>
          {txt(1340, 200, "이지 컷 노치", 28, K.cyan, 900)}
          <Stick x={1440} y={240} w={140} seal="3" cut="flat" notch tear={tear} />
          <line x1={1580} y1={290} x2={1690} y2={290} stroke={K.red} strokeWidth={2.5} />
          {txt(1700, 298, "노치", 24, K.red, 900)}
          {txt(1510, 670, "손으로 쉽게 개봉", 28, K.amber, 900, "middle")}
        </g>
      </svg>
    </Frame>
  );
};

/* ───────────── 6. 작동 시 유의사항 ───────────── */
const Safety: React.FC = () => {
  const s = T.scene("safety");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const W = 1280;
  const H = (W * 9) / 16;
  const pulse = 0.55 + 0.45 * Math.sin(frame / 5);
  const [jx, jy] = [anchors.seal.jaws[0] * W, anchors.seal.jaws[1] * H];
  return (
    <Frame id="safety">
      <CadHeader no={5} title="작동 시 유의사항" />
      <Shot src={img.seal(frame)} x={10} y={160} w={W}>
        {(w, h) => (
          <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
            {li === 0 ? (
              <g opacity={ease(frame, L[0].from + 6, L[0].from + 18) * pulse}>
                <ellipse cx={jx - 90} cy={jy + 10} rx={420} ry={110} fill="rgba(255,94,94,0.18)" stroke={K.red} strokeWidth={5} strokeDasharray="18 10" />
                <rect x={jx - 330} y={jy + 140} width={480} height={56} fill="rgba(10,26,47,0.9)" stroke={K.red} strokeWidth={2.5} />
                {txt(jx - 90, jy + 178, "실링 조 · 커터: 손 넣지 말 것", 28, K.red, 900, "middle")}
              </g>
            ) : null}
          </svg>
        )}
      </Shot>
      <Note x={1320} y={180} w={560} start={L[0].from} active={li === 0} title="손 금지 · 안전 도어" desc="도어 닫힌 상태에서만 운전" color={K.red} />
      <Note x={1320} y={310} w={560} start={L[1].from} active={li === 1} title="실링 온도 · 압력 설정" desc="필름에 맞는 조건 → 접합 · 누액 방지" />
      <Note x={1320} y={440} w={560} start={L[2].from} active={li === 2} title="필름 장력 · 정렬" desc="한쪽 쏠림 방지" />
      <Note x={1320} y={570} w={560} start={L[2].from + 40} active={li === 2} title="작업 후 청소" desc="계량부 · 실링부" />
      {li === 1 ? (
        <div style={{ position: "absolute", left: 1320, top: 450, width: 560, fontFamily: FONT, opacity: ease(frame, L[1].from + 10, L[1].from + 24) }}>
          {[
            { k: "온도", v: 0.62 },
            { k: "압력", v: 0.5 },
            { k: "시간", v: 0.4 },
          ].map((r, i) => {
            const v = r.v * ease(frame, L[1].from + 20 + i * 10, L[1].from + 50 + i * 10);
            return (
              <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
                <div style={{ width: 70, color: K.text, fontSize: 26, fontWeight: 900 }}>{r.k}</div>
                <div style={{ flex: 1, height: 18, background: "rgba(134,180,224,0.2)", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${v * 100}%`, background: K.amber }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </Frame>
  );
};

/* ───────────── 7. 수입 통관 ───────────── */
const Import: React.FC = () => {
  const s = T.scene("import");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const seg = [
    { t: "84", label: "류", desc: "기계류" },
    { t: "22", label: "호 (8422)", desc: "포장 · 충전 · 밀봉 기계 등" },
    { t: ".30", label: "소호", desc: "충전 · 밀봉 · 라벨 기계" },
  ];
  return (
    <Frame id="import">
      <CadHeader no={6} title="수입 통관 참고사항" />
      <Shot src={img.hero(60)} x={1180} y={140} w={720} opacity={0.9} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {txt(120, 210, "HS 코드 (6단위)", 28, K.cyan, 900)}
        {seg.map((g, i) => {
          const x = 120 + i * 300;
          const o = ease(frame, L[0].from + i * 12, L[0].from + 14 + i * 12);
          return (
            <g key={g.t} opacity={o}>
              <rect x={x} y={240} width={280} height={110} fill="rgba(255,181,71,0.12)" stroke={K.amber} strokeWidth={2.5} />
              {txt(x + 140, 313, g.t, 64, K.amber, 900, "middle")}
              {txt(x + 140, 382, g.label, 22, K.cyan, 700, "middle")}
              {txt(x + 140, 412, g.desc, 20, K.sub, 400, "middle")}
            </g>
          );
        })}
        <g opacity={ease(frame, L[0].from + 40, L[0].from + 54)}>{txt(1040, 320, "→ 8422.30", 50, K.amber, 900)}</g>
      </svg>
      {li >= 1 ? (
        <div style={{ position: "absolute", left: 120, top: 470, display: "flex", flexDirection: "column", gap: 14, opacity: ease(frame, L[1].from, L[1].from + 14) }}>
          {chip("식품 접촉 부품 (호퍼 · 계량부 · 성형 튜브) → 관련 요건 확인", li === 1 ? K.amber : K.cyan)}
          {chip("전기 설비 (히터 · 모터 · 제어반) → 전기 안전 요건 확인", li === 1 ? K.amber : K.cyan, "e", ease(frame, L[1].from + 30, L[1].from + 44))}
        </div>
      ) : null}
      {li >= 2 ? (
        <div style={{ position: "absolute", left: 120, top: 650, display: "flex", gap: 16, alignItems: "center", fontFamily: FONT, opacity: ease(frame, L[2].from, L[2].from + 14) }}>
          {chip("FTA 원산지 증명서", K.amber)}
          <div style={{ color: K.green, fontSize: 36, fontWeight: 900 }}>→</div>
          {chip("협정 세율 적용", K.cyan, "r", ease(frame, L[2].from + 20, L[2].from + 32))}
          <div style={{ color: K.green, fontSize: 36, fontWeight: 900, opacity: ease(frame, L[2].from + 30, L[2].from + 42) }}>→</div>
          <div style={{ padding: "12px 24px", border: `3px solid ${K.green}`, background: "rgba(92,208,142,0.15)", color: K.green, fontSize: 32, fontWeight: 900, opacity: ease(frame, L[2].from + 40, L[2].from + 54) }}>
            관세 감면 · 면제
          </div>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 120, top: 800, width: 1000, fontFamily: FONT, fontSize: 19, color: K.sub, opacity: ease(frame, L[0].from + 50, L[0].from + 64) }}>
        ※ 최종 세번 · 관세율 · 요건은 제품 구성과 원산지에 따라 달라지므로 관세사와 확인하세요.
      </div>
    </Frame>
  );
};

/* ───────────── 8. 마무리 ───────────── */
const Outro: React.FC = () => {
  const s = T.scene("outro");
  const frame = useCurrentFrame();
  const fade2 = ease(frame, s.frames - 30, s.frames, 1, 0);
  const list = ["내용물 · 계량 방식", "생산 속도 = 분당 횟수 × 열 수", "실링 · 커팅 디자인", "안전 · 온도 설정 · 청소", "HS 8422.30 · 요건 확인", "FTA 원산지 증명서"];
  return (
    <AbsoluteFill style={{ opacity: fade2 }}>
      <Frame id="outro">
        <Shot src={img.hero(frame * 0.4 + 20)} x={760} y={90} w={1200} />
        <div style={{ position: "absolute", left: 110, top: 190, fontFamily: FONT }}>
          <div style={{ color: K.cyan, fontSize: 26, fontWeight: 700, letterSpacing: 6, opacity: ease(frame, 4, 20) }}>CHECKLIST</div>
          <div style={{ color: K.text, fontSize: 60, fontWeight: 900, marginTop: 12, opacity: ease(frame, 10, 26) }}>도입 체크리스트</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 34 }}>
            {list.map((t, i) => {
              const o = ease(frame, 20 + i * 14, 32 + i * 14);
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 18, opacity: o, transform: `translateX(${(1 - o) * -30}px)` }}>
                  <div style={{ width: 46, height: 46, background: K.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width={30} height={30} viewBox="0 0 24 24">
                      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={K.bg} strokeWidth={3.2} strokeLinecap="round" />
                    </svg>
                  </div>
                  <div style={{ color: K.text, fontSize: 32, fontWeight: 700 }}>{t}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Frame>
    </AbsoluteFill>
  );
};

const VIEWS: Record<string, React.FC> = {
  intro: Intro,
  principle: Principle,
  dosing: Dosing,
  speed: Speed,
  design: Design,
  safety: Safety,
  import: Import,
  outro: Outro,
};

export const StickPack: React.FC = () => (
  <AbsoluteFill>
    <Sheet />
    <TransitionSeries>
      {T.scenes.flatMap((s, i) => {
        const View = VIEWS[s.id];
        const seq = (
          <TransitionSeries.Sequence key={s.id} durationInFrames={s.frames}>
            <View />
          </TransitionSeries.Sequence>
        );
        return i === 0
          ? [seq]
          : [<TransitionSeries.Transition key={`${s.id}-t`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />, seq];
      })}
    </TransitionSeries>
    <Audio
      src={staticFile("music.wav")}
      volume={(f) => 0.13 * interpolate(f, [STICKPACK_FRAMES - 60, STICKPACK_FRAMES], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  </AbsoluteFill>
);
