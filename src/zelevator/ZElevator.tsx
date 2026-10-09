import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { fade } from "@remotion/transitions/fade";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { Callout, Captions, ease, Narration } from "../components";
import { IconWater } from "../icons";
import { FONT } from "../theme";
import { lineAt, makeTimeline, TRANSITION } from "../timeline";
import { CadHeader, K, Note, Sheet, TitleBlock } from "../shredder/cad";
import anchors from "./anchors.json";
import narration from "./narration.json";

const T = makeTimeline(narration);
const SHEETS = T.scenes.map((s) => s.id);
export const ZELEVATOR_FRAMES = T.total;

const pad = (n: number) => String(n).padStart(3, "0");
const mod = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const clampI = (i: number, n: number) => Math.max(0, Math.min(n - 1, Math.round(i)));
const img = {
  hero: (i: number) => staticFile(`render3d_z/hero/h${pad(mod(i, 180))}.png`),
  close: (i: number) => staticFile(`render3d_z/close/c${pad(mod(i, 90))}.png`),
  line: (i: number) => staticFile(`render3d_z/line/l${pad(clampI(i, 120))}.png`),
  chain: (i: number) => staticFile(`render3d_z/chain/k${pad(mod(i, 60))}.png`),
};
// 정면이 보이는 구간(150~209 프레임, 약 120°)만 왕복 → 뒤판에 버킷이 가려지는 각도를 피함
const front = (t: number) => {
  const p = mod(t, 120);
  return 150 + (p < 60 ? p : 120 - p);
};
type Key = keyof typeof anchors.close;
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
      <TitleBlock title={s.title} sheet={SHEETS.indexOf(id) + 1} total={SHEETS.length} prefix="ZEL" />
      <Captions scene={s} />
      <Narration scene={s} />
    </AbsoluteFill>
  );
};

/** 16:9 렌더 이미지 */
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

const chip = (t: string, c: string, key?: string, o = 1) => (
  <div key={key ?? t} style={{ padding: "12px 22px", border: `2.5px solid ${c}`, background: "rgba(10,26,47,0.9)", color: c, fontSize: 28, fontWeight: 900, fontFamily: FONT, opacity: o }}>
    {t}
  </div>
);

/* ───────────── 1. 인트로 ───────────── */
const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const a = ease(frame, 10, 30);
  const b = ease(frame, 20, 42);
  const c = ease(frame, 34, 56);
  return (
    <Frame id="intro">
      <Shot src={img.hero(front(frame * 0.3))} x={520} y={60} w={1500} opacity={ease(frame, 0, 20)} />
      <div style={{ position: "absolute", left: 100, top: 240, fontFamily: FONT }}>
        <div style={{ color: K.cyan, fontSize: 26, fontWeight: 700, letterSpacing: 6, opacity: a }}>Z-TYPE BUCKET ELEVATOR</div>
        <div style={{ color: K.text, fontSize: 96, fontWeight: 900, lineHeight: 1.12, marginTop: 16, opacity: b }}>
          Z형 버킷
          <br />
          엘리베이터
        </div>
        <div style={{ width: 160 * c, height: 6, background: K.amber, margin: "28px 0 24px" }} />
        <div style={{ color: K.sub, fontSize: 32, fontWeight: 700, opacity: c }}>수평 + 수직 이송을 한 번에</div>
      </div>
    </Frame>
  );
};

/* ───────────── 2. 구조와 작동 원리 ───────────── */
const Structure: React.FC = () => {
  const s = T.scene("structure");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const W = 1380;
  const hi = mod(front(frame * 0.12 + 10), 180);
  const H = anchors.hero[Math.floor(hi)];
  const show = (k: number) => (li === k ? 1 : 0);
  const xf = (k: number) => Math.min(ease(frame, L[k].from - 8, L[k].from + 8), k + 1 < L.length ? ease(frame, L[k + 1].from - 8, L[k + 1].from + 6, 1, 0) : 1);
  return (
    <Frame id="structure">
      <CadHeader no={1} title="구조와 작동 원리" />
      {li <= 0 || li === 3 ? (
        <Shot src={img.hero(hi)} x={20} y={150} w={W} opacity={li <= 0 ? 1 : xf(3)}>
          {(w) => (
            <>
              <C a={at(H, "bucket")} w={w} label="① 아래 수평 구간 · 투입" dx={140} dy={110} start={L[0].from + 10} end={L[1].from - 6} />
              <C a={at(H, "column")} w={w} label="② 수직 구간 · 상승" dx={-170} dy={20} start={L[0].from + 60} end={L[1].from - 6} />
              <C a={at(H, "top")} w={w} label="③ 위 수평 구간 · 배출" dx={-120} dy={-60} start={L[0].from + 110} end={L[1].from - 6} />
              {li === 3 ? (
                <div style={{ position: "absolute", left: 40, top: 30, padding: "10px 20px", border: `2.5px solid ${K.green}`, background: "rgba(10,26,47,0.88)", color: K.green, fontFamily: FONT, fontSize: 30, fontWeight: 900 }}>
                  버킷 수평 유지 → 재료 흘림 · 파손 최소화
                </div>
              ) : null}
            </>
          )}
        </Shot>
      ) : null}
      <Shot src={img.chain(frame)} x={20} y={150} w={W} opacity={show(1) * xf(1)}>
        {(w) => (
          <>
            <C a={at(anchors.chain, "chain")} w={w} label="체인" dx={-150} dy={-80} start={L[1].from + 10} />
            <C a={at(anchors.chain, "column")} w={w} label="버킷 (일정 간격)" dx={160} dy={-60} start={L[1].from + 24} />
          </>
        )}
      </Shot>
      <Shot src={img.close(frame)} x={20} y={150} w={W} opacity={show(2) * xf(2)}>
        {(w) => <C a={at(anchors.close, "feeder")} w={w} label="진동 피더 → 정량 투입" dx={-180} dy={-120} start={L[2].from + 10} />}
      </Shot>
      <Note x={1430} y={180} w={450} start={L[0].from} active={li === 0} title="① 수평 → 수직 → 수평" desc="Z 모양 경로 한 대로 해결" />
      <Note x={1430} y={300} w={450} start={L[1].from} active={li === 1} title="② 체인 + 버킷 순환" desc="일정 간격으로 담아 나름" />
      <Note x={1430} y={420} w={450} start={L[2].from} active={li === 2} title="③ 진동 피더 정량 투입" desc="버킷마다 고르게" />
      <Note x={1430} y={540} w={450} start={L[3].from} active={li === 3} title="④ 버킷 수평 유지" desc="부서지기 쉬운 재료도 안전" />
    </Frame>
  );
};

/* ───────────── 3. 계량 · 포장 라인 ───────────── */
const Line: React.FC = () => {
  const s = T.scene("line");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const idx = interpolate(frame, [0, s.frames], [0, 119], { extrapolateRight: "clamp" });
  const A = anchors.line[clampI(idx, 120)];
  const W = 1400;
  const H = (W * 9) / 16;
  const dimO = li === 2 ? ease(frame, L[2].from, L[2].from + 14) : 0;
  return (
    <Frame id="line">
      <CadHeader no={2} title="자동 계량 · 포장 라인 연계" />
      <Shot src={img.line(idx)} x={10} y={150} w={W}>
        {(w) => (
          <>
            <C a={at(A, "discharge")} w={w} label="엘리베이터 배출구" dx={-170} dy={-70} start={L[0].from + 10} />
            <C a={at(A, "weigher")} w={w} label="조합 저울 (자동 무게 저울)" dx={-200} dy={60} start={L[0].from + 40} />
            <C a={at(A, "packer")} w={w} label="포장기" dx={260} dy={-170} start={L[1].from + 20} />
            {dimO > 0 ? (
              <svg width={w} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: dimO, overflow: "visible" }}>
                {(() => {
                  const [dx, dy] = [A.discharge[0] * w + 160, A.discharge[1] * H];
                  // 배출구(z≈3.4m)와 포장기 기준점(z≈1.0m)으로 바닥(z=0) 위치를 외삽
                  const py = A.packer[1] * H;
                  const fy = Math.min(H - 160, py + (py - dy) * (1.0 / 2.4));
                  return (
                    <g>
                      <line x1={dx} y1={dy} x2={dx} y2={fy} stroke={K.amber} strokeWidth={4} />
                      <polygon points={`${dx},${dy} ${dx - 10},${dy + 18} ${dx + 10},${dy + 18}`} fill={K.amber} />
                      <polygon points={`${dx},${fy} ${dx - 10},${fy - 18} ${dx + 10},${fy - 18}`} fill={K.amber} />
                      <rect x={dx + 16} y={(dy + fy) / 2 - 34} width={300} height={68} fill="rgba(10,26,47,0.9)" stroke={K.amber} strokeWidth={2.5} />
                      {txt(dx + 166, (dy + fy) / 2 + 10, "배출 높이 = 저울 투입구", 25, K.amber, 900, "middle")}
                    </g>
                  );
                })()}
              </svg>
            ) : null}
          </>
        )}
      </Shot>
      <div style={{ position: "absolute", left: 1480, top: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: ease(frame, 10, 26) }}>
        {chip("재료 투입 · 진동 피더", li >= 0 ? K.cyan : K.dim)}
        <div style={{ color: K.cyan, fontSize: 32, fontWeight: 900 }}>↓</div>
        {chip("Z형 엘리베이터", li === 0 ? K.amber : K.cyan)}
        <div style={{ color: K.cyan, fontSize: 32, fontWeight: 900 }}>↓</div>
        {chip("조합 저울 · 계량", li === 1 ? K.amber : K.cyan)}
        <div style={{ color: K.cyan, fontSize: 32, fontWeight: 900 }}>↓</div>
        {chip("포장기 · 포장", li === 1 ? K.amber : K.cyan)}
      </div>
    </Frame>
  );
};

/* ───────────── 4. 버킷 · 체인 재질 ───────────── */
const Bucket: React.FC = () => {
  const s = T.scene("bucket");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const W = 1380;
  const H = (W * 9) / 16;
  const mag = li === 1 ? ease(frame, L[1].from + 6, L[1].from + 20) : 0;
  // 확대경: 버킷 표면 근처를 2.6배로 확대
  const fx = 0.2;
  const fy = 0.55;
  const R = 190;
  const Z = 2.6;
  return (
    <Frame id="bucket">
      <CadHeader no={3} title="버킷 · 체인 재질" />
      <Shot src={img.close(frame * 0.5)} x={20} y={150} w={W} opacity={li === 2 ? 1 - ease(frame, L[2].from - 6, L[2].from + 8) : 1}>
        {(w) => (
          <>
            <C a={[0.17, 0.53]} w={w} label="식품용 플라스틱 버킷" dx={200} dy={-110} start={L[0].from + 10} end={L[1].from - 4} />
            {mag > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: w * 0.62 - R,
                  top: H * 0.5 - R,
                  width: R * 2,
                  height: R * 2,
                  borderRadius: R,
                  overflow: "hidden",
                  border: `5px solid ${K.amber}`,
                  boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
                  opacity: mag,
                  transform: `scale(${0.7 + 0.3 * mag})`,
                  background: K.bg,
                }}
              >
                <Img
                  src={img.close(frame * 0.5)}
                  style={{ position: "absolute", maxWidth: "none", width: w * Z, height: H * Z, left: -(fx * w * Z) + R, top: -(fy * H * Z) + R }}
                />
              </div>
            ) : null}
            {mag > 0 ? (
              <div style={{ position: "absolute", left: w * 0.62 - 210, top: H * 0.5 + R + 20, width: 420, textAlign: "center", padding: "10px 0", border: `2.5px solid ${K.amber}`, background: "rgba(10,26,47,0.9)", color: K.amber, fontFamily: FONT, fontSize: 28, fontWeight: 900, opacity: mag }}>
                엠보싱 표면 → 달라붙음 방지
              </div>
            ) : null}
          </>
        )}
      </Shot>
      <Shot src={img.chain(frame)} x={20} y={150} w={W} opacity={li === 2 ? ease(frame, L[2].from - 6, L[2].from + 8) : 0}>
        {(w) => <C a={at(anchors.chain, "chain")} w={w} label="스테인리스 체인 (SUS)" dx={190} dy={-140} start={L[2].from + 12} />}
      </Shot>
      <Note x={1430} y={180} w={450} start={L[0].from} active={li === 0} title="식품용 플라스틱 버킷" desc="재료가 직접 닿는 부품" />
      <Note x={1430} y={300} w={450} start={L[1].from} active={li === 1} title="냉동 식품 → 엠보싱" desc="표면 요철로 눌러붙음 방지" />
      <Note x={1430} y={420} w={450} start={L[2].from} active={li === 2} title="내부 체인 = 스테인리스" desc="식품 생산 라인 필수" />
    </Frame>
  );
};

/* ───────────── 5. 이송 속도 · 청소 ───────────── */
const Operation: React.FC = () => {
  const s = T.scene("operation");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const W = 1300;
  const hi = 0;
  const Hh = anchors.hero[hi];
  // 속도 다이얼: 0(느림) ~ 1(빠름). 첫 문장에서 적정 구간으로 이동, 둘째 문장에서 양 끝을 보여줌
  const v =
    li <= 0
      ? interpolate(frame, [L[0].from + 20, L[0].from + 90], [0.15, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : li === 1
        ? interpolate(frame, [L[1].from, L[1].from + L[1].frames * 0.45, L[1].from + L[1].frames * 0.55, L[1].from + L[1].frames], [0.55, 0.95, 0.08, 0.55], { extrapolateRight: "clamp" })
        : 0.55;
  const gx = 1660;
  const gy = 330;
  const pol = (a: number, r: number) => [gx + r * Math.cos(((a - 90) * Math.PI) / 180), gy + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const ang = -120 + 240 * v;
  const vColor = v > 0.8 ? K.red : v < 0.25 ? K.amber : K.green;
  const arc = (a0: number, a1: number, c: string) => {
    const [x0, y0] = pol(a0, 120);
    const [x1, y1] = pol(a1, 120);
    return <path d={`M ${x0} ${y0} A 120 120 0 0 1 ${x1} ${y1}`} fill="none" stroke={c} strokeWidth={16} />;
  };
  const clean = ["버킷", "투입 호퍼 · 피더", "체인 · 레일 주변", "배출 슈트"];
  return (
    <Frame id="operation">
      <CadHeader no={4} title="이송 속도 · 청소" />
      <Shot src={img.hero(hi)} x={0} y={140} w={W}>
        {(w) => (
          <>
            <C a={at(Hh, "control")} w={w} label="제어반 · 인버터 속도 조절" dx={-200} dy={-90} start={L[0].from + 8} end={L[2].from - 4} />
            {li >= 2 ? <C a={at(Hh, "bucket")} w={w} label="버킷 · 호퍼 · 체인 청소" dx={130} dy={120} start={L[2].from + 8} /> : null}
          </>
        )}
      </Shot>
      {li <= 1 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: ease(frame, L[0].from, L[0].from + 14) }}>
          <circle cx={gx} cy={gy} r={160} fill="rgba(10,26,47,0.9)" stroke={K.dim} strokeWidth={2} />
          {arc(-120, -48, K.amber)}
          {arc(-48, 72, K.green)}
          {arc(72, 120, K.red)}
          <line x1={gx} y1={gy} x2={pol(ang, 100)[0]} y2={pol(ang, 100)[1]} stroke={vColor} strokeWidth={8} strokeLinecap="round" />
          <circle cx={gx} cy={gy} r={12} fill={K.text} />
          {txt(pol(-120, 150)[0] - 10, pol(-120, 150)[1] + 30, "느림", 22, K.amber, 700, "middle")}
          {txt(pol(120, 150)[0] + 10, pol(120, 150)[1] + 30, "빠름", 22, K.red, 700, "middle")}
          {txt(gx, gy - 175, "이송 속도", 26, K.cyan, 900, "middle")}
          {txt(gx, gy + 80, "포장기 속도에 맞춤", 22, K.green, 700, "middle")}
        </svg>
      ) : null}
      {li === 1 ? (
        <div style={{ position: "absolute", left: 1440, top: 540, display: "flex", flexDirection: "column", gap: 14 }}>
          {chip("너무 빠름 → 넘침 · 흩날림", K.red, "fast", ease(frame, L[1].from + 6, L[1].from + 18))}
          {chip("너무 느림 → 포장기 대기", K.amber, "slow", ease(frame, L[1].from + L[1].frames * 0.5, L[1].from + L[1].frames * 0.5 + 12))}
        </div>
      ) : null}
      {li >= 2 ? (
        <div style={{ position: "absolute", left: 1380, top: 190, width: 490, fontFamily: FONT, opacity: ease(frame, L[2].from, L[2].from + 14) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, color: K.cyan, fontSize: 30, fontWeight: 900, marginBottom: 16 }}>
            <IconWater color={K.cyan} /> 주기적 청소 부위
          </div>
          {clean.map((c, i) => {
            const on = frame >= L[2].from + 14 + i * 16;
            return (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, opacity: on ? 1 : 0.3 }}>
                <div style={{ width: 34, height: 34, background: on ? K.green : "transparent", border: `2px solid ${on ? K.green : K.dim}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {on ? (
                    <svg width={24} height={24} viewBox="0 0 24 24">
                      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={K.bg} strokeWidth={3.2} strokeLinecap="round" />
                    </svg>
                  ) : null}
                </div>
                <div style={{ color: K.text, fontSize: 28, fontWeight: 700 }}>{c}</div>
              </div>
            );
          })}
          {li === 3 ? (
            <div style={{ marginTop: 18, padding: "14px 18px", border: `2.5px solid ${K.amber}`, background: "rgba(255,181,71,0.12)", color: K.amber, fontSize: 27, fontWeight: 900, opacity: ease(frame, L[3].from, L[3].from + 12) }}>
              버킷 분리 세척 구조인지 확인
            </div>
          ) : null}
        </div>
      ) : null}
    </Frame>
  );
};

/* ───────────── 6. 수입 통관 · FTA ───────────── */
const Import: React.FC = () => {
  const s = T.scene("import");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const seg = [
    { t: "84", label: "류", desc: "기계류" },
    { t: "28", label: "호 (8428)", desc: "기타 양중 · 운반 기계" },
    { t: ".32", label: "소호", desc: "버킷식 연속 운반기" },
  ];
  const on1 = li >= 1;
  return (
    <Frame id="import">
      <CadHeader no={5} title="수입 통관 · FTA" />
      <Shot src={img.hero(150)} x={1180} y={130} w={720} opacity={0.9} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <g opacity={ease(frame, L[0].from, L[0].from + 14)}>
          {txt(120, 210, "① HS 코드 확인 → 세관장 확인 대상인지 점검", 30, li === 0 ? K.amber : K.text, 900)}
        </g>
        {seg.map((g, i) => {
          const x = 120 + i * 300;
          const o = ease(frame, L[1].from + i * 12, L[1].from + 14 + i * 12);
          return (
            <g key={g.t} opacity={o}>
              <rect x={x} y={250} width={280} height={110} fill={on1 ? "rgba(255,181,71,0.12)" : "rgba(10,26,47,0.85)"} stroke={on1 ? K.amber : K.cyan} strokeWidth={2.5} />
              {txt(x + 140, 323, g.t, 64, on1 ? K.amber : K.text, 900, "middle")}
              {txt(x + 140, 392, g.label, 22, K.cyan, 700, "middle")}
              {txt(x + 140, 422, g.desc, 21, K.sub, 400, "middle")}
            </g>
          );
        })}
        <g opacity={ease(frame, L[1].from + 40, L[1].from + 54)}>
          {txt(1040, 330, "→ 8428.32", 52, K.amber, 900)}
        </g>
      </svg>
      {li >= 2 ? (
        <div style={{ position: "absolute", left: 120, top: 470, display: "flex", gap: 16, alignItems: "center", opacity: ease(frame, L[2].from, L[2].from + 14) }}>
          {chip("식품 접촉 부품 → 관련 요건 확인", li === 2 ? K.amber : K.cyan)}
          {chip("전기 설비 → 전기 안전 요건", li === 2 ? K.amber : K.cyan)}
        </div>
      ) : null}
      {li >= 3 ? (
        <div style={{ position: "absolute", left: 120, top: 600, display: "flex", gap: 16, alignItems: "center", fontFamily: FONT, opacity: ease(frame, L[3].from, L[3].from + 14) }}>
          {chip("FTA 원산지 증명서", li === 3 ? K.amber : K.cyan)}
          <div style={{ color: K.green, fontSize: 36, fontWeight: 900 }}>→</div>
          {chip("협정 세율 적용", li === 3 ? K.amber : K.cyan, "rate", ease(frame, L[3].from + 20, L[3].from + 32))}
          <div style={{ color: K.green, fontSize: 36, fontWeight: 900, opacity: ease(frame, L[3].from + 30, L[3].from + 42) }}>→</div>
          <div style={{ padding: "12px 26px", border: `3px solid ${K.green}`, background: "rgba(92,208,142,0.15)", color: K.green, fontSize: 34, fontWeight: 900, opacity: ease(frame, L[3].from + 40, L[3].from + 54) }}>
            관세 0% (면제 가능)
          </div>
        </div>
      ) : null}
      {li >= 4 ? (
        <div style={{ position: "absolute", left: 120, top: 730, display: "flex", gap: 14, alignItems: "center", fontFamily: FONT, opacity: ease(frame, L[4].from, L[4].from + 14) }}>
          {["계약", "선적 전 C/O 요청", "선적", "수입신고 · C/O 제출"].map((t, i) => (
            <React.Fragment key={t}>
              {i ? <div style={{ color: K.dim, fontSize: 28, fontWeight: 900 }}>→</div> : null}
              {chip(t, i === 1 ? K.amber : K.cyan, t, ease(frame, L[4].from + i * 12, L[4].from + 12 + i * 12))}
            </React.Fragment>
          ))}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 120, top: 850, width: 1300, fontFamily: FONT, fontSize: 19, color: K.sub, opacity: ease(frame, L[1].from + 50, L[1].from + 64) }}>
        ※ 최종 세번과 관세율 · 요건은 제품 구성과 원산지에 따라 달라지므로 관세사와 확인하세요.
      </div>
    </Frame>
  );
};

/* ───────────── 7. 마무리 ───────────── */
const Outro: React.FC = () => {
  const s = T.scene("outro");
  const frame = useCurrentFrame();
  const fade2 = ease(frame, s.frames - 30, s.frames, 1, 0);
  const list = ["버킷 · 체인 재질 (식품용 · SUS)", "냉동 식품 → 엠보싱 버킷", "이송 속도 = 포장기 속도", "주기적 청소 · 분리 세척", "HS 코드 · 세관장 확인", "FTA 원산지 증명서"];
  return (
    <AbsoluteFill style={{ opacity: fade2 }}>
      <Frame id="outro">
        <Shot src={img.hero(front(frame * 0.3 + 30))} x={760} y={90} w={1200} />
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
  structure: Structure,
  line: Line,
  bucket: Bucket,
  operation: Operation,
  import: Import,
  outro: Outro,
};

export const ZElevator: React.FC = () => (
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
      volume={(f) => 0.13 * interpolate(f, [ZELEVATOR_FRAMES - 60, ZELEVATOR_FRAMES], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  </AbsoluteFill>
);
