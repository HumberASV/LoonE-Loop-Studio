import type p5 from "p5";
import type { ColorTheme } from "../theme/themes";
import { themedBoatImage } from "./boatArt";
import { BOAT, STAGE, WAVE, boatDraft, boatWidth } from "./constants";
import { BoatRig } from "./boatRig";
import { sceneConfig } from "./sceneConfig";
import { surfaceY } from "./wave";

/**
 * The shared boat-on-waves scene. Both pages render this; the Technical
 * Difficulty sketch corrupts the result afterwards. Layer order matches the
 * original SVG hero: two wave layers behind the boat, two in front.
 * All geometry derives from the mutable STAGE size, so any export dimension
 * keeps the same composition.
 */
export class BaseScene {
  readonly rig = new BoatRig();
  /** Mirror the boat art horizontally. SceneRuntime owns this — it also
   *  toggles it live when the bounce mode turns the boat around. */
  flipped = sceneConfig.flipBoat;
  private boatImg: p5.Image | null = null;
  private sky: p5.Graphics | null = null;
  private skyThemeName = "";

  constructor(private readonly p: p5) {}

  /** PNG per spec (theme-agnostic override) → themed LoonE SVG (built lazily
   *  per theme in boatArt.ts) → physics-rect fallback. */
  loadAssets(): void {
    const { p } = this;
    p.loadImage(
      "/assets/loone-boat.png",
      (img) => (this.boatImg = img),
      () =>
        console.info(
          "[scene] loone-boat.png missing — using theme-recolored SVG",
        ),
    );
  }

  /** Advance physics one frame. */
  step(frameIndex: number): void {
    this.rig.step(frameIndex);
  }

  /** Draw the full frame for the given animation frame + theme. */
  render(frameIndex: number, theme: ColorTheme): void {
    this.drawSky(theme);
    this.drawWaveLayer(frameIndex, theme, 0);
    this.drawWaveLayer(frameIndex, theme, 1);
    this.drawBoat(theme);
    this.drawWaveLayer(frameIndex, theme, 2);
    this.drawWaveLayer(frameIndex, theme, 3);
  }

  /** Vertical sky gradient, rendered once per theme and cached. */
  private drawSky(theme: ColorTheme): void {
    const { p } = this;
    if (!this.sky || this.skyThemeName !== theme.name) {
      this.skyThemeName = theme.name;
      if (!this.sky) {
        this.sky = p.createGraphics(STAGE.width, STAGE.height);
        this.sky.pixelDensity(1);
      }
      const g = this.sky;
      const top = p.color(theme.skyTop);
      const bottom = p.color(theme.skyBottom);
      for (let y = 0; y < STAGE.height; y++) {
        g.stroke(p.lerpColor(top, bottom, y / STAGE.height));
        g.line(0, y, STAGE.width, y);
      }
    }
    p.image(this.sky, 0, 0);
  }

  private drawWaveLayer(frameIndex: number, theme: ColorTheme, layer: number): void {
    const { p } = this;
    const frac = WAVE.parallax[layer] ?? 0;
    const fill = p.color(theme.waveFill);
    fill.setAlpha(255 * (theme.waveOpacities[layer as 0 | 1 | 2 | 3] ?? 0.4));

    p.noStroke();
    p.fill(fill);
    p.beginShape();
    for (let x = 0; x <= STAGE.width; x += 6) {
      p.vertex(x, surfaceY(x, frameIndex, frac));
    }
    p.vertex(STAGE.width, STAGE.height);
    p.vertex(0, STAGE.height);
    p.endShape(p.CLOSE);
  }

  /**
   * Midpoint + atan2 rendering per spec: translate to the spring's midpoint,
   * rotate by the bow→stern angle, draw the art (or the fallback rectangle
   * spanning the live particle coordinates). Mirroring happens inside the
   * rotated frame, so a flipped boat still tilts with the wave.
   */
  private drawBoat(theme: ColorTheme): void {
    const { p, rig } = this;
    const art = this.boatImg ?? themedBoatImage(p, theme);
    p.push();
    p.translate(rig.midX, rig.midY);
    p.rotate(rig.angle);
    if (this.flipped) p.scale(-1, 1);

    if (art) {
      p.imageMode(p.CENTER);
      const w = boatWidth();
      const h = (w * art.height) / Math.max(1, art.width);
      // Anchor by the hull: art bottom sits boatDraft() px below the
      // particle axis so the boat visibly displaces the water it rides.
      p.image(art, 0, boatDraft() - h / 2, w, h);
    } else {
      const len = rig.length;
      const s = BOAT.scale;
      p.rectMode(p.CENTER);
      p.noStroke();
      p.fill(theme.accent);
      p.rect(0, -16 * s, len, 44 * s, 10 * s);
      // Particle markers: bow/stern are exactly (±len/2, 0) in local space.
      p.fill(theme.primary);
      p.circle(-len / 2, 0, 14 * s);
      p.circle(len / 2, 0, 14 * s);
    }
    p.pop();
  }
}
