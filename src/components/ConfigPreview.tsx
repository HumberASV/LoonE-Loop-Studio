import { useEffect, useRef } from "react";
import { sineSurfaceY, type WaveParams } from "../anim/wave";
import type { RenderSettings } from "../settings";
import { useTheme } from "../theme/ThemeContext";

interface ConfigPreviewProps {
  draft: RenderSettings;
}

/** Longest side of the preview canvas, in CSS px. */
const MAX_PREVIEW = 420;

/** Mirrors the real render's BOAT.rideLayer choice (WAVE.parallax[1]) so the
 *  preview boat sits on a layer that's actually drawn, not the invisible
 *  base wave — a fixed local constant, not a read of the live render state,
 *  to keep this component fully decoupled from anim/constants.ts. */
const PREVIEW_BOAT_PARALLAX = 0.25;

/** Illustrative-only boat sail position — doesn't need to bit-match the
 *  real physics/wrap-padding math in anim/boatMotion.ts, just convey it. */
function previewBoatXFrac(draft: RenderSettings, frame: number, loopFrames: number): number {
  if (!draft.moveAnimate) return draft.boatXFrac;
  const t = (frame % loopFrames) / loopFrames;
  const dir = draft.moveDirection < 0 ? -1 : 1;

  if (draft.moveWrap) {
    const crossings = Math.max(1, Math.round(draft.moveSpeed * loopFrames));
    const frac = draft.boatXFrac + dir * crossings * t;
    return ((frac % 1) + 1) % 1;
  }

  // Bounce: a fixed-period triangle wave between the 0.05/0.95 margins used
  // by the real bounce mode.
  const tri = Math.abs(((t * 2) % 2) - 1);
  return 0.05 + tri * 0.9;
}

/**
 * Lightweight live preview of the canvas frame + wave shape + boat position
 * for the config form. Deliberately isolated from the real render pipeline:
 * no p5, no p5.capture, no toxiclibs, and no reads/writes of the mutable
 * STAGE/WAVE/BOAT singletons the real sketch and capture hook depend on —
 * everything here is pure math over the draft form state, so tightening
 * this feedback loop can never again risk breaking recording (see the
 * capture-hook regression this app hit earlier).
 */
export function ConfigPreview({ draft }: ConfigPreviewProps) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftRef = useRef(draft);
  const themeRef = useRef(theme);
  draftRef.current = draft;
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let frame = 0;
    let rafId = 0;

    const tick = () => {
      const d = draftRef.current;
      const t = themeRef.current;
      const ratio = d.width / d.height;
      const w = ratio >= 1 ? MAX_PREVIEW : Math.round(MAX_PREVIEW * ratio);
      const h = ratio >= 1 ? Math.round(MAX_PREVIEW / ratio) : MAX_PREVIEW;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const loopFrames = Math.max(1, Math.round(d.loopSeconds * 60));
      const params: WaveParams = {
        width: w,
        height: h,
        amplitudeFrac: d.waveAmplitude,
        yCenterFrac: 0.648,
        phaseFrac: 0.045,
        crests: d.waveCrests,
        loopFrames,
      };

      // Sky gradient.
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, t.skyTop);
      sky.addColorStop(1, t.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Two wave layers (back + front), matching the real render's parallax
      // ordering closely enough to be representative.
      for (const frac of [0.1, 0.35]) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) {
          ctx.lineTo(x, sineSurfaceY(params, x, frame, frac));
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = t.waveFill;
        ctx.globalAlpha = frac === 0.1 ? 0.8 : 0.4;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Boat marker riding the (drawn) wave layer.
      const boatX = w * previewBoatXFrac(d, frame, loopFrames);
      const boatY = sineSurfaceY(params, boatX, frame, PREVIEW_BOAT_PARALLAX);
      const boatSize = Math.max(6, w * 0.05 * d.boatScale);
      ctx.fillStyle = t.boatHull;
      ctx.beginPath();
      ctx.ellipse(boatX, boatY, boatSize, boatSize * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Frame outline, so the aspect ratio itself reads clearly.
      ctx.strokeStyle = t.secondary;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, w - 2, h - 2);

      frame = (frame + 1) % loopFrames;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="config-preview">
      <canvas ref={canvasRef} />
      <p className="config-preview__hint">
        {draft.width}×{draft.height} · live preview, not the export
      </p>
    </div>
  );
}
