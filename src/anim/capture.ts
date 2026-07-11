import "../p5-global"; // p5.capture reads the global `p5` the moment it loads
import "p5.capture"; // side-effect UMD: registers hooks + global P5Capture
import { EXPORT, FPS, LOOP_FRAMES } from "./constants";

// Applied once at module load, before any p5 instance exists. width/height
// are deliberately omitted: they'd freeze the size these options were
// evaluated with, while p5.capture sizes from the live canvas when unset —
// always correct, whatever stage size was applied.
P5Capture.setDefaultOptions({
  format: EXPORT.format,
  framerate: FPS,
  quality: EXPORT.quality,
  duration: LOOP_FRAMES,
  verbose: true,
});

/**
 * @p5-wrapper/react v4 bundles its own private copy of p5 into its dist, so
 * the hooks the p5.capture UMD registered on our external p5 never fire for
 * the wrapper's instances. This re-creates the plugin's two hooks: an
 * `initialize(instance)` call (what its "init" hook does) and a "post"
 * recorder hook registered on the instance.
 *
 * The "post" hook MUST be (re-)registered on every fresh instance, not just
 * once per p5 class: p5's constructor copies `_registeredMethods.post` from
 * `p5.prototype` into a new per-instance array at construction time (see
 * node_modules/p5/lib/p5.js, `this._registeredMethods[prop] = ....slice()`).
 * A hook added to one instance's own array is invisible to the next
 * instance's fresh copy. `wireCaptureTo` runs exactly once per instance
 * (called from `setup()`), so there is no risk of double-registering on the
 * same instance — do not gate this by class or by a module-level flag, or
 * every recording after the first sketch mount silently gets no frames.
 */
export function wireCaptureTo(p: {
  constructor: unknown;
  registerMethod?: (name: string, fn: () => void) => void;
}): void {
  if (typeof P5Capture === "undefined") return;
  const cap = P5Capture.getInstance() as unknown as {
    state: string;
    stop(): void;
    recorder: unknown;
    initialize(instance: unknown): void;
    postDraw(): Promise<void>;
  } | null;
  if (!cap) return;

  // 1. Remove any existing p5.capture GUI containers from the DOM to prevent duplication
  if (typeof document !== "undefined") {
    document.querySelectorAll(".p5c-container").forEach((el) => el.remove());
  }

  // 2. A re-render mid-recording (or mid-encode) leaves the recorder bound
  //    to the destroyed canvas. stop() would try to encode the partial
  //    frames and rejects asynchronously ("Width and height must be set
  //    prior to rendering"); a still-encoding recorder that's never told to
  //    stop would keep `cap.state` stuck off "idle" forever, permanently
  //    blocking every future startLoopCapture() call. Cancel outright either
  //    way: drop the recorder so state returns to idle with nothing
  //    exported.
  if (cap.state !== "idle") {
    cap.recorder = null;
    console.warn("[capture] canceled in-flight recording (sketch re-rendered)");
  }

  if (typeof p.registerMethod === "function") {
    p.registerMethod("post", () => void cap.postDraw());
  }
  cap.initialize(p);
}

/**
 * Kick off a one-loop capture. p5.capture records every drawn frame from the
 * moment start() resolves and auto-stops + saves after `duration` frames, so
 * a start on frame 1 exports exactly frames 1–240.
 *
 * @returns false if the plugin isn't ready yet (caller may retry next frame).
 */
export function startLoopCapture(): boolean {
  if (typeof P5Capture === "undefined") return false;
  const capture = P5Capture.getInstance();
  if (!capture || capture.state !== "idle") return false;

  void capture.start({
    format: EXPORT.format,
    framerate: FPS,
    duration: LOOP_FRAMES,
    quality: EXPORT.quality,
  });
  console.info(
    `[capture] recording ${LOOP_FRAMES} frames @ ${FPS}fps → .${EXPORT.format}`,
  );
  return true;
}

/**
 * End a capture early (used by "record until the boat exits frame" mode
 * instead of waiting for the fixed `duration`). Safe to call anytime — a
 * no-op unless a recording is actually in flight, so callers don't need to
 * track capture state themselves.
 */
export function stopLoopCapture(): void {
  if (typeof P5Capture === "undefined") return;
  const capture = P5Capture.getInstance();
  if (!capture || capture.state !== "capturing") return;

  void capture.stop();
  console.info("[capture] stopped early — boat exited frame");
}
