import type { Sketch } from "@p5-wrapper/react";
// p5.glitch ships as a classic browser script (top-level `class Glitch`, no
// exports). Importing it as text and evaluating keeps it bundler-safe.
import glitchSource from "p5.glitch/p5.glitch.js" with { type: "text" };
import { GLITCH, buildGlitchSchedule, glitchFrameOf } from "../anim/glitchSchedule";
import type { SceneSketchProps } from "../anim/sceneConfig";
import { SceneRuntime } from "./sceneRuntime";

type GlitchInstance = {
  image: { width: number };
  loadQuality(q: number): void;
  loadImage(img: unknown, cb?: () => void): void;
  randomBytes(count: number): void;
  buildImage(cb?: (img: unknown) => void): void;
  resetBytes(): void;
  errors(on: boolean): void;
};

const GlitchClass = new Function(
  `${glitchSource}\nreturn Glitch;`,
)() as new (instance: unknown) => GlitchInstance;

/**
 * Scene 2 — the corrupted broadcast: the same base scene, but a seeded
 * schedule fires a p5.glitch byte-corruption burst every 45–60 frames that
 * holds for exactly GLITCH.holdFrames frames before the feed recovers.
 */
export const technicalDifficultySketch: Sketch<SceneSketchProps> = (p) => {
  const rt = new SceneRuntime(p, "TECHNICAL\nDIFFICULTY");
  const triggers = buildGlitchSchedule();
  let glitch: GlitchInstance | null = null;
  let inWindow = false;

  p.setup = () => {
    rt.setup();
    glitch = new GlitchClass(p);
    glitch.loadQuality(0.9); // JPEG bytes corrupt into juicier smears
    console.info("[glitch] trigger frames per 240f loop:", triggers.join(", "));
  };

  p.draw = () => {
    const loopFrame = rt.frame();
    if (!glitch) return;

    const windowFrame = glitchFrameOf(loopFrame, triggers);
    if (windowFrame >= 0) {
      if (!inWindow) {
        inWindow = true;
        console.debug(`[glitch] burst @ loop frame ${loopFrame - windowFrame}`);
      }
      corruptCurrentFrame(loopFrame);
      // buildImage decodes async; until the corrupted image lands (≤1 frame)
      // keep showing the previous one. Guard skips the 1×1 init image.
      if (glitch.image.width > 2) {
        p.image(glitch.image as never, 0, 0, p.width, p.height);
      }
    } else if (inWindow) {
      inWindow = false;
      glitch.resetBytes();
    }
  };

  /** Snapshot the freshly drawn frame, corrupt N random bytes, rebuild. */
  function corruptCurrentFrame(loopFrame: number): void {
    if (!glitch) return;
    // p5.glitch corrupts via p.random(); seeding by loop frame makes each
    // 240-frame cycle corrupt identically → the exported GIF loops perfectly.
    p.randomSeed(GLITCH.seed + loopFrame);
    glitch.loadImage(p.get()); // synchronous for in-memory p5.Images
    glitch.randomBytes(GLITCH.bytesPerFrame);
    glitch.buildImage();
  }
};
