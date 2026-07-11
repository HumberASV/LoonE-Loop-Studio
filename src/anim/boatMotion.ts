import { BOAT, LOOP_FRAMES, STAGE, boatWidth } from "./constants";

/**
 * Advance BOAT.xFrac one frame of wrap-mode (seamless-loop) travel.
 *
 * The speed is quantized to a whole number of off-screen-to-off-screen
 * crossings per 240-frame loop, so frame 240 lands the boat exactly where
 * frame 0 had it. The travel span pads ~¾ of a boat past each edge — the
 * boat fully exits before re-entering, keeping the wrap teleport invisible.
 *
 * Shared by SceneRuntime (live frames) and BoatRig (physics pre-roll): the
 * pre-roll must sail too, otherwise the recorded loop starts with the boat
 * still accelerating into its steady trailing position and the GIF seam
 * shows a position jump.
 *
 * `crossings = Math.max(1, ...)` guarantees the boat wraps at least once
 * within any LOOP_FRAMES-frame window, which "record until boat exits
 * frame" mode (see sceneRuntime.ts) relies on as a safety bound.
 *
 * @returns true on the frame a wrap/teleport occurs (the boat has just gone
 *          fully off one edge and reappeared at the other) — the frame
 *          "the boat leaves frame" for callers that care.
 */
export function advanceWrapMotion(direction: number, speed: number): boolean {
  const widthFrac = boatWidth() / STAGE.width;
  const travel = 1 + 2 * widthFrac;
  const crossings = Math.max(1, Math.round(speed * LOOP_FRAMES));
  const dir = direction < 0 ? -1 : 1;
  BOAT.xFrac += (dir * crossings * travel) / LOOP_FRAMES;
  if (BOAT.xFrac > 1 + widthFrac) {
    BOAT.xFrac -= travel;
    return true;
  }
  if (BOAT.xFrac < -widthFrac) {
    BOAT.xFrac += travel;
    return true;
  }
  return false;
}
