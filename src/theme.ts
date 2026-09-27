import { continueRender, delayRender, staticFile } from "remotion";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const C = {
  bg: "#0B1412",
  bg2: "#12211D",
  grid: "rgba(160, 200, 185, 0.07)",
  text: "#F2F5F3",
  sub: "#A9BAB3",
  accent: "#F29A12", // 기계 본체 주황
  red: "#D9483A",
  ok: "#5CD08E",
  line: "rgba(242, 154, 18, 0.9)",
};

export const FONT = "'Noto Sans KR', sans-serif";

// Noto Sans KR 을 public/fonts 에서 불러오고 로딩이 끝날 때까지 렌더를 대기
const WEIGHTS = [400, 700, 900];
if (typeof document !== "undefined") {
  const handle = delayRender("Noto Sans KR 로딩");
  const faces = WEIGHTS.flatMap((w) =>
    ["korean", "latin"].map(
      (sub) =>
        new FontFace(
          "Noto Sans KR",
          `url(${staticFile(`fonts/noto-sans-kr-${sub}-${w}-normal.woff2`)}) format('woff2')`,
          { weight: String(w) },
        ),
    ),
  );
  Promise.all(faces.map((f) => f.load()))
    .then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    })
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
}
