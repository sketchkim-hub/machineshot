import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Callout, ease } from "../components";
import { FONT } from "../theme";
import { lineAt } from "../timeline";
import { CadHeader, K, Note } from "../shredder/cad";
import { Frame, txt } from "../freezer/scenes1";
import { T } from "../freezer/timeline";
import anchors from "./anchors.json";

const pad = (n: number) => String(n).padStart(3, "0");
const mod = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const hero = (i: number) => staticFile(`render3d/hero/h${pad(mod(i, 180))}.png`);
const close = (i: number) => staticFile(`render3d/close/c${pad(mod(i, 90))}.png`);
const layoutImg = (i: number) => staticFile(`render3d/layout/l${pad(Math.max(0, Math.min(119, Math.round(i))))}.png`);
const vesselImg = (i: number) => staticFile(`render3d/vessel/v${pad(Math.max(0, Math.min(89, Math.round(i))))}.png`);

type HeroKey = keyof (typeof anchors.hero)[number];
type LayoutKey = keyof (typeof anchors.layout)[number];
type VesselKey = keyof (typeof anchors.vessel)[number];

/** 16:9 렌더 이미지를 놓는 영역. 자식은 정규화 좌표 → px 변환에 쓰는 w,h 를 받음 */
const Shot: React.FC<{
  src: string;
  x: number;
  y: number;
  w: number;
  opacity?: number;
  dx?: number;
  children?: (w: number, h: number) => React.ReactNode;
}> = ({ src, x, y, w, opacity = 1, dx = 0, children }) => {
  const h = (w * 9) / 16;
  return (
    <div style={{ position: "absolute", left: x + dx, top: y, width: w, height: h, opacity }}>
      <Img src={src} style={{ width: "100%", height: "100%" }} />
      {children ? children(w, h) : null}
    </div>
  );
};

/* ───────────── 1. 인트로 ───────────── */
export const Intro3D: React.FC = () => {
  const frame = useCurrentFrame();
  const a = ease(frame, 10, 30);
  const b = ease(frame, 20, 42);
  const c = ease(frame, 34, 56);
  return (
    <Frame id="intro">
      <Shot src={hero(frame)} x={430} y={70} w={1560} opacity={ease(frame, 0, 20)} />
      <div style={{ position: "absolute", left: 100, top: 230, fontFamily: FONT }}>
        <div style={{ color: K.cyan, fontSize: 26, fontWeight: 700, letterSpacing: 6, opacity: a }}>SPIRAL QUICK FREEZER</div>
        <div style={{ color: K.text, fontSize: 92, fontWeight: 900, lineHeight: 1.12, marginTop: 16, opacity: b, textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>
          나선형
          <br />
          급속 냉동기
        </div>
        <div style={{ width: 160 * c, height: 6, background: K.amber, margin: "28px 0 24px" }} />
        <div style={{ color: K.sub, fontSize: 32, fontWeight: 700, opacity: c }}>해외 수입 전 체크포인트</div>
      </div>
    </Frame>
  );
};

/* ───────────── 2. 구조와 원리 ───────────── */
const AirFlow: React.FC<{ w: number; h: number; frame: number }> = ({ w, h, frame }) => (
  <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
    {[0.3, 0.45, 0.6, 0.75].map((yy, i) => {
      const y = h * yy;
      return (
        <g key={yy}>
          <path
            d={`M ${w * 0.02} ${y} C ${w * 0.2} ${y - 30}, ${w * 0.35} ${y + 30}, ${w * 0.55} ${y}`}
            fill="none"
            stroke={K.cyan}
            strokeWidth={5}
            strokeDasharray="26 18"
            strokeDashoffset={-frame * 4 - i * 20}
            opacity={0.85}
          />
          <polygon points={`${w * 0.55 + 18},${y} ${w * 0.55},${y - 10} ${w * 0.55},${y + 10}`} fill={K.cyan} />
        </g>
      );
    })}
  </svg>
);

const HERO_LABELS: { key: HeroKey; label: string; dx: number; dy: number; line: number }[] = [
  { key: "drum", label: "회전 드럼", dx: -150, dy: -70, line: 0 },
  { key: "belt", label: "나선 벨트", dx: 150, dy: -40, line: 0 },
];

export const Structure3D: React.FC = () => {
  const s = T.scene("structure");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const W = 1380;
  const hi = mod(frame * 0.5 + 20, 180);
  const closeO = li === 1 ? Math.min(ease(frame, L[1].from - 8, L[1].from + 8), ease(frame, L[2].from - 8, L[2].from + 6, 1, 0)) : 0;
  const cmp = ease(frame, L[2].from + 10, L[2].from + 40);
  return (
    <Frame id="structure">
      <CadHeader no={1} title="구조와 원리" />
      <Shot src={hero(hi)} x={20} y={150} w={W} opacity={1 - closeO}>
        {(w) =>
          HERO_LABELS.map((l) => (
            <Callout
              key={l.key}
              at={anchors.hero[Math.floor(hi)][l.key] as [number, number]}
              w={w}
              label={l.label}
              dx={l.dx}
              dy={l.dy}
              aspect={16 / 9}
              start={L[l.line].from + 8}
              end={L[1].from - 6}
            />
          ))
        }
      </Shot>
      {closeO > 0 ? (
        <Shot src={close(frame)} x={20} y={150} w={W} opacity={closeO}>
          {(w, h) => (
            <>
              <AirFlow w={w} h={h} frame={frame} />
              <div style={{ position: "absolute", left: 30, top: 24, padding: "8px 18px", border: `2px solid ${K.cyan}`, background: "rgba(10,26,47,0.8)", color: K.cyan, fontFamily: FONT, fontSize: 28, fontWeight: 900 }}>
                증발기 팬 → 찬 공기 순환
              </div>
            </>
          )}
        </Shot>
      ) : null}
      <Note x={1430} y={180} w={440} start={L[0].from} active={li === 0} title="① 드럼 + 나선 벨트" desc="벨트가 드럼을 따라 감겨 올라감" />
      <Note x={1430} y={310} w={440} start={L[1].from} active={li === 1} title="② 찬 공기로 급속 냉동" desc="제품 색: 주황 → 흰색(냉동)" />
      <Note x={1430} y={440} w={440} start={L[2].from} active={li === 2} title="③ 대량 생산 라인" desc="좁은 면적 · 긴 체류 시간" />
      {cmp > 0 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: cmp }}>
          <rect x={1430} y={590} width={440} height={220} fill="rgba(10,26,47,0.85)" stroke={K.cyan} strokeWidth={2} />
          {txt(1450, 625, "같은 벨트를 펼치면", 22, K.cyan, 700)}
          <rect x={1450} y={650} width={70} height={60} fill="rgba(255,181,71,0.2)" stroke={K.amber} strokeWidth={2.5} />
          {txt(1485, 740, "나선형", 19, K.amber, 700, "middle")}
          <rect x={1540} y={670} width={310 * cmp} height={20} fill="rgba(94,200,242,0.2)" stroke={K.cyan} strokeWidth={2} />
          {txt(1695, 740, "긴 직선 컨베이어", 19, K.sub, 400, "middle")}
          {txt(1450, 790, "→ 좁은 면적에서 긴 냉동 시간", 21, K.text, 700)}
        </svg>
      ) : null}
    </Frame>
  );
};

/* ───────────── 3. 공장 배치도 ───────────── */
const LAYOUT_LABELS: { key: LayoutKey; label: string; dx: number; dy: number; line: number; color?: string }[] = [
  { key: "freezer", label: "나선형 냉동기 + 점검 공간", dx: -40, dy: -120, line: 1 },
  { key: "infeed", label: "입구 컨베이어 ← 전처리실", dx: 40, dy: 120, line: 1 },
  { key: "outfeed", label: "출구 컨베이어 → 포장실", dx: 110, dy: 100, line: 1 },
  { key: "machine", label: "기계실 (압축기 · 응축기)", dx: 150, dy: -40, line: 2 },
  { key: "pipe", label: "냉매 배관 경로", dx: -150, dy: -120, line: 2 },
  { key: "elec", label: "전기 패널", dx: 140, dy: 30, line: 2 },
  { key: "drain", label: "배수구 (제상수)", dx: -130, dy: 120, line: 2 },
  { key: "door", label: "반입구 폭 ≥ 모듈 크기", dx: 150, dy: 60, line: 3 },
];

export const Layout3D: React.FC = () => {
  const s = T.scene("layout");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const idx = interpolate(frame, [L[0].from, L[0].from + 140], [0, 119], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const W = 1640;
  const ck = (i: number) => frame >= [L[1].from, L[1].from + 50, L[2].from, L[2].from + 60, L[3].from][i];
  return (
    <Frame id="layout">
      <CadHeader no={2} title="공장 배치도" />
      <Shot src={layoutImg(idx)} x={-90} y={70} w={W}>
        {(w) =>
          LAYOUT_LABELS.map((l, i) => (
            <Callout
              key={l.key}
              at={anchors.layout[119][l.key] as [number, number]}
              w={w}
              label={l.label}
              dx={l.dx}
              dy={l.dy}
              aspect={16 / 9}
              start={L[l.line].from + 6 + (i % 4) * 14}
              end={l.line < 3 ? L[l.line + 1].from - 4 : undefined}
            />
          ))
        }
      </Shot>
      {["장비 크기 · 점검 공간", "입 · 출구 라인 연결", "기계실 · 냉매 배관", "전기 패널 · 배수", "반입구 크기 · 동선"].map((t, i) => (
        <div
          key={t}
          style={{
            position: "absolute",
            left: 1490,
            top: 200 + i * 80,
            width: 390,
            display: "flex",
            gap: 12,
            alignItems: "center",
            fontFamily: FONT,
            opacity: ease(frame, L[0].from + 10 + i * 5, L[0].from + 22 + i * 5),
          }}
        >
          <div style={{ width: 32, height: 32, border: `2px solid ${ck(i) ? K.green : K.dim}`, background: ck(i) ? K.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {ck(i) ? (
              <svg width={22} height={22} viewBox="0 0 24 24">
                <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={K.bg} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </div>
          <div style={{ color: ck(i) ? K.text : K.sub, fontSize: 24, fontWeight: 700 }}>{t}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 1490, top: 620, width: 380, fontFamily: FONT, fontSize: 19, color: K.sub, lineHeight: 1.5, opacity: ease(frame, L[0].from + 30, L[0].from + 44) }}>
        {li >= 0 ? "배치 예시 · 실제 배치는 공장 도면과 장비 사양에 맞춰 작성" : ""}
      </div>
    </Frame>
  );
};

/** 밝은 3D 배경 위에서도 읽히도록 어두운 바탕을 깐 라벨 */
const tag = (x: number, y: number, t: string, size: number, color: string, anchor: "start" | "middle" = "middle") => {
  const tw = t.length * size * 0.9 + 36;
  const x0 = anchor === "middle" ? x - tw / 2 : x - 18;
  return (
    <g>
      <rect x={x0} y={y - size - 10} width={tw} height={size + 26} fill="rgba(8,18,34,0.9)" stroke={color} strokeWidth={2.5} />
      {txt(anchor === "middle" ? x : x, y + 2, t, size, color, 900, anchor)}
    </g>
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

export const Gas3D: React.FC = () => {
  const s = T.scene("gas");
  const frame = useCurrentFrame();
  const L = s.lines;
  const li = lineAt(s, frame);
  const vi = interpolate(frame, [0, s.frames], [0, 89], { extrapolateRight: "clamp" });
  const A = anchors.vessel[Math.round(vi)];
  const W = 1200;
  const H = (W * 9) / 16;
  const px = (k: VesselKey): [number, number] => [A[k][0] * W, A[k][1] * H];
  const shake = li === 3 ? Math.sin(frame / 2.2) * 7 * ease(frame, L[3].from + 10, L[3].from + 20) : 0;
  const press = interpolate(frame, [L[4].from + 20, L[4].from + 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const burst = li === 5 ? ease(frame, L[5].from + 25, L[5].from + 32) : 0;
  const drop = li === 5 ? interpolate(frame, [L[5].from + 30, L[5].from + 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const gauge = li >= 4 ? press * (1 - drop * 0.85) : 0;
  const stamp = li === 7 ? ease(frame, L[7].from + L[7].frames - 30, L[7].from + L[7].frames - 15) : 0;
  const fillO = li === 7 ? ease(frame, L[7].from + 30, L[7].from + 50) : 0;
  const [gx, gy] = px("gauge");
  const hudX = W - 130;
  const hudY = 200;
  const needle = -120 + 240 * 0.82 * gauge;
  const tick = -120 + 240 * 0.82;
  const polar = (a: number, r: number): [number, number] => [hudX + r * Math.cos(((a - 90) * Math.PI) / 180), hudY + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const n2 = li >= 4 && li <= 5 ? ease(frame, L[4].from, L[4].from + 14) : 0;
  const bottomCard = (children: React.ReactNode, o: number) => (
    <div style={{ position: "absolute", left: 690, top: 790, width: 1180, display: "flex", gap: 18, alignItems: "center", justifyContent: "center", fontFamily: FONT, opacity: o }}>
      {children}
    </div>
  );
  const chip = (t: string, c: string, key?: string) => (
    <div key={key ?? t} style={{ padding: "10px 20px", border: `2.5px solid ${c}`, background: "rgba(10,26,47,0.88)", color: c, fontSize: 25, fontWeight: 900 }}>
      {t}
    </div>
  );
  return (
    <Frame id="gas">
      <CadHeader no={5} title="고압가스 안전검사" />
      {STEPS.map((st, i) => {
        const last = Math.max(...st.lines);
        const done = li > last || (li === 7 && last === 7 && frame > L[7].from + L[7].frames - 20);
        const on = st.lines.includes(li);
        return (
          <div
            key={st.t}
            style={{
              position: "absolute",
              left: 70,
              top: 178 + i * 92,
              width: 580,
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
      <Shot src={vesselImg(vi)} x={680} y={160} w={W} dx={shake}>
        {(w, h) => (
          <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            {/* 압력용기 강조 */}
            {li === 0 ? (
              <g opacity={ease(frame, L[0].from + 10, L[0].from + 24)}>
                <line x1={px("vessel")[0]} y1={px("vessel")[1]} x2={px("vessel")[0] + 80} y2={px("vessel")[1] + 150} stroke={K.amber} strokeWidth={3} />
                <circle cx={px("vessel")[0]} cy={px("vessel")[1]} r={8} fill={K.amber} />
                {tag(px("vessel")[0] + 90, px("vessel")[1] + 170, "압력용기 (수액기)", 30, K.amber, "start")}
              </g>
            ) : null}
            {/* 내진 · 앵커 */}
            {li === 3
              ? (["anchor", "anchor2"] as VesselKey[]).map((k) => (
                  <circle key={k} cx={px(k)[0]} cy={px(k)[1]} r={26 + 4 * Math.sin(frame / 4)} fill="none" stroke={K.amber} strokeWidth={4} />
                ))
              : null}
            {li === 3 ? (
              <g opacity={ease(frame, L[3].from + 6, L[3].from + 18)}>
                {[0, 1].map((k) => (
                  <path
                    key={k}
                    transform={`translate(${k ? w - 160 : 40} ${h * 0.45})`}
                    d="M 0 0 h 120 M 0 0 l 18 -12 M 0 0 l 18 12 M 120 0 l -18 -12 M 120 0 l -18 12"
                    stroke={K.amber}
                    strokeWidth={5}
                    fill="none"
                  />
                ))}
                {tag(w / 2, h - 34, "내진 설계 · 앵커 볼트로 기초에 고정", 30, K.amber)}
              </g>
            ) : null}
            {/* 질소 흐름 */}
            {n2 > 0 ? (
              <g opacity={n2}>
                <line x1={px("n2")[0]} y1={px("n2")[1]} x2={px("valveIn")[0]} y2={px("valveIn")[1]} stroke={K.cyan} strokeWidth={4} strokeDasharray="12 10" strokeDashoffset={-frame * 3} />
                {tag(px("n2")[0], px("n2")[1] - 150, "질소 (N₂)", 28, K.cyan)}
              </g>
            ) : null}
            {/* 압력계 HUD */}
            {li >= 4 && li <= 7 ? (
              <g opacity={ease(frame, L[4].from + 6, L[4].from + 18)}>
                <line x1={gx} y1={gy} x2={hudX - 76} y2={hudY + 10} stroke={K.text} strokeWidth={2} />
                <circle cx={hudX} cy={hudY} r={78} fill="rgba(10,26,47,0.92)" stroke={K.text} strokeWidth={3} />
                <path d={`M ${polar(-120, 64)[0]} ${polar(-120, 64)[1]} A 64 64 0 1 1 ${polar(120, 64)[0]} ${polar(120, 64)[1]}`} fill="none" stroke={K.dim} strokeWidth={3} />
                <line x1={polar(tick, 54)[0]} y1={polar(tick, 54)[1]} x2={polar(tick, 74)[0]} y2={polar(tick, 74)[1]} stroke={K.amber} strokeWidth={5} />
                <line x1={hudX} y1={hudY} x2={polar(needle, 58)[0]} y2={polar(needle, 58)[1]} stroke={drop > 0.3 ? K.red : K.amber} strokeWidth={5} strokeLinecap="round" />
                <circle cx={hudX} cy={hudY} r={7} fill={K.text} />
                {txt(hudX, hudY + 112, "시험 압력", 24, K.amber, 900, "middle")}
              </g>
            ) : null}
            {li === 4 ? (
              <g opacity={ease(frame, L[4].from + 70, L[4].from + 85)}>{tag(w / 2, h - 34, "일정 압력 유지 → 누설 · 변형 없음 확인", 30, K.green)}</g>
            ) : null}
            {/* 파열 */}
            {burst > 0 ? (
              <g opacity={burst}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const a = (i * 30 * Math.PI) / 180;
                  const [cx, cy] = px("valveOut");
                  return <line key={i} x1={cx + 26 * Math.cos(a)} y1={cy + 26 * Math.sin(a)} x2={cx + (58 + (i % 2) * 22) * Math.cos(a)} y2={cy + (58 + (i % 2) * 22) * Math.sin(a)} stroke={K.red} strokeWidth={5} />;
                })}
                <circle cx={px("valveOut")[0]} cy={px("valveOut")[1]} r={30} fill="rgba(255,94,94,0.35)" />
                {tag(w / 2, h - 34, "한국 규격 미달 밸브 → 압력을 못 견디고 파열", 30, K.red)}
              </g>
            ) : null}
            {/* 기준 충족 밸브 */}
            {li === 6 ? <circle cx={px("valveOut")[0]} cy={px("valveOut")[1]} r={34} fill="none" stroke={K.green} strokeWidth={5} /> : null}
            {/* 냉매 충전 */}
            {fillO > 0 ? (
              <g opacity={fillO}>
                <rect x={px("vessel")[0] - 150} y={px("vessel")[1] - 30} width={300} height={56} fill="rgba(10,26,47,0.85)" stroke={K.cyan} strokeWidth={3} />
                {txt(px("vessel")[0], px("vessel")[1] + 8, "냉매 충전", 30, K.cyan, 900, "middle")}
              </g>
            ) : null}
            {stamp > 0 ? (
              <g opacity={stamp} transform={`translate(${w - 330} ${h - 170}) rotate(-12) scale(${1.4 - 0.4 * stamp})`}>
                <rect x={0} y={0} width={270} height={84} fill="rgba(92,208,142,0.15)" stroke={K.green} strokeWidth={5} />
                {txt(135, 56, "완성검사 합격", 32, K.green, 900, "middle")}
              </g>
            ) : null}
          </svg>
        )}
      </Shot>
      {li === 2 ? bottomCard(["설계 도면", "강도 계산서", "재료 증명서"].map((t, i) => <div key={t} style={{ opacity: ease(frame, L[2].from + i * 14, L[2].from + 12 + i * 14) }}>{chip(t, K.amber)}</div>), ease(frame, L[2].from, L[2].from + 12)) : null}
      {li === 6
        ? bottomCard(
            <>
              {chip("한국 가스 검사 기준", K.amber)}
              <div style={{ color: K.amber, fontSize: 34, fontWeight: 900 }}>→</div>
              {chip("해외 제조사", K.cyan)}
              <div style={{ color: K.green, fontSize: 34, fontWeight: 900, opacity: ease(frame, L[6].from + 30, L[6].from + 42) }}>→</div>
              <div style={{ opacity: ease(frame, L[6].from + 36, L[6].from + 50) }}>{chip("기준 충족 부품: 밸브 · 용기 · 배관", K.green)}</div>
            </>,
            ease(frame, L[6].from, L[6].from + 14),
          )
        : null}
    </Frame>
  );
};

/* ───────────── 7. 요약 ───────────── */
export const Outro3D: React.FC = () => {
  const s = T.scene("outro");
  const frame = useCurrentFrame();
  const L = s.lines;
  const fade = ease(frame, s.frames - 30, s.frames, 1, 0);
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
  const y = 700;
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Frame id="outro">
        <CadHeader no={6} title="수입 준비 요약" />
        <Shot src={hero(frame + 90)} x={560} y={110} w={800} />
        <svg width={1920} height={1080} style={{ position: "absolute" }}>
          <line x1={x0} y1={y} x2={x0 + step * 7 * interpolate(frame, [L[1].from, L[1].from + L[1].frames * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} y2={y} stroke={K.cyan} strokeWidth={4} />
          {nodes.map(([a, b], i) => {
            const t = L[1].from + (L[1].frames * 0.8 * i) / 7;
            const o = ease(frame, t - 6, t + 6);
            const last = i === nodes.length - 1;
            return (
              <g key={a} opacity={Math.max(0.25, o)}>
                <circle cx={x0 + i * step} cy={y} r={22} fill={o >= 1 ? (last ? K.green : K.amber) : K.bg} stroke={last ? K.green : K.amber} strokeWidth={3} />
                {txt(x0 + i * step, y + 62, a, 27, K.text, 900, "middle")}
                {b ? txt(x0 + i * step, y + 96, b, 20, K.sub, 700, "middle") : null}
              </g>
            );
          })}
          <g opacity={ease(frame, L[0].from, L[0].from + 14)}>
            <rect x={x0 - 40} y={y - 60} width={step * 4 + 80} height={195} fill="none" stroke={K.amber} strokeWidth={2} strokeDasharray="12 8" />
            {txt(x0 - 30, y - 72, "계약 단계부터 챙길 것", 22, K.amber, 900)}
          </g>
        </svg>
      </Frame>
    </AbsoluteFill>
  );
};
