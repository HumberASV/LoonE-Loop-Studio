import type { Sketch } from "@p5-wrapper/react";
import type { SceneSketchProps } from "../anim/sceneConfig";
import { SceneRuntime } from "./sceneRuntime";

/** Scene 1 — the clean loading loop: sky, four parallax waves, bobbing boat. */
export const loadingSketch: Sketch<SceneSketchProps> = (p) => {
  const rt = new SceneRuntime(p, "LOADING...");

  p.setup = () => rt.setup();

  p.draw = () => {
    rt.frame();
  };
};
