import geom from "toxiclibsjs/geom";
import physics2d from "toxiclibsjs/physics2d";
import {
  BOAT,
  LOOP_FRAMES,
  PRE_ROLL_LOOPS,
  STAGE,
  boatSpan,
  boatX,
} from "./constants";
import { advanceWrapMotion } from "./boatMotion";
import { sceneConfig } from "./sceneConfig";
import { boatSurfaceY } from "./wave";

const { Vec2D } = geom;
const { VerletPhysics2D, VerletParticle2D, VerletSpring2D } = physics2d;
const { GravityBehavior } = physics2d.behaviors;

/**
 * Two-particle toxiclibs Verlet rig: bow + stern joined by a rigid spring.
 * Gravity pulls the particles down; a depth-proportional buoyancy force plus
 * water drag pushes them back to ride the drawn wave surface. The boat's
 * tilt falls out of the height difference between the two particles.
 *
 * Horizontal position follows the live anchor `boatX()` (BOAT.xFrac ×
 * stage width) — SceneRuntime animates BOAT.xFrac for the sail-across modes.
 */
export class BoatRig {
  readonly bow: InstanceType<typeof VerletParticle2D>;
  readonly stern: InstanceType<typeof VerletParticle2D>;
  private readonly physics: InstanceType<typeof VerletPhysics2D>;

  constructor() {
    this.physics = new VerletPhysics2D();
    this.physics.addBehavior(new GravityBehavior(new Vec2D(0, BOAT.gravity)));

    const startFrame = -PRE_ROLL_LOOPS * LOOP_FRAMES;
    const cx = boatX();
    const half = boatSpan() / 2;
    const restY = boatSurfaceY(cx, startFrame) - 6;
    this.bow = new VerletParticle2D(cx - half, restY);
    this.stern = new VerletParticle2D(cx + half, restY);
    this.physics.addParticle(this.bow);
    this.physics.addParticle(this.stern);
    this.physics.addSpring(
      new VerletSpring2D(this.bow, this.stern, boatSpan(), BOAT.springStrength),
    );

    // Pre-roll whole loops so frame 0 already shows the settled steady state
    // and the recorded window loops without a physics "pop" at the seam.
    // Wrap-mode sailing advances during pre-roll too — the boat must enter
    // frame 1 already in its steady trailing position behind the anchor.
    const cfg = sceneConfig;
    for (let f = startFrame; f < 0; f++) {
      if (cfg.moveAnimate && cfg.moveWrap) {
        advanceWrapMotion(cfg.moveDirection, cfg.moveSpeed);
      }
      this.step(f);
    }
  }

  /** Advance one physics frame. frameIndex is the 0-based animation frame. */
  step(frameIndex: number): void {
    for (const part of [this.bow, this.stern]) {
      const waveY = boatSurfaceY(part.x, frameIndex);
      const depth = part.y - waveY;
      if (depth > 0) {
        // Submerged: Archimedes-style restoring force + water resistance.
        part.addForce(new Vec2D(0, -depth * BOAT.buoyancy));
        part.scaleVelocity(BOAT.waterDrag);
      }
    }
    this.physics.update();

    const cx = boatX();
    const half = boatSpan() / 2;
    this.recenter(this.bow, cx - half);
    this.recenter(this.stern, cx + half);
  }

  /** Ease the particle toward its anchor (the boat trails the anchor a
   *  little, which reads as natural drag). A jump larger than half the stage
   *  is a wrap teleport — snap fully. Both x and prev.x shift by the same
   *  amount so the correction injects no velocity into the integration. */
  private recenter(part: InstanceType<typeof VerletParticle2D>, targetX: number): void {
    const dx = targetX - part.x;
    const corr = Math.abs(dx) > STAGE.width / 2 ? dx : dx * 0.1;
    part.x += corr;
    part.prev.x += corr;
  }

  get midX(): number {
    return (this.bow.x + this.stern.x) / 2;
  }

  get midY(): number {
    return (this.bow.y + this.stern.y) / 2;
  }

  /** Hull tilt: angle of the bow→stern segment. */
  get angle(): number {
    return Math.atan2(this.stern.y - this.bow.y, this.stern.x - this.bow.x);
  }

  /** Live distance between the particles (≈ span; the spring keeps it rigid). */
  get length(): number {
    return Math.hypot(this.stern.x - this.bow.x, this.stern.y - this.bow.y);
  }
}
