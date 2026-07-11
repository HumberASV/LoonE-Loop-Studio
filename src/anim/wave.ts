import { BOAT, LOOP_FRAMES, STAGE, WAVE } from "./constants";

/** Explicit inputs for the sine wave field — everything `sineSurfaceY` needs,
 *  with no dependency on the app's mutable STAGE/WAVE singletons. Lets the
 *  same formula drive both the real render (via `surfaceY` below, which
 *  reads the singletons) and an isolated preview (which reads draft form
 *  state instead) without duplicating the math. */
export interface WaveParams {
  width: number;
  height: number;
  amplitudeFrac: number;
  yCenterFrac: number;
  phaseFrac: number;
  crests: number;
  loopFrames: number;
}

/** 0..1 progress through a `loopFrames`-length loop. Accepts negative frame
 *  indices (used by the physics pre-roll) and indices beyond one loop. */
export function loopPhaseFor(frameIndex: number, loopFrames: number): number {
  return (((frameIndex % loopFrames) + loopFrames) % loopFrames) / loopFrames;
}

/**
 * Pure surface-Y formula, parameterized on explicit wave/stage/loop values:
 *
 *   y = yCenter − amplitude · sin( 2π · (x − phase + shift) / period )
 *
 * `period` is always `width / crests`, so the field is spatially seamless
 * (an integer number of crests fits the stage) and `shift` advances exactly
 * one period over `loopFrames` frames, so it's temporally seamless too.
 *
 * @param parallaxFrac extra fractional offset (×period) for cosmetic layers;
 *                     the physics wave rides one of these (see boatSurfaceY).
 */
export function sineSurfaceY(
  params: WaveParams,
  x: number,
  frameIndex: number,
  parallaxFrac = 0,
): number {
  const period = params.width / params.crests;
  const amplitude = params.height * params.amplitudeFrac;
  const yCenter = params.height * params.yCenterFrac;
  const phase = period * params.phaseFrac;
  const shift = loopPhaseFor(frameIndex, params.loopFrames) * period + parallaxFrac * period;
  return yCenter - amplitude * Math.sin((2 * Math.PI * (x - phase + shift)) / period);
}

const liveWaveParams = (): WaveParams => ({
  width: STAGE.width,
  height: STAGE.height,
  amplitudeFrac: WAVE.amplitudeFrac,
  yCenterFrac: WAVE.yCenterFrac,
  phaseFrac: WAVE.phaseFrac,
  crests: WAVE.crests,
  loopFrames: LOOP_FRAMES,
});

/** Wavelength in px — always an exact integer count across the stage. */
export const wavePeriod = (): number => STAGE.width / WAVE.crests;

export const waveAmplitude = (): number => STAGE.height * WAVE.amplitudeFrac;

export const waveCenterY = (): number => STAGE.height * WAVE.yCenterFrac;

/** 0..1 progress through the current loop (reads the live LOOP_FRAMES). */
export function loopPhase(frameIndex: number): number {
  return loopPhaseFor(frameIndex, LOOP_FRAMES);
}

/** Horizontal scroll in px — advances exactly one wavelength per loop, which
 *  is what makes the last frame land pixel-identical on frame 0. */
export function waveShift(frameIndex: number): number {
  return loopPhase(frameIndex) * wavePeriod();
}

/** Surface Y of the live wave field at a given X/frame — thin wrapper over
 *  `sineSurfaceY` bound to the current STAGE/WAVE/LOOP_FRAMES singletons. */
export function surfaceY(x: number, frameIndex: number, parallaxFrac = 0): number {
  return sineSurfaceY(liveWaveParams(), x, frameIndex, parallaxFrac);
}

/** The wave surface the boat physics floats on — one of the *drawn* layers,
 *  so the hull always sits in visible water. */
export function boatSurfaceY(x: number, frameIndex: number): number {
  return surfaceY(x, frameIndex, WAVE.parallax[BOAT.rideLayer] ?? 0);
}
