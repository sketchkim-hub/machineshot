import "./index.css";
import React from "react";
import { AbsoluteFill, Composition, interpolate, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { fade } from "@remotion/transitions/fade";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { Background } from "./components";
import { Check } from "./scenes/Check";
import { Control } from "./scenes/Control";
import { Intro, Outro } from "./scenes/IntroOutro";
import { Parts } from "./scenes/Parts";
import { Principle } from "./scenes/Principle";
import { Safety } from "./scenes/Safety";
import { Work } from "./scenes/Work";
import { FPS, HEIGHT, WIDTH } from "./theme";
import { SCENES, TOTAL_FRAMES, TRANSITION } from "./timeline";
import { SHREDDER_FRAMES, ShredderGuide } from "./shredder/Shredder";
import { FREEZER_FRAMES, FreezerGuide } from "./freezer/Freezer";

const VIEWS: Record<string, React.FC> = {
  intro: Intro,
  parts: Parts,
  principle: Principle,
  check: Check,
  control: Control,
  work: Work,
  safety: Safety,
  outro: Outro,
};

export const TrowelIntro: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <TransitionSeries>
      {SCENES.flatMap((s, i) => {
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
        0.16 * interpolate(f, [TOTAL_FRAMES - 60, TOTAL_FRAMES], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      }
    />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="TrowelIntro"
      component={TrowelIntro}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="ShredderGuide"
      component={ShredderGuide}
      durationInFrames={SHREDDER_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="FreezerGuide"
      component={FreezerGuide}
      durationInFrames={FREEZER_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  </>
);
