import React from "react";
import { boxEdges, D, Iso, K } from "../shredder/cad";

type P3 = [number, number, number];

// 트윈 나선형 냉동기 치수 (임의 단위)
export const DRUM_A = { x: 90, y: 65 };
export const DRUM_B = { x: 230, y: 65 };
const R_DRUM = 38;
const R_BELT = 55;
const Z0 = 14;
const Z1 = 140;
const TURNS = 8;

const deg = (d: number) => (d * Math.PI) / 180;
const front = (th: number) => Math.cos(deg(th) - deg(45)) > 0; // 보는 방향(+x,+y) 쪽이면 앞면

const path2 = (iso: Iso, pts: P3[]) =>
  pts.map((p, i) => {
    const [x, y] = iso(...p);
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

/** 3D 점 목록을 앞면(실선) / 뒷면(점선) 덩어리로 나눔 */
const splitByFace = (pts: { p: P3; f: boolean }[]) => {
  const out: { pts: P3[]; f: boolean }[] = [];
  pts.forEach((q, i) => {
    const last = out[out.length - 1];
    if (!last || last.f !== q.f) {
      out.push({ pts: i ? [pts[i - 1].p, q.p] : [q.p], f: q.f });
    } else last.pts.push(q.p);
  });
  return out;
};

const helix = (cx: number, cy: number, r: number, z0: number, z1: number, th0: number, sweep: number) => {
  const n = Math.ceil(Math.abs(sweep) / 6);
  return Array.from({ length: n + 1 }).map((_, i) => {
    const th = th0 + (sweep * i) / n;
    return { p: [cx + r * Math.cos(deg(th)), cy + r * Math.sin(deg(th)), z0 + ((z1 - z0) * i) / n] as P3, f: front(th) };
  });
};

const ring = (cx: number, cy: number, r: number, z: number) =>
  Array.from({ length: 61 }).map((_, i) => {
    const th = i * 6;
    return { p: [cx + r * Math.cos(deg(th)), cy + r * Math.sin(deg(th)), z] as P3, f: front(th) };
  });

/** 수직면(x = 일정) 위의 원: 팬 */
const fanCircle = (x: number, cy: number, cz: number, r: number): P3[] =>
  Array.from({ length: 41 }).map((_, i) => {
    const t = deg(i * 9);
    return [x, cy + r * Math.cos(t), cz + r * Math.sin(t)];
  });

// 제품 이동 경로: 입구 컨베이어 → 드럼 A 상승 → 상부 브리지 → 드럼 B 하강 → 출구 컨베이어
const buildPath = (): P3[] => {
  const pts: P3[] = [];
  for (let y = 215; y > 120; y -= 5) pts.push([DRUM_A.x, y, Z0]);
  helix(DRUM_A.x, DRUM_A.y, R_BELT, Z0, Z1, 90, TURNS * 360 - 90).forEach((q) => pts.push(q.p));
  for (let x = DRUM_A.x + R_BELT; x < DRUM_B.x - R_BELT; x += 5) pts.push([x, DRUM_A.y, Z1]);
  helix(DRUM_B.x, DRUM_B.y, R_BELT, Z1, Z0, 180, -(TURNS * 360 - 270)).forEach((q) => pts.push(q.p));
  for (let y = 120; y < 215; y += 5) pts.push([DRUM_B.x, y, Z0]);
  return pts;
};
const PATH = buildPath();
const CUM = PATH.reduce<number[]>((a, p, i) => {
  if (i === 0) return [0];
  const q = PATH[i - 1];
  a.push(a[i - 1] + Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
  return a;
}, []);
const TOTAL = CUM[CUM.length - 1];
export const pathAt = (s: number): P3 => {
  const d = (((s % 1) + 1) % 1) * TOTAL;
  let i = CUM.findIndex((c) => c >= d);
  if (i <= 0) i = 1;
  const k = (d - CUM[i - 1]) / Math.max(1e-6, CUM[i] - CUM[i - 1]);
  const a = PATH[i - 1];
  const b = PATH[i];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};

// 부품 라벨 기준점
export const FZ_POINTS: Record<string, P3> = {
  drum: [DRUM_A.x, DRUM_A.y, Z1 + 4],
  belt: [DRUM_B.x + R_BELT * 0.7, DRUM_B.y + R_BELT * 0.7, 80],
  evapL: [-30, 115, 100],
  evapR: [375, 65, 100],
  infeed: [DRUM_A.x, 195, Z0],
  outfeed: [DRUM_B.x, 195, Z0],
  bridge: [160, 65, Z1],
  base: [300, 130, 4],
};

const lerpColor = (t: number) => {
  // 따뜻한 제품(주황) → 냉동된 제품(하늘색)
  const a = [255, 181, 71];
  const b = [94, 200, 242];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
};

export const FreezerIso: React.FC<{
  iso: Iso;
  p: number;
  frame: number;
  products?: boolean;
  air?: boolean;
  highlight?: string[];
}> = ({ iso, p, frame, products, air, highlight = [] }) => {
  const hi = (k: string) => (highlight.includes(k) ? K.amber : K.line);
  const seg = (k: number) => Math.max(0, Math.min(1, p * 8 - k)); // 그려지는 순서

  const drawFaces = (pts: { p: P3; f: boolean }[], pp: number, color: string, w = 2.2) =>
    splitByFace(pts).map((c, i) =>
      c.f ? (
        <D key={i} d={path2(iso, c.pts)} p={pp} color={color} w={w} />
      ) : (
        <path key={i} d={path2(iso, c.pts)} fill="none" stroke={K.hidden} strokeWidth={1.3} strokeDasharray="7 6" opacity={Math.min(1, pp)} />
      ),
    );

  const box = (r: [number, number, number, number, number, number], pp: number, color: string, w = 2.2) =>
    boxEdges(...r).map((e, i) => {
      const d = path2(iso, [e.a, e.b]);
      return e.hidden ? (
        <path key={i} d={d} stroke={K.hidden} strokeWidth={1.3} strokeDasharray="7 6" opacity={Math.min(1, pp)} />
      ) : (
        <D key={i} d={d} p={pp} color={color} w={w} />
      );
    });

  const drum = (c: { x: number; y: number }, key: string, pp: number) => {
    const col = hi(key);
    const sil = [135, 315].map((th) => {
      const x = c.x + R_DRUM * Math.cos(deg(th));
      const y = c.y + R_DRUM * Math.sin(deg(th));
      return <D key={th} d={path2(iso, [[x, y, 8], [x, y, Z1 + 4]])} p={pp} color={col} w={2} />;
    });
    return (
      <g>
        {drawFaces(ring(c.x, c.y, R_DRUM, Z1 + 4), pp, col, 2)}
        {drawFaces(ring(c.x, c.y, R_DRUM, 8), pp, col, 2)}
        {sil}
      </g>
    );
  };

  const fans = (x: number) =>
    [35, 95].flatMap((cy) =>
      [45, 100].map((cz) => (
        <g key={`${x}-${cy}-${cz}`}>
          <D d={path2(iso, fanCircle(x, cy, cz, 20))} p={seg(5)} color={hi("evap")} w={1.8} />
          {[0, 120, 240].map((a) => {
            const t = deg(a + frame * 12);
            return (
              <path
                key={a}
                d={path2(iso, [[x, cy, cz], [x, cy + 16 * Math.cos(t), cz + 16 * Math.sin(t)]])}
                stroke={hi("evap")}
                strokeWidth={1.6}
                opacity={seg(5)}
              />
            );
          })}
        </g>
      )),
    );

  // 냉기 흐름 화살표
  const airArrows = air
    ? [40, 80, 115].flatMap((z) =>
        [
          { from: [-5, 65, z] as P3, to: [DRUM_A.x - R_BELT - 6, 65, z] as P3 },
          { from: [325, 65, z] as P3, to: [DRUM_B.x + R_BELT + 6, 65, z] as P3 },
        ].map((a, i) => {
          const [x1, y1] = iso(...a.from);
          const [x2, y2] = iso(...a.to);
          const ang = Math.atan2(y2 - y1, x2 - x1);
          return (
            <g key={`${z}-${i}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={K.cyan} strokeWidth={3} strokeDasharray="14 10" strokeDashoffset={-frame * 2.5} />
              <polygon
                points={`${x2},${y2} ${x2 - 14 * Math.cos(ang) + 7 * Math.sin(ang)},${y2 - 14 * Math.sin(ang) - 7 * Math.cos(ang)} ${x2 - 14 * Math.cos(ang) - 7 * Math.sin(ang)},${y2 - 14 * Math.sin(ang) + 7 * Math.cos(ang)}`}
                fill={K.cyan}
              />
            </g>
          );
        }),
      )
    : null;

  const items = products
    ? Array.from({ length: 22 }).map((_, k) => {
        const s = (k / 22 + frame * 0.0009) % 1;
        const [x, y] = iso(...pathAt(s));
        const t = Math.min(1, Math.max(0, (s - 0.08) / 0.8));
        return <rect key={k} x={x - 7} y={y - 9} width={14} height={9} fill={lerpColor(t)} stroke={K.bg} strokeWidth={1} />;
      })
    : null;

  return (
    <g>
      {/* 베이스 프레임 · 증발기 */}
      {box([-60, 380, 0, 130, 0, 8], seg(0), hi("base"))}
      {box([-55, -5, 15, 115, 8, 125], seg(1), hi("evap"))}
      {box([325, 375, 15, 115, 8, 125], seg(1), hi("evap"))}
      {/* 드럼 */}
      {drum(DRUM_A, "drum", seg(2))}
      {drum(DRUM_B, "drum", seg(2))}
      {/* 나선 벨트 */}
      {drawFaces(helix(DRUM_A.x, DRUM_A.y, R_BELT, Z0, Z1, 90, TURNS * 360 - 90), seg(3), hi("belt"), 2.6)}
      {drawFaces(helix(DRUM_B.x, DRUM_B.y, R_BELT, Z1, Z0, 180, -(TURNS * 360 - 270)), seg(3), hi("belt"), 2.6)}
      {/* 상부 이송 브리지 */}
      {box([DRUM_A.x + R_BELT - 4, DRUM_B.x - R_BELT + 4, 52, 78, Z1 - 2, Z1 + 2], seg(4), hi("bridge"), 2)}
      {/* 입구 · 출구 컨베이어 */}
      {box([DRUM_A.x - 14, DRUM_A.x + 14, 118, 220, Z0 - 4, Z0], seg(4), hi("infeed"), 2)}
      {box([DRUM_B.x - 14, DRUM_B.x + 14, 118, 220, Z0 - 4, Z0], seg(4), hi("outfeed"), 2)}
      {/* 팬 */}
      {fans(-5)}
      {fans(375)}
      {airArrows}
      {items}
    </g>
  );
};
