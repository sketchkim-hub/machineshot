import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../components";
import { FONT } from "../theme";

// 청사진(블루프린트) 도면 색상
export const K = {
  bg: "#0A1A2F",
  bg2: "#10284A",
  minor: "rgba(120, 170, 230, 0.07)",
  major: "rgba(120, 170, 230, 0.14)",
  line: "#D4E8FF",
  cyan: "#5EC8F2",
  dim: "#86B4E0",
  hidden: "rgba(212, 232, 255, 0.45)",
  amber: "#FFB547",
  red: "#FF5E5E",
  green: "#5CD08E",
  text: "#EAF3FF",
  sub: "#9DB8D8",
};

/** 도면 용지: 모눈 + 테두리 + 구역 표시 */
export const Sheet: React.FC = () => {
  const zones = ["A", "B", "C", "D"];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 70% at 50% 45%, ${K.bg2}, ${K.bg})` }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${K.major} 1.5px, transparent 1.5px), linear-gradient(90deg, ${K.major} 1.5px, transparent 1.5px), linear-gradient(${K.minor} 1px, transparent 1px), linear-gradient(90deg, ${K.minor} 1px, transparent 1px)`,
          backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
          backgroundPosition: "-10px -10px",
        }}
      />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <rect x={24} y={24} width={1872} height={1032} fill="none" stroke={K.dim} strokeWidth={2} opacity={0.7} />
        <rect x={40} y={40} width={1840} height={1000} fill="none" stroke={K.dim} strokeWidth={1} opacity={0.5} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <text key={`n${i}`} x={40 + 1840 * ((i + 0.5) / 6)} y={36} fill={K.dim} fontSize={13} textAnchor="middle" fontFamily={FONT} opacity={0.7}>
            {i + 1}
          </text>
        ))}
        {zones.map((z, i) => (
          <text key={z} x={32} y={40 + 1000 * ((i + 0.5) / 4)} fill={K.dim} fontSize={13} textAnchor="middle" fontFamily={FONT} opacity={0.7}>
            {z}
          </text>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/** 우상단 표제란 */
export const TitleBlock: React.FC<{ title: string; sheet: number; total: number; prefix?: string }> = ({ title, sheet, total, prefix = "SHR" }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, 4, 20);
  const cell = (label: string, value: string, x: number, y: number, w: number) => (
    <g>
      <rect x={x} y={y} width={w} height={36} fill="rgba(10,26,47,0.85)" stroke={K.dim} strokeWidth={1.2} />
      <text x={x + 10} y={y + 23} fill={K.sub} fontSize={14} fontFamily={FONT}>
        {label}
      </text>
      <text x={x + w - 10} y={y + 24} fill={K.text} fontSize={17} fontWeight={700} textAnchor="end" fontFamily={FONT}>
        {value}
      </text>
    </g>
  );
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", opacity: o }}>
      {cell("도면명", title, 1430, 52, 434)}
      {cell("DWG NO.", `${prefix}-${String(sheet).padStart(2, "0")}`, 1430, 88, 217)}
      {cell("SHEET", `${sheet} / ${total}`, 1647, 88, 217)}
    </svg>
  );
};

/** 점점 그려지는 선 (CAD 플로팅 느낌) */
export const D: React.FC<
  { d: string; p: number; color?: string; w?: number; fill?: string; dash?: string; opacity?: number } & React.SVGProps<SVGPathElement>
> = ({ d, p, color = K.line, w = 2.5, fill = "none", dash, opacity = 1, ...rest }) => {
  if (p <= 0) return null;
  return (
    <path
      d={d}
      fill={p >= 1 ? fill : "none"}
      stroke={color}
      strokeWidth={w}
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity={opacity}
      pathLength={dash ? undefined : 1}
      strokeDasharray={dash ?? "1 1"}
      strokeDashoffset={dash ? undefined : 1 - Math.min(1, p)}
      {...rest}
    />
  );
};

export const progress = (frame: number, start: number, dur = 30) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** 등각 투영 */
export const makeIso = (ox: number, oy: number, s: number) => (x: number, y: number, z: number): [number, number] => [
  ox + (x - y) * 0.866 * s,
  oy + (x + y) * 0.5 * s - z * s,
];
export type Iso = ReturnType<typeof makeIso>;
type P3 = [number, number, number];

/** 상자 모서리: 보이는 모서리는 실선, (x0,y0,z0) 에 닿는 모서리는 숨은선(점선) */
export const boxEdges = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
  const v = (a: number, b: number, c: number): P3 => [a ? x1 : x0, b ? y1 : y0, c ? z1 : z0];
  const e: { a: P3; b: P3; hidden: boolean }[] = [];
  const corners = [0, 1].flatMap((a) => [0, 1].flatMap((b) => [0, 1].map((c) => [a, b, c])));
  corners.forEach(([a, b, c]) => {
    if (!a) e.push({ a: v(a, b, c), b: v(1, b, c), hidden: !b && !c });
    if (!b) e.push({ a: v(a, b, c), b: v(a, 1, c), hidden: !a && !c });
    if (!c) e.push({ a: v(a, b, c), b: v(a, b, 1), hidden: !a && !b });
  });
  return e;
};

export const Seg: React.FC<{ iso: Iso; a: P3; b: P3; p: number; hidden?: boolean; color?: string; w?: number }> = ({
  iso,
  a,
  b,
  p,
  hidden,
  color = K.line,
  w = 2.5,
}) => {
  const [x1, y1] = iso(...a);
  const [x2, y2] = iso(...b);
  if (hidden) {
    return p > 0 ? (
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={K.hidden} strokeWidth={1.6} strokeDasharray="8 6" opacity={Math.min(1, p)} />
    ) : null;
  }
  return <D d={`M${x1} ${y1} L${x2} ${y2}`} p={p} color={color} w={w} />;
};

/** 번호 풍선 + 지시선 + 명칭 */
export const Balloon: React.FC<{
  at: [number, number];
  to: [number, number];
  n: number;
  label: string;
  start: number;
  active?: boolean;
}> = ({ at, to, n, label, start, active }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - start, fps, config: { damping: 200 }, durationInFrames: 16 });
  if (p <= 0) return null;
  const c = active ? K.amber : K.cyan;
  const right = to[0] >= at[0];
  const ex = at[0] + (to[0] - at[0]) * p;
  const ey = at[1] + (to[1] - at[1]) * p;
  return (
    <g opacity={p}>
      <circle cx={at[0]} cy={at[1]} r={5} fill={c} />
      <line x1={at[0]} y1={at[1]} x2={ex} y2={ey} stroke={c} strokeWidth={2} />
      <circle cx={ex} cy={ey} r={20} fill={K.bg} stroke={c} strokeWidth={2.5} />
      <text x={ex} y={ey + 7} fill={c} fontSize={20} fontWeight={900} textAnchor="middle" fontFamily={FONT}>
        {n}
      </text>
      <text
        x={ex + (right ? 30 : -30)}
        y={ey + 9}
        fill={active ? K.amber : K.text}
        fontSize={27}
        fontWeight={700}
        textAnchor={right ? "start" : "end"}
        fontFamily={FONT}
      >
        {label}
      </text>
    </g>
  );
};

/** 치수선 */
export const Dim: React.FC<{ x1: number; y1: number; x2: number; y2: number; label: string; o: number; off?: number }> = ({
  x1,
  y1,
  x2,
  y2,
  label,
  o,
  off = 0,
}) => {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(ang) * off;
  const ny = Math.cos(ang) * off;
  const a = [x1 + nx, y1 + ny];
  const b = [x2 + nx, y2 + ny];
  const head = (px: number, py: number, dir: number) => {
    const s = 14;
    const ca = Math.cos(ang) * dir;
    const sa = Math.sin(ang) * dir;
    return `${px},${py} ${px + ca * s - sa * 5},${py + sa * s + ca * 5} ${px + ca * s + sa * 5},${py + sa * s - ca * 5}`;
  };
  return (
    <g opacity={o}>
      <line x1={x1} y1={y1} x2={a[0]} y2={a[1]} stroke={K.dim} strokeWidth={1.2} />
      <line x1={x2} y1={y2} x2={b[0]} y2={b[1]} stroke={K.dim} strokeWidth={1.2} />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={K.dim} strokeWidth={1.5} />
      <polygon points={head(a[0], a[1], 1)} fill={K.dim} />
      <polygon points={head(b[0], b[1], -1)} fill={K.dim} />
      <text
        x={(a[0] + b[0]) / 2}
        y={(a[1] + b[1]) / 2 - 10}
        fill={K.dim}
        fontSize={20}
        textAnchor="middle"
        fontFamily={FONT}
      >
        {label}
      </text>
    </g>
  );
};

/** 빗금 패턴 (단면) */
export const Hatch: React.FC<{ id: string; color?: string; gap?: number }> = ({ id, color = K.cyan, gap = 10 }) => (
  <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1={0} y1={0} x2={0} y2={gap} stroke={color} strokeWidth={2} />
  </pattern>
);

/** 도면용 큰 제목 (장면 좌상단) */
export const CadHeader: React.FC<{ no: number; title: string }> = ({ no, title }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, 0, 18);
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 66,
        fontFamily: FONT,
        opacity: o,
        transform: `translateX(${(1 - o) * -30}px)`,
        display: "flex",
        alignItems: "center",
        gap: 20,
      }}
    >
      <div
        style={{
          border: `2px solid ${K.cyan}`,
          color: K.cyan,
          fontSize: 26,
          fontWeight: 900,
          padding: "4px 12px",
          letterSpacing: 2,
        }}
      >
        {String(no).padStart(2, "0")}
      </div>
      <div style={{ color: K.text, fontSize: 46, fontWeight: 900 }}>{title}</div>
    </div>
  );
};

/** 도면 스타일 정보 카드 (얇은 테두리 박스) */
export const Note: React.FC<{
  x: number;
  y: number;
  w: number;
  start: number;
  title: string;
  desc?: string;
  color?: string;
  active?: boolean;
  icon?: React.ReactNode;
}> = ({ x, y, w, start, title, desc, color = K.cyan, active, icon }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, start, start + 14);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        padding: "14px 20px",
        border: `2px solid ${active ? K.amber : color}`,
        background: active ? "rgba(255,181,71,0.12)" : "rgba(10,26,47,0.8)",
        fontFamily: FONT,
        opacity: o,
        transform: `translateY(${(1 - o) * 16}px)`,
        display: "flex",
        gap: 18,
        alignItems: "center",
      }}
    >
      {icon ? (
        <div
          style={{
            width: 56,
            height: 56,
            flex: "0 0 56px",
            border: `2px solid ${active ? K.amber : color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      ) : null}
      <div>
        <div style={{ color: active ? K.amber : K.text, fontSize: 31, fontWeight: 900 }}>{title}</div>
        {desc ? <div style={{ color: K.sub, fontSize: 23, marginTop: 4 }}>{desc}</div> : null}
      </div>
    </div>
  );
};
