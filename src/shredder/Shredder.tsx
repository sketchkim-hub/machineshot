import React from "react";
import { AbsoluteFill, interpolate, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { fade } from "@remotion/transitions/fade";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { TRANSITION } from "../timeline";
import { Sheet } from "./cad";
import { Intro, Principle, Structure } from "./scenes1";
import { HsCode, Kcs, Outro, Safety, Schedule } from "./scenes2";
import { T } from "./timeline";

const VIEWS: Record<string, React.FC> = {
  intro: Intro,
  structure: Structure,
  principle: Principle,
  hscode: HsCode,
  kcs: Kcs,
  schedule: Schedule,
  safety: Safety,
  outro: Outro,
};

export const SHREDDER_FRAMES = T.total;

export const ShredderGuide: React.FC = () => (
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
        interpolate(f, [SHREDDER_FRAMES - 60, SHREDDER_FRAMES], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  </AbsoluteFill>
);
