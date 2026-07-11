/**
 * Mutable stage size — this is the exported GIF resolution. React writes it
 * before a sketch mounts and every size change remounts the sketch, so
 * setup() always reads a settled value. Defaults to the square asset size.
 */
export const STAGE = { width: 1920, height: 1080 };

export const FPS = 60;

/** Mutable loop length in frames — one perfect loop, in frames @ 60fps.
 *  Every periodic term in the scenes (wave shift, glitch schedule, boat
 *  wrap motion) completes an integer number of cycles inside this window,
 *  regardless of its value, so it's safe to change between renders. React
 *  sets this from the applied loopSeconds before a sketch mounts, the same
 *  way it sets STAGE — see SceneStage.tsx. */
export let LOOP_FRAMES = 240;

export function setLoopFrames(frames: number): void {
  LOOP_FRAMES = frames;
}

/** Whole loops the physics simulates during setup so the boat has settled
 *  into its steady wave-riding state before frame 1 is ever drawn/recorded. */
export const PRE_ROLL_LOOPS = 2;

export type ExportFormat = "gif" | "webm" | "mp4" | "png";

/** p5.capture export settings. Flip format to "webm" for lossless-ish masters. */
export const EXPORT: { format: ExportFormat; quality: number } = {
  format: "gif",
  quality: 0.7,
};

/**
 * Cosmetic wave field, ported from the Experimental-Visualizer SVG hero.
 * Everything is proportional to the stage so any export size keeps both the
 * spatial seam (integer crests across the width) and the temporal one.
 */
export const WAVE = {
  /** Integer number of wavelengths across the stage → spatially seamless.
   *  UI-adjustable ("Waves Across Frame"). */
  crests: 3,
  /** Amplitude as a fraction of stage height (SVG waveHeight 40 / 1000-box).
   *  UI-adjustable ("Wave Height"). */
  amplitudeFrac: 0.039,
  /** Waterline (the wave's neutral axis) as a fraction of stage height. */
  yCenterFrac: 0.648,
  /** Static phase offset as a fraction of one wavelength (SVG phase 15/333). */
  phaseFrac: 0.045,
  /** Fractional per-layer horizontal offsets (×wavelength) for parallax
   *  depth, identical to the SVG implementation. */
  parallax: [0.1, 0.25, 0.35, 0.45] as number[],
};

/** Boat rig + water physics tuning. Forces are px/frame² (timeStep = 1). */
export const BOAT = {
  /** Boat center as a fraction of stage width (SVG cx 700/1000). */
  xFrac: 0.7,
  /** UI-adjustable overall size multiplier; changes remount the sketch so
   *  the rig is rebuilt at the new size. */
  scale: 1,
  /** Drawn art width at scale 1. */
  baseWidth: 230,
  /** Rig span (bow↔stern rest length) relative to the drawn width. */
  spanRatio: 170 / 230,
  /** Which wave layer the physics rides (index into WAVE.parallax). Layer 1
   *  is drawn directly behind the boat, so the hull visually sits in the
   *  water it floats on — the un-offset base wave is never drawn. */
  rideLayer: 1,
  /** How far the art's hull bottom sits below the particle axis at scale 1.
   *  Particles settle ~gravity/buoyancy below the surface, so the hull reads
   *  as displacing water and the front layers can lap over it. */
  artDraft: 10,
  /** Downward gravity applied by the physics world. */
  gravity: 0.35,
  /** Upward force per px of submersion depth (Archimedes-ish). */
  buoyancy: 0.02,
  /** Velocity multiplier applied every frame a particle stays underwater. */
  waterDrag: 0.92,
  /** VerletSpring2D strength — high = rigid hull. */
  springStrength: 0.9,

  /** width of the boat at its current scale */
  width: (): number => BOAT.baseWidth * BOAT.scale,
};

export const boatWidth = (): number => BOAT.baseWidth * BOAT.scale;
export const boatSpan = (): number => boatWidth() * BOAT.spanRatio;
export const boatX = (): number => STAGE.width * BOAT.xFrac;
export const boatDraft = (): number => BOAT.artDraft * BOAT.scale;