import React from "react";
import { AbsoluteFill, interpolate, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { fade } from "@remotion/transitions/fade";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { TRANSITION } from "../timeline";
import { Sheet } from "../shredder/cad";
import { Capacity, Customs } from "../freezer/scenes2";
import { T } from "../freezer/timeline";
import { Gas3D, Intro3D, Layout3D, Outro3D, Structure3D } from "./scenes";

// 냉동기 영상과 같은 나레이션 · 장면 구성을 쓰고, 기계가 나오는 장면만 3D 렌더로 교체
const VIEWS: Record<string, React.FC> = {
  intro: Intro3D,
  structure: Structure3D,
  layout: Layout3D,
  capacity: Capacity,
  customs: Customs,
  gas: Gas3D,
  outro: Outro3D,
};

export const FREEZER3D_FRAMES = T.total;

export const Freezer3D: React.FC = () => (
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
          : [
              <TransitionSeries.Transition
                key={`${s.id}-t`}
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION })}
              />,
              seq,
            ];
      })}
    </TransitionSeries>
    <Audio
      src={staticFile("music.wav")}
      volume={(f) =>
        0.13 *
        interpolate(f, [FREEZER3D_FRAMES - 60, FREEZER3D_FRAMES], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  </AbsoluteFill>
);
