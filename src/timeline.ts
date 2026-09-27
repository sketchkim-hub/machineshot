import narration from "./narration.json";
import { FPS } from "./theme";

// 장면 앞뒤 여유와 문장 사이 간격 (프레임)
export const LEAD = 22;
export const GAP = 12;
export const TAIL = 24;
export const TRANSITION = 15;

export type Line = {
  text: string;
  file: string;
  from: number; // 장면 내 시작 프레임
  frames: number;
};

export type Scene = {
  id: string;
  title: string;
  lines: Line[];
  frames: number;
};

export const SCENES: Scene[] = narration.map((s) => {
  let t = LEAD;
  const lines = s.lines.map((l) => {
    const frames = Math.ceil(l.duration * FPS);
    const line = { text: l.text, file: l.file, from: t, frames };
    t += frames + GAP;
    return line;
  });
  return { id: s.id, title: s.title, lines, frames: t - GAP + TAIL };
});

export const TOTAL_FRAMES =
  SCENES.reduce((a, s) => a + s.frames, 0) - TRANSITION * (SCENES.length - 1);

export const scene = (id: string): Scene => {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`scene ${id} 없음`);
  return s;
};

/** 현재 프레임에서 말하고 있는(또는 직전에 말한) 문장 번호. 첫 문장 전이면 -1 */
export const lineAt = (s: Scene, frame: number): number => {
  let idx = -1;
  s.lines.forEach((l, i) => {
    if (frame >= l.from) idx = i;
  });
  return idx;
};
