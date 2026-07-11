import { LOOP_FRAMES } from "./constants";

export const GLITCH = {
  /** A corruption burst starts every 45–60 frames… */
  minGap: 45,
  maxGap: 60,
  /** …and holds for exactly this many frames. */
  holdFrames: 5,
  /** Bytes overwritten per corrupted frame. */
  bytesPerFrame: 10,
  seed: 0xc0ffee,
} as const;

/** Deterministic PRNG so the "random" schedule replays identically. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Trigger frames within one 240-frame loop, gaps drawn uniformly from
 * [minGap, maxGap]. Seeded, so every cycle replays the same schedule —
 * random feel, perfect loop. Windows are kept clear of the loop seam so the
 * exported GIF starts and ends on clean frames.
 */
export function buildGlitchSchedule(seed: number = GLITCH.seed): number[] {
  const rand = mulberry32(seed);
  const triggers: number[] = [];
  let t = 0;
  for (;;) {
    t += GLITCH.minGap + Math.floor(rand() * (GLITCH.maxGap - GLITCH.minGap + 1));
    if (t + GLITCH.holdFrames > LOOP_FRAMES) break;
    triggers.push(t);
  }
  return triggers;
}

/**
 * @returns 0-based position inside a glitch window (0..holdFrames-1) when
 *          loopFrame falls in one, otherwise -1.
 */
export function glitchFrameOf(loopFrame: number, triggers: number[]): number {
  for (const t of triggers) {
    const d = loopFrame - t;
    if (d >= 0 && d < GLITCH.holdFrames) return d;
  }
  return -1;
}
