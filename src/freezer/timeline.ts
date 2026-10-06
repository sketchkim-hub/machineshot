import narration from "./narration.json";
import { makeTimeline } from "../timeline";

export const T = makeTimeline(narration);
export const SHEETS = T.scenes.map((s) => s.id);
