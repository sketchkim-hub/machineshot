import React from "react";
import { AbsoluteFill, interpolate, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { fade } from "@remotion/transitions/fade";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { TRANSITION } from "../timeline";
import { Sheet } from "../shredder/cad";
import { Intro, Layout, Structure } from "./scenes1";
import { Capacity, Customs, Gas, Outro } from "./scenes2";
import { T } from "./timeline";

const VIEWS: Record<string, React.FC> = {
  intro: Intro,
  structure: Structure,
  layout: Layout,
  capacity: Capacity,
  customs: Customs,
  gas: Gas,
  outro: Outro,
};

export const FREEZER_FRAMES = T.total;

export const FreezerGuide: React.FC = () => (
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
        interpolate(f, [FREEZER_FRAMES - 60, FREEZER_FRAMES], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  </AbsoluteFill>
);
