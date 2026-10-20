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
export const WOODCHIP_FRAMES = T.total;

const pad = (n: number) => String(n).padStart(3, "0");
const mod = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
/** 영웅 컷은 카메라가 정면 궤도를 왕복하는 120프레임 루프 */
const img = {
  hero: (i: number) => staticFile(`render3d_wc/hero/h${pad(mod(i, 120))}.png`),
  rotor: (i: number) => staticFile(`render3d_wc/rotor/r${pad(mod(i, 60))}.png`),
  feed: (i: number) => staticFile(`render3d_wc/feed/f${pad(mod(i, 60))}.png`),
};
type Key = keyof typeof anchors.rotor;
const at = (a: Record<string, number[]>, k: Key): [number, number] => [a[k][0], a[k][1]];
const heroAt = (i: number) => anchors.hero[mod(i, 120)] as Record<string, number[]>;

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
      <TitleBlock title={s.title} sheet={SHEETS.indexOf(id) + 1} total={SHEETS.length} prefix="WCH" />
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

const tag = (t: string, c: string, o: number, style: React.CSSProperties = {}) => (
  <div
    style={{
      position: "absolute",
      padding: "10px 18px",
      border: `2.5px solid ${c}`,
      background: "rgba(10,26,47,0.88)",
      color: c,
      fontFamily: FONT,
      fontSize: 26,
      fontWeight: 900,
      opacity: o,
      ...style,
    }}
  >
    {t}
  </div>
);

/** 문장 k 동안만 보이는 투명도 (앞뒤로 살짝 겹침) */
const during = (frame: number, L: { from: number }[], k: number, ks: number[] = [k]) => {
  const a = Math.min(...ks);
  const b = Math.max(...ks);
  const fin = a === 0 ? 1 : ease(frame, L[a].from - 8, L[a].from + 6);
  const fout = b + 1 < L.length ? ease(frame, L[b + 1].from - 8, L[b + 1].from + 4, 1, 0) : 1;
  return Math.min(fin, fout);
};

/* ───────────── 1. 인트로 ───────────── */
const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Frame id="intro">
      <Shot src={img.hero(frame)} x={560} y={70} w={1450} opacity={ease(frame, 0, 20)} />
      <div style={{ position: "absolute", left: 100, top: 230, fontFamily: FONT }}>
        <div style={{ color: K.cyan, fontSize: 26, fontWeight: 700, letterSpacing: 6, opacity: ease(frame, 10, 30) }}>WOOD CRUSHER · CHIPPER</div>
        <div style={{ color: K.text, fontSize: 92, fontWeight: 900, lineHeight: 1.12, marginTop: 16, opacity: ease(frame, 20, 42) }}>
          목재 파쇄기
        </div>
        <div style={{ color: K.amber, fontSize: 56, fontWeight: 900, marginTop: 8, opacity: ease(frame, 28, 48) }}>우드칩 제조기</div>
        <div style={{ width: 160 * ease(frame, 34, 56), height: 6, background: K.amber, margin: "28px 0 24px" }} />
        <div style={{ color: K.sub, fontSize: 30, fontWeight: 700, opacity: ease(frame, 34, 56) }}>잔가지 · 폐목재 → 우드칩 · 톱밥</div>
      </div>
    </Frame>
  );
};

/* ───────────── 2. 작동 원리 ───────────── */
const STEPS = [
  { t: "투입 (옆 투입대 · 경사 호퍼)", l: 0 },
  { t: "로터 고속 회전 (전동기 → 벨트)", l: 0 },
  { t: "칼날 절단 · 해머 타격", l: 1 },
  { t: "고정 칼날 사이에서 분쇄", l: 1 },
  { t: "스크린 통과 (크기 선별)", l: 2 },
  { t: "배출구 → 칩 더미", l: 3 },
];

const Principle: React.FC = () => {
  const s = T.scene("principle");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const W = 1360;
  const hi = 0 + frame;
  return (
    <Frame id="principle">
      <CadHeader no={1} title="작동 원리" />
      <Shot src={img.feed(frame)} x={10} y={150} w={W} opacity={during(frame, L, 0)}>
        {(w) => (
          <>
            <C a={at(anchors.feed, "table")} w={w} label="옆 투입대" dx={-40} dy={70} start={L[0].from + 8} />
            <C a={at(anchors.feed, "hopper")} w={w} label="경사 호퍼" dx={-250} dy={30} start={L[0].from + 26} />
            <C a={at(anchors.feed, "housing")} w={w} label="원형 하우징 · 로터" dx={-300} dy={-40} start={L[0].from + 60} />
            <C a={at(anchors.feed, "motor")} w={w} label="전동기" dx={120} dy={130} start={L[0].from + 110} />
          </>
        )}
      </Shot>
      <Shot src={img.rotor(frame)} x={10} y={150} w={W} opacity={during(frame, L, 1, [1, 2])}>
        {(w) => (
          <>
            {tag("내부 투시 (설명용 · 앞 커버 생략)", K.cyan, ease(frame, L[1].from, L[1].from + 12), { left: 24, top: 20, fontSize: 22 })}
            {li === 1 ? (
              <>
                <C a={at(anchors.rotor, "knife")} w={w} label="칼날 (나이프)" dx={300} dy={-110} start={L[1].from + 6} />
                <C a={at(anchors.rotor, "hammer")} w={w} label="해머" dx={-200} dy={120} start={L[1].from + 30} />
                <C a={at(anchors.rotor, "anvil")} w={w} label="고정 칼날" dx={-200} dy={-150} start={L[1].from + 70} />
              </>
            ) : null}
            {li === 2 ? <C a={at(anchors.rotor, "screen")} w={w} label="스크린 (구멍 크기 = 칩 크기)" dx={330} dy={40} start={L[2].from + 6} /> : null}
          </>
        )}
      </Shot>
      <Shot src={img.hero(hi)} x={10} y={150} w={W} opacity={during(frame, L, 3)}>
        {(w) => (
          <>
            <C a={heroAt(hi).outlet as [number, number]} w={w} label="배출구" dx={-260} dy={20} start={L[3].from + 6} />
            <C a={heroAt(hi).pile as [number, number]} w={w} label="우드칩" dx={260} dy={10} start={L[3].from + 30} />
          </>
        )}
      </Shot>
      <div style={{ position: "absolute", left: 1410, top: 180, display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT }}>
        {STEPS.map((st, i) => {
          const on = li === st.l;
          const done = li > st.l;
          return (
            <React.Fragment key={st.t}>
              {i ? <div style={{ color: K.dim, fontSize: 18, textAlign: "center", lineHeight: 1 }}>▼</div> : null}
              <div
                style={{
                  width: 460,
                  padding: "11px 16px",
                  border: `2px solid ${on ? K.amber : done ? K.green : "rgba(134,180,224,0.4)"}`,
                  background: on ? "rgba(255,181,71,0.13)" : "rgba(10,26,47,0.85)",
                  color: on ? K.amber : K.text,
                  fontSize: 24,
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

/* ───────────── 3. 우드칩과 톱밥 ───────────── */
const KnifeIcon: React.FC<{ f: number; c: string }> = ({ f, c }) => {
  const a = (f * 9) % 360;
  return (
    <svg width={260} height={220} viewBox="0 0 260 220">
      <g transform={`rotate(${a} 90 110)`}>
        <circle cx={90} cy={110} r={70} fill="none" stroke={c} strokeWidth={4} />
        {[0, 120, 240].map((d) => (
          <rect key={d} x={90} y={104} width={66} height={12} fill={c} transform={`rotate(${d} 90 110)`} />
        ))}
      </g>
      {[0, 1, 2, 3].map((i) => {
        const p = ((f * 2 + i * 15) % 60) / 60;
        return <rect key={i} x={170 + p * 70} y={70 + i * 24 + p * 30} width={26} height={9} fill={K.amber} opacity={1 - p} transform={`rotate(${20 + i * 25} ${183 + p * 70} ${75 + i * 24})`} />;
      })}
    </svg>
  );
};
const HammerIcon: React.FC<{ f: number; c: string }> = ({ f, c }) => {
  const a = (f * 9) % 360;
  return (
    <svg width={260} height={220} viewBox="0 0 260 220">
      <g transform={`rotate(${a} 90 110)`}>
        <circle cx={90} cy={110} r={34} fill="none" stroke={c} strokeWidth={4} />
        {[0, 90, 180, 270].map((d) => (
          <rect key={d} x={124} y={100} width={40} height={20} fill={c} transform={`rotate(${d} 90 110)`} />
        ))}
      </g>
      {Array.from({ length: 14 }).map((_, i) => {
        const p = ((f * 2 + i * 9) % 60) / 60;
        return <circle key={i} cx={175 + p * 70 + (i % 3) * 6} cy={60 + (i % 7) * 18 + p * 20} r={3} fill="#E9CFA0" opacity={1 - p} />;
      })}
    </svg>
  );
};

const Output: React.FC = () => {
  const s = T.scene("output");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const card = (x: number, title: string, tool: string, out: string, Icon: React.FC<{ f: number; c: string }>, o: number, c: string) => (
    <div style={{ position: "absolute", left: x, top: 180, width: 560, height: 330, border: `2.5px solid ${c}`, background: "rgba(10,26,47,0.88)", fontFamily: FONT, opacity: o, display: "flex", alignItems: "center", padding: "0 20px", gap: 10 }}>
      <Icon f={frame} c={c} />
      <div>
        <div style={{ color: K.sub, fontSize: 24, fontWeight: 700 }}>{tool}</div>
        <div style={{ color: c, fontSize: 46, fontWeight: 900, marginTop: 6 }}>{title}</div>
        <div style={{ color: K.text, fontSize: 26, fontWeight: 700, marginTop: 12 }}>{out}</div>
      </div>
    </div>
  );
  const holes = (x: number, r: number, n: number, label: string, out: string, on: boolean, o: number) => (
    <g opacity={o}>
      <rect x={x} y={560} width={360} height={170} fill={on ? "rgba(255,181,71,0.1)" : "rgba(10,26,47,0.88)"} stroke={on ? K.amber : K.cyan} strokeWidth={2.5} />
      {Array.from({ length: n * 3 }).map((_, i) => (
        <circle key={i} cx={x + 30 + ((i % n) + 0.5) * (300 / n)} cy={590 + Math.floor(i / n) * 40 + 10} r={r} fill="none" stroke={K.line} strokeWidth={2} />
      ))}
      {txt(x + 180, 770, label, 26, on ? K.amber : K.text, 900, "middle")}
      {txt(x + 180, 805, out, 22, K.sub, 700, "middle")}
    </g>
  );
  const o1 = li >= 1 ? ease(frame, L[1].from, L[1].from + 14) : 0;
  return (
    <Frame id="output">
      <CadHeader no={2} title="우드칩과 톱밥" />
      {card(110, "우드칩", "칼날로 자르기", "납작한 조각 · 연료용", KnifeIcon, ease(frame, L[0].from, L[0].from + 14), li === 0 ? K.amber : K.cyan)}
      {card(700, "톱밥", "해머로 두드리기", "고운 가루 · 버섯배지", HammerIcon, ease(frame, L[0].from + 40, L[0].from + 54), li === 0 ? K.amber : K.cyan)}
      <Shot src={img.hero(frame + 40)} x={1290} y={170} w={600} opacity={0.95}>
        {(w) => (
          <>
            <C a={heroAt(frame + 40).pile as [number, number]} w={w} label="칩" dx={90} dy={40} start={L[0].from + 20} />
            <C a={heroAt(frame + 40).dust as [number, number]} w={w} label="톱밥" dx={-30} dy={95} start={L[0].from + 50} />
          </>
        )}
      </Shot>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {holes(110, 15, 6, "큰 구멍 스크린", "→ 굵은 칩", li === 1, o1)}
        {holes(520, 6, 12, "작은 구멍 스크린", "→ 고운 톱밥", li === 1, li >= 1 ? ease(frame, L[1].from + 30, L[1].from + 44) : 0)}
        <g opacity={li >= 1 ? ease(frame, L[1].from + 60, L[1].from + 74) : 0}>{txt(940, 655, "⇄ 교체", 32, K.green, 900)}</g>
      </svg>
      {li >= 2 ? (
        <div style={{ position: "absolute", left: 1150, top: 560, display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT, opacity: ease(frame, L[2].from, L[2].from + 14) }}>
          <div style={{ color: K.amber, fontSize: 28, fontWeight: 900 }}>모델 선정 전 확인</div>
          {["최대 투입 굵기 (직경)", "나무 수분 함량", "시간당 처리량 (kg/h)"].map((t, i) => chip(t, K.cyan, t, ease(frame, L[2].from + 10 + i * 18, L[2].from + 22 + i * 18), 25))}
        </div>
      ) : null}
    </Frame>
  );
};

/* ───────────── 4. 작동 시 유의사항 ───────────── */
const Safety: React.FC = () => {
  const s = T.scene("safety");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const W = 1280;
  const H = (W * 9) / 16;
  const pulse = 0.55 + 0.45 * Math.sin(frame / 5);
  const [tx, ty] = [anchors.feed.table[0] * W, anchors.feed.table[1] * H];
  const [hx, hy] = [anchors.feed.hopper[0] * W, anchors.feed.hopper[1] * H];
  return (
    <Frame id="safety">
      <CadHeader no={3} title="작동 시 유의사항" />
      <Shot src={img.feed(frame)} x={10} y={160} w={W} opacity={li === 2 ? ease(frame, L[2].from, L[2].from + 10, 1, 0) : 1}>
        {(w, h) => (
          <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
            <g opacity={(li === 0 ? 1 : 0.35) * pulse}>
              <ellipse cx={tx + 280} cy={ty - 70} rx={200} ry={90} fill="rgba(255,94,94,0.18)" stroke={K.red} strokeWidth={5} strokeDasharray="18 10" />
              <ellipse cx={hx - 20} cy={hy + 40} rx={150} ry={110} fill="rgba(255,94,94,0.18)" stroke={K.red} strokeWidth={5} strokeDasharray="18 10" />
            </g>
            {li === 0 ? (
              <g opacity={ease(frame, L[0].from + 10, L[0].from + 22)}>
                <rect x={30} y={30} width={430} height={56} fill="rgba(10,26,47,0.9)" stroke={K.red} strokeWidth={2.5} />
                {txt(245, 68, "투입구: 손 넣지 말 것", 28, K.red, 900, "middle")}
              </g>
            ) : null}
          </svg>
        )}
      </Shot>
      <Shot src={img.rotor(frame)} x={10} y={160} w={W} opacity={li === 2 ? ease(frame, L[2].from, L[2].from + 10) : 0}>
        {(w, h) => (
          <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
            <g opacity={ease(frame, L[2].from + 20, L[2].from + 32)}>
              <rect x={w / 2 - 260} y={h / 2 - 60} width={520} height={120} fill="rgba(10,26,47,0.92)" stroke={K.amber} strokeWidth={3} />
              {txt(w / 2, h / 2 - 10, "전원 차단 → 잠금 · 표지", 34, K.amber, 900, "middle")}
              {txt(w / 2, h / 2 + 36, "로터 완전 정지 확인 후 작업", 26, K.text, 700, "middle")}
            </g>
          </svg>
        )}
      </Shot>
      <Note x={1320} y={180} w={560} start={L[0].from} active={li === 0} title="투입구에 손 금지" desc="긴 나무는 밀대로 · 옆에 비켜서기" color={K.red} />
      <Note x={1320} y={320} w={560} start={L[1].from} active={li === 1} title="보호구 착용" desc="보안경 · 귀마개 · 장갑 (파편 · 소음)" />
      <Note x={1320} y={460} w={560} start={L[2].from} active={li === 2} title="칼날 · 스크린 교체" desc="전원 차단 · 잠금 장치 · 정지 확인" />
      {li === 1 ? (
        <div style={{ position: "absolute", left: 1320, top: 610, display: "flex", gap: 14, fontFamily: FONT, opacity: ease(frame, L[1].from + 10, L[1].from + 24) }}>
          {["보안경", "귀마개", "장갑"].map((t, i) => chip(t, K.green, t, ease(frame, L[1].from + 14 + i * 12, L[1].from + 26 + i * 12)))}
        </div>
      ) : null}
    </Frame>
  );
};

/* ───────────── 5. 자율안전확인 신고 대상 ───────────── */
const Kcs: React.FC = () => {
  const s = T.scene("kcs");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const node = (x: number, y: number, w: number, t: string, c: string, o: number, big = false) => (
    <g opacity={o}>
      <rect x={x} y={y} width={w} height={big ? 96 : 80} fill={c === K.amber ? "rgba(255,181,71,0.12)" : "rgba(10,26,47,0.9)"} stroke={c} strokeWidth={3} />
      {txt(x + w / 2, y + (big ? 60 : 51), t, big ? 34 : 28, c === K.dim ? K.text : c, 900, "middle")}
    </g>
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number, label: string, c: string, o: number) => (
    <g opacity={o}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={3} markerEnd="url(#ah)" />
      {txt((x1 + x2) / 2 + 12, (y1 + y2) / 2 + (x1 === x2 ? 8 : -8), label, 22, c, 700)}
    </g>
  );
  const o0 = ease(frame, L[0].from, L[0].from + 14);
  const o1 = li >= 1 ? ease(frame, L[1].from, L[1].from + 14) : 0;
  const o1b = li >= 1 ? ease(frame, L[1].from + 50, L[1].from + 64) : 0;
  const o2 = li >= 2 ? ease(frame, L[2].from, L[2].from + 14) : 0;
  return (
    <Frame id="kcs">
      <CadHeader no={4} title="자율안전확인 신고 대상" />
      <Shot src={img.hero(frame + 80)} x={1220} y={150} w={680} opacity={0.9} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <marker id="ah" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto">
            <path d="M0 0 L10 5 L0 10 Z" fill={K.line} />
          </marker>
        </defs>
        {node(120, 180, 520, "파쇄기 · 분쇄기", li === 0 ? K.amber : K.cyan, o0, true)}
        {txt(380, 310, "산업안전보건법 시행령 제77조 · 자율안전확인 대상 기계", 21, K.sub, 700, "middle")}
        {arrow(380, 330, 380, 380, "", K.line, o1)}
        {node(170, 385, 420, "식품용인가?", K.dim, o1)}
        {arrow(590, 425, 760, 425, "예", K.green, o1)}
        {node(770, 385, 300, "대상 제외", K.green, o1)}
        {arrow(380, 465, 380, 515, "아니오", K.line, o1b)}
        {node(120, 520, 520, "처리 용량 50kg/h 미만?", K.dim, o1b)}
        {arrow(640, 560, 760, 560, "예", K.green, o1b)}
        {node(770, 520, 300, "대상 제외", K.green, o1b)}
        {arrow(380, 600, 380, 650, "아니오", K.line, o2)}
        {node(120, 655, 520, "자율안전확인 신고 대상", K.amber, o2, true)}
        <g opacity={o2}>
          {txt(680, 700, "← 산업용 목재 파쇄기 대부분", 26, K.amber, 900)}
          {txt(680, 735, "(시간당 수백 kg ~ 수 톤 처리)", 22, K.sub, 700)}
        </g>
      </svg>
      <div style={{ position: "absolute", left: 1230, top: 560, width: 650, fontFamily: FONT, fontSize: 20, color: K.sub, lineHeight: 1.5, opacity: ease(frame, L[0].from + 30, L[0].from + 44) }}>
        ※ 대상 · 제외 기준은 「위험기계·기구 자율안전확인 고시」 등 최신 고시로 확인하고, 애매하면 안전보건공단에 대상 여부를 문의하세요.
      </div>
    </Frame>
  );
};

/* ───────────── 6. 신고 절차 · 세관장 확인 ───────────── */
const FLOW = [
  { t: "제조사 자료 요청", d: "설명서 · 도면 · 시험 자료", l: 1 },
  { t: "안전보건공단 신고", d: "통관 전에 신고", l: 0 },
  { t: "신고증명서 발급", d: "수입신고 때 제출", l: 0 },
  { t: "수입신고 · 세관장 확인", d: "증명서 없으면 통관 불가", l: 2 },
  { t: "KCs 표시 부착", d: "기계 본체에 표시", l: 2 },
  { t: "설치 후 안전검사", d: "2026.6 ~ 정기 검사", l: 3 },
];

const Procedure: React.FC = () => {
  const s = T.scene("procedure");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  return (
    <Frame id="procedure">
      <CadHeader no={5} title="신고 절차와 세관장 확인" />
      <div style={{ position: "absolute", left: 100, top: 190, display: "flex", gap: 14, fontFamily: FONT }}>
        {FLOW.map((f, i) => {
          const on = li === f.l;
          const o = ease(frame, 6 + i * 8, 20 + i * 8);
          const c = on ? K.amber : f.l < li ? K.green : K.cyan;
          return (
            <React.Fragment key={f.t}>
              <div style={{ width: 240, height: 210, border: `2.5px solid ${c}`, background: on ? "rgba(255,181,71,0.12)" : "rgba(10,26,47,0.88)", opacity: o, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ color: c, fontSize: 40, fontWeight: 900 }}>{i + 1}</div>
                <div style={{ color: on ? K.amber : K.text, fontSize: 27, fontWeight: 900, lineHeight: 1.25, wordBreak: "keep-all" }}>{f.t}</div>
                <div style={{ color: K.sub, fontSize: 20, fontWeight: 700, wordBreak: "keep-all" }}>{f.d}</div>
              </div>
              {i < FLOW.length - 1 ? <div style={{ color: K.dim, fontSize: 30, alignSelf: "center", opacity: o }}>▶</div> : null}
            </React.Fragment>
          );
        })}
      </div>
      {li === 1 ? (
        <div style={{ position: "absolute", left: 100, top: 460, display: "flex", gap: 16, fontFamily: FONT, opacity: ease(frame, L[1].from + 10, L[1].from + 24) }}>
          {["제품 설명서", "구조 도면", "방호장치 (덮개 · 비상정지 · 인터록)", "안전기준 시험 자료"].map((t, i) => chip(t, K.amber, t, ease(frame, L[1].from + 14 + i * 14, L[1].from + 26 + i * 14)))}
        </div>
      ) : null}
      {li === 2 ? (
        <div style={{ position: "absolute", left: 100, top: 460, display: "flex", gap: 30, alignItems: "center", fontFamily: FONT, opacity: ease(frame, L[2].from + 6, L[2].from + 20) }}>
          <div style={{ width: 150, height: 150, borderRadius: 75, border: `6px solid ${K.amber}`, display: "flex", alignItems: "center", justifyContent: "center", color: K.amber, fontSize: 52, fontWeight: 900 }}>KCs</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {chip("세관장 확인 대상 → 수입신고 때 신고증명서 확인", K.cyan)}
            {chip("증명서가 없으면 통관 보류 → 창고료 · 일정 지연", K.red, "r", ease(frame, L[2].from + 40, L[2].from + 54))}
          </div>
        </div>
      ) : null}
      {li === 3 ? (
        <div style={{ position: "absolute", left: 100, top: 460, display: "flex", gap: 16, alignItems: "center", fontFamily: FONT, opacity: ease(frame, L[3].from + 6, L[3].from + 20) }}>
          {chip("2026.6.26 시행 · 파쇄기 · 분쇄기 · 혼합기 안전검사 대상 추가", K.amber)}
          {chip("설치 후 3년 안에 최초 → 이후 2년마다", K.cyan, "c", ease(frame, L[3].from + 40, L[3].from + 54))}
        </div>
      ) : null}
      <Shot src={img.hero(frame + 20)} x={1300} y={560} w={560} opacity={0.85} />
      <div style={{ position: "absolute", left: 100, top: 690, width: 1150, fontFamily: FONT, fontSize: 20, color: K.sub, opacity: ease(frame, 30, 44) }}>
        ※ 신고 처리에는 시간이 걸리므로, 선적 전에 자료를 받아 신고를 마쳐 두어야 입항 후 바로 통관할 수 있습니다.
      </div>
    </Frame>
  );
};

/* ───────────── 7. 수입 통관 참고사항 ───────────── */
const Customs: React.FC = () => {
  const s = T.scene("customs");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const hs = (x: number, code: string, name: string, o: number) => (
    <div style={{ position: "absolute", left: x, top: 190, width: 400, height: 160, border: `2.5px solid ${li === 0 ? K.amber : K.cyan}`, background: "rgba(10,26,47,0.9)", fontFamily: FONT, opacity: o, padding: "18px 24px" }}>
      <div style={{ color: K.amber, fontSize: 58, fontWeight: 900 }}>{code}</div>
      <div style={{ color: K.text, fontSize: 25, fontWeight: 700, marginTop: 6 }}>{name}</div>
    </div>
  );
  return (
    <Frame id="customs">
      <CadHeader no={6} title="수입 통관 참고사항" />
      <div style={{ position: "absolute", left: 110, top: 150, color: K.cyan, fontFamily: FONT, fontSize: 24, fontWeight: 900, opacity: ease(frame, 0, 12) }}>HS 코드 후보</div>
      {hs(110, "8436", "농 · 임업용 기계 (임업용 치퍼)", ease(frame, L[0].from + 6, L[0].from + 20))}
      <div style={{ position: "absolute", left: 535, top: 245, color: K.sub, fontFamily: FONT, fontSize: 40, fontWeight: 900, opacity: ease(frame, L[0].from + 20, L[0].from + 30) }}>or</div>
      {hs(600, "8479", "기타 고유 기능 기계 (분쇄 등)", ease(frame, L[0].from + 24, L[0].from + 38))}
      <div style={{ position: "absolute", left: 110, top: 370, display: "flex", gap: 14, alignItems: "center", fontFamily: FONT, opacity: ease(frame, L[0].from + 60, L[0].from + 74) }}>
        <div style={{ color: K.green, fontSize: 32, fontWeight: 900 }}>→</div>
        {chip("관세사 확인 · 품목분류 사전심사", K.green, "a", 1, 25)}
      </div>
      {li >= 1 ? (
        <div style={{ position: "absolute", left: 110, top: 470, width: 900, fontFamily: FONT, opacity: ease(frame, L[1].from, L[1].from + 14) }}>
          <div style={{ color: li === 1 ? K.amber : K.cyan, fontSize: 28, fontWeight: 900, marginBottom: 12 }}>중고 기계 · 식물 검역</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {chip("흙 · 나무 찌꺼기 · 벌레", K.red, "s", 1, 24)}
            <div style={{ color: K.green, fontSize: 30, fontWeight: 900 }}>→</div>
            {chip("선적 전 분해 세척 · 세척 사진", K.green, "w", ease(frame, L[1].from + 30, L[1].from + 44), 24)}
          </div>
        </div>
      ) : null}
      {li >= 2 ? (
        <div style={{ position: "absolute", left: 110, top: 630, display: "flex", gap: 14, alignItems: "center", fontFamily: FONT, opacity: ease(frame, L[2].from, L[2].from + 14) }}>
          {chip("목재 포장재 · 팔레트 → 열처리(HT) 표시 확인", li === 2 ? K.amber : K.cyan, "p", 1, 24)}
          {chip("원산지 증명서 → FTA 협정 세율", K.green, "f", ease(frame, L[2].from + 50, L[2].from + 64), 24)}
        </div>
      ) : null}
      <Shot src={img.hero(frame + 60)} x={1080} y={170} w={800} opacity={0.9}>
        {(w) => (li === 1 ? <C a={heroAt(frame + 60).table as [number, number]} w={w} label="세척 필수 부위" dx={-40} dy={150} start={L[1].from + 20} /> : null)}
      </Shot>
      <div style={{ position: "absolute", left: 110, top: 740, width: 1500, fontFamily: FONT, fontSize: 19, color: K.sub, opacity: ease(frame, L[0].from + 50, L[0].from + 64) }}>
        ※ 최종 세번 · 세율 · 요건은 구조와 용도에 따라 달라집니다. 수입 전에 관세사 · 농림축산검역본부와 확인하세요.
      </div>
    </Frame>
  );
};

/* ───────────── 8. 마무리 ───────────── */
const Outro: React.FC = () => {
  const s = T.scene("outro");
  const frame = useCurrentFrame();
  const fade2 = ease(frame, s.frames - 30, s.frames, 1, 0);
  const list = ["처리량 · 투입 굵기 · 칩 크기", "투입구 손 금지 · 보호구 · 전원 잠금", "자율안전확인 신고 → 신고증명서", "세관장 확인 · KCs 표시 · 안전검사", "HS 코드 확인 · 세척 · 원산지 증명서"];
  return (
    <AbsoluteFill style={{ opacity: fade2 }}>
      <Frame id="outro">
        <Shot src={img.hero(frame + 30)} x={760} y={90} w={1200} />
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
                  <div style={{ color: K.text, fontSize: 30, fontWeight: 700 }}>{t}</div>
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
  output: Output,
  safety: Safety,
  kcs: Kcs,
  procedure: Procedure,
  customs: Customs,
  outro: Outro,
};

export const WoodChip: React.FC = () => (
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
      volume={(f) => 0.13 * interpolate(f, [WOODCHIP_FRAMES - 60, WOODCHIP_FRAMES], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  </AbsoluteFill>
);
