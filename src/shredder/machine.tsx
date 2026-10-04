import React from "react";
import { boxEdges, D, Iso, K, Seg } from "./cad";

type P3 = [number, number, number];
type Edge = { a: P3; b: P3; hidden?: boolean; part: string };

// 2축 파쇄기 등각도: 부품별 모서리 목록 (단위: 임의, 약 1 = 1cm)
const box = (part: string, ...r: [number, number, number, number, number, number]): Edge[] =>
  boxEdges(...r).map((e) => ({ ...e, part }));

const hopper = (): Edge[] => {
  const b = [
    [15, 10],
    [125, 10],
    [125, 80],
    [15, 80],
  ];
  const t = [
    [0, -5],
    [140, -5],
    [140, 95],
    [0, 95],
  ];
  const e: Edge[] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    e.push({ a: [t[i][0], t[i][1], 135], b: [t[j][0], t[j][1], 135], part: "hopper" });
    e.push({ a: [b[i][0], b[i][1], 95], b: [t[i][0], t[i][1], 135], part: "hopper", hidden: i === 0 });
  }
  return e;
};

// 호퍼 안으로 보이는 두 축과 칼날 디스크(서로 엇갈려 배치)
const shafts = (): Edge[] => {
  const e: Edge[] = [];
  [33, 57].forEach((y, k) => {
    e.push({ a: [18, y, 95], b: [122, y, 95], part: "shaft" });
    for (let x = 22 + k * 8; x < 120; x += 16) {
      e.push({ a: [x, y - 11, 95], b: [x, y + 11, 95], part: "shaft" });
    }
  });
  return e;
};

export const MACHINE: Edge[] = [
  ...box("frame", 0, 140, 0, 90, 0, 40),
  ...box("chamber", 15, 125, 10, 80, 40, 95),
  ...hopper(),
  ...shafts(),
  ...box("gearbox", 125, 155, 20, 70, 45, 90),
  ...box("motor", 155, 200, 30, 60, 52, 82),
  ...box("panel", -50, -22, 55, 90, 0, 100),
];

// 부품 라벨 기준점 (3D)
export const PART_POINTS: Record<string, P3> = {
  hopper: [140, 50, 135],
  chamber: [60, 80, 70],
  shaft: [70, 57, 95],
  gearbox: [155, 45, 80],
  motor: [200, 45, 75],
  panel: [-22, 72, 70],
  frame: [70, 90, 20],
};

/** 등각도 전체를 순서대로 그려 나감 (p: 0~1). highlight 된 부품은 주황색 */
export const MachineIso: React.FC<{ iso: Iso; p: number; highlight?: string[] }> = ({ iso, p, highlight = [] }) => {
  const n = MACHINE.length;
  return (
    <g>
      {MACHINE.map((e, i) => {
        // 각 모서리는 앞 모서리와 조금씩 겹치며 차례로 그려짐
        const local = Math.max(0, Math.min(1, (p * (n + 3) - i) / 3));
        const hi = highlight.includes(e.part);
        return (
          <Seg
            key={i}
            iso={iso}
            a={e.a}
            b={e.b}
            p={local}
            hidden={e.hidden}
            color={hi ? K.amber : K.line}
            w={hi ? 3.5 : 2.2}
          />
        );
      })}
    </g>
  );
};

/** 갈고리 칼날 디스크 외곽선 (반지름 R, 갈고리 3개) */
export const cutterPath = (R: number) => {
  const pts: string[] = [];
  const pol = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  };
  for (let k = 0; k < 3; k++) {
    const a0 = k * 120;
    for (let t = 0; t <= 10; t++) {
      pts.push(pol(a0 + t * 9.5, R * (0.8 + 0.2 * (t / 10) ** 1.6)));
    }
    pts.push(pol(a0 + 100, R * 0.97));
    pts.push(pol(a0 + 106, R * 0.78));
  }
  return `M ${pts.join(" L ")} Z`;
};

/** 육각 축 */
export const hexPath = (r: number) =>
  "M " +
  Array.from({ length: 6 })
    .map((_, i) => {
      const a = (i * 60 * Math.PI) / 180;
      return `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
    })
    .join(" L ") +
  " Z";

/** 단면도의 칼날 + 축 한 세트 */
export const Cutter: React.FC<{ cx: number; cy: number; R: number; angle: number; p: number; color?: string; back?: boolean }> = ({
  cx,
  cy,
  R,
  angle,
  p,
  color = K.line,
  back,
}) => (
  <g transform={`translate(${cx} ${cy}) rotate(${angle})`}>
    <D d={cutterPath(R)} p={p} color={color} w={back ? 2 : 3} fill={back ? "rgba(94,200,242,0.05)" : "rgba(94,200,242,0.10)"} opacity={back ? 0.7 : 1} />
    <D d={hexPath(R * 0.3)} p={p} color={color} w={2.5} fill="rgba(10,26,47,0.9)" />
    <circle r={4} fill={color} opacity={p} />
    <line x1={-R * 0.15} y1={0} x2={R * 0.15} y2={0} stroke={K.dim} strokeWidth={1.2} opacity={p} />
    <line x1={0} y1={-R * 0.15} x2={0} y2={R * 0.15} stroke={K.dim} strokeWidth={1.2} opacity={p} />
  </g>
);

/** 회전 방향 화살표 (원호 + 화살촉) */
export const SpinArc: React.FC<{ cx: number; cy: number; r: number; from: number; sweep: number; color?: string; o?: number }> = ({
  cx,
  cy,
  r,
  from,
  sweep,
  color = K.amber,
  o = 1,
}) => {
  const a0 = (from * Math.PI) / 180;
  const a1 = ((from + sweep) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const dir = Math.sign(sweep);
  const tx = -Math.sin(a1) * dir;
  const ty = Math.cos(a1) * dir;
  const nx = Math.cos(a1);
  const ny = Math.sin(a1);
  const s = 18;
  return (
    <g opacity={o}>
      <path
        d={`M ${x0} ${y0} A ${r} ${r} 0 ${Math.abs(sweep) > 180 ? 1 : 0} ${dir > 0 ? 1 : 0} ${x1} ${y1}`}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <polygon
        points={`${x1 + tx * s},${y1 + ty * s} ${x1 + nx * s * 0.6},${y1 + ny * s * 0.6} ${x1 - nx * s * 0.6},${y1 - ny * s * 0.6}`}
        fill={color}
      />
    </g>
  );
};
