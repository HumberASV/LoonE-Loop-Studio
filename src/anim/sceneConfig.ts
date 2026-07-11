import type { SketchProps } from "@p5-wrapper/react";
import type { RecordMode } from "../settings";
import { DEFAULT_THEME, type ColorTheme } from "../theme/themes";

/** Props every scene sketch receives through @p5-wrapper/react. */
export interface SceneSketchProps extends SketchProps {
  theme: ColorTheme;
  /** Start a loop-length capture automatically at frame 1. */
  autoCapture: boolean;
  /** Also draw the label inside the canvas so it survives into the GIF
   *  (the DOM overlay is not part of the recorded canvas). */
  bakeLabel: boolean;
  label: string;
  canvasWidth?: number;
  canvasHeight?: number;
  flipBoat?: boolean;
  boatScale?: number;
  boatXFrac?: number;
  moveAnimate?: boolean;
  moveDirection?: number;
  moveSpeed?: number;
  moveWrap?: boolean;
  recordMode?: RecordMode;
}

/**
 * Mutable snapshot React writes during render. A sketch's first frame can run
 * before updateWithProps delivers live props; reading this at setup guarantees
 * frame 1 (where auto-capture fires) already uses the right theme/settings.
 */
export const sceneConfig = {
  theme: DEFAULT_THEME,
  autoCapture: false,
  bakeLabel: true,
  flipBoat: true,
  boatScale: 1,
  boatXFrac: 0.5,
  moveAnimate: false,
  moveDirection: 1,
  moveSpeed: 0.004,
  moveWrap: true,
  recordMode: "standard" as RecordMode,
};
