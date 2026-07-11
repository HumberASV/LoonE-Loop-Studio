import type { P5CanvasInstance } from "@p5-wrapper/react";
import { BaseScene } from "../anim/baseScene";
import { advanceWrapMotion } from "../anim/boatMotion";
import { startLoopCapture, stopLoopCapture, wireCaptureTo } from "../anim/capture";
import { BOAT, FPS, LOOP_FRAMES, STAGE } from "../anim/constants";
import { sceneConfig, type SceneSketchProps } from "../anim/sceneConfig";
import type { RecordMode } from "../settings";
import type { ColorTheme } from "../theme/themes";

/**
 * Shared plumbing for both scene sketches: canvas/loop configuration, live
 * prop intake, the frame-1 auto-capture trigger, physics stepping, and the
 * optional in-canvas label bake.
 */
export class SceneRuntime {
  scene!: BaseScene;
  theme: ColorTheme = sceneConfig.theme;
  autoCapture = sceneConfig.autoCapture;
  bakeLabel = sceneConfig.bakeLabel;
  label: string;
  canvasWidth: number = 1080;
  canvasHeight: number = 1080;
  moveAnimate = sceneConfig.moveAnimate;
  moveDirection = sceneConfig.moveDirection;
  moveSpeed = sceneConfig.moveSpeed;
  moveWrap = sceneConfig.moveWrap;
  recordMode: RecordMode = sceneConfig.recordMode;

  /** True until startLoopCapture() first succeeds — one capture per mount.
   *  `!captureArmed` after that means "a capture is now in flight", which
   *  the exit-triggered stop uses to avoid firing before recording begins. */
  private captureArmed = true;

  constructor(
    private readonly p: P5CanvasInstance<SceneSketchProps>,
    defaultLabel: string,
  ) {
    this.label = defaultLabel;
    p.updateWithProps = (props) => {
      if (props.theme) this.theme = props.theme;
      if (typeof props.autoCapture === "boolean") this.autoCapture = props.autoCapture;
      if (typeof props.bakeLabel === "boolean") this.bakeLabel = props.bakeLabel;
      if (typeof props.label === "string") this.label = props.label;
      if (typeof props.flipBoat === "boolean" && this.scene) this.scene.flipped = props.flipBoat;
      if (typeof props.boatXFrac === "number") BOAT.xFrac = props.boatXFrac;
      if (typeof props.moveAnimate === "boolean") this.moveAnimate = props.moveAnimate;
      if (typeof props.moveDirection === "number") this.moveDirection = props.moveDirection;
      if (typeof props.moveSpeed === "number") this.moveSpeed = props.moveSpeed;
      if (typeof props.moveWrap === "boolean") this.moveWrap = props.moveWrap;
      if (props.recordMode) this.recordMode = props.recordMode;
    };
  }

  setup(): void {
    const { p } = this;
    this.canvasWidth = STAGE.width;
    this.canvasHeight = STAGE.height;
    p.createCanvas(this.canvasWidth, this.canvasHeight);
    p.pixelDensity(1); // exact 1080×1080 pixels in the export, retina or not
    p.frameRate(FPS);
    wireCaptureTo(p as never);
    // Debug handle for driving/inspecting the live sketch from devtools.
    (globalThis as Record<string, unknown>).__loopSketch = p;
    // React may have updated the snapshot after this sketch fn was created.
    this.theme = sceneConfig.theme;
    this.autoCapture = sceneConfig.autoCapture;
    this.bakeLabel = sceneConfig.bakeLabel;
    BOAT.xFrac = sceneConfig.boatXFrac;
    this.moveAnimate = sceneConfig.moveAnimate;
    this.moveDirection = sceneConfig.moveDirection;
    this.moveSpeed = sceneConfig.moveSpeed;
    this.moveWrap = sceneConfig.moveWrap;
    this.recordMode = sceneConfig.recordMode;
    this.scene = new BaseScene(p);
    this.scene.flipped = sceneConfig.flipBoat;
    this.scene.loadAssets();
  }

  /**
   * One animation frame: capture trigger → physics → render → optional bake.
   * @returns the 0-based loop frame (0..LOOP_FRAMES-1).
   */
  frame(): number {
    const { p } = this;
    const frameIndex = p.frameCount - 1;

    // Starts on frame 1 normally, and keeps retrying while a previous export
    // is still encoding, so an Apply-during-encode doesn't silently skip the
    // new recording. p5.capture's `duration` stops + saves after LOOP_FRAMES
    // captured frames; the scene is loop-periodic, so any 240 consecutive
    // frames form a perfect loop no matter which frame the capture lands on.
    if (this.autoCapture && this.captureArmed) {
      this.captureArmed = !startLoopCapture();
    }

    if (this.moveAnimate) {
      if (this.moveWrap) {
        // Seamless-loop sailing; see anim/boatMotion.ts for the loop math.
        const didExitFrame = advanceWrapMotion(this.moveDirection, this.moveSpeed);
        // "Until exit" only applies with wrap sailing on — bounce mode never
        // truly leaves frame, so it's always treated as "standard" there.
        if (this.recordMode === "untilExit" && didExitFrame && !this.captureArmed) {
          stopLoopCapture();
        }
      } else {
        // Bounce mode: ping-pong between the margins, turning the boat
        // around at each end. Deliberately not loop-periodic.
        BOAT.xFrac += this.moveDirection * this.moveSpeed;
        if (BOAT.xFrac > 0.95) {
          BOAT.xFrac = 0.95;
          this.moveDirection = -1;
          this.scene.flipped = !this.scene.flipped;
        } else if (BOAT.xFrac < 0.05) {
          BOAT.xFrac = 0.05;
          this.moveDirection = 1;
          this.scene.flipped = !this.scene.flipped;
        }
      }
    }

    this.scene.step(frameIndex);
    this.scene.render(frameIndex, this.theme);
    if (this.bakeLabel) this.drawBakedLabel();

    return frameIndex % LOOP_FRAMES;
  }

  /** Canvas twin of the DOM overlay, for exports that need the text in-GIF. */
  private drawBakedLabel(): void {
    const { p } = this;
    const lines = this.label.split("\n");
    const maxLen = Math.max(...lines.map((l) => l.length));
    const size = Math.min(112, (this.canvasWidth * 0.86) / (maxLen * 0.82));

    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    p.textFont("Arial, Helvetica, sans-serif");
    p.textStyle(p.BOLD);
    p.textSize(size);
    p.textLeading(size * 1.3);
    try {
      (p.drawingContext as CanvasRenderingContext2D).letterSpacing = "0.25em";
    } catch {
      // letterSpacing is a nicety; older canvas impls just skip it
    }
    p.noStroke();
    p.fill(this.theme.primary);
    p.text(this.label, this.canvasWidth / 2, this.canvasHeight * 0.42);
    p.pop();
  }
}