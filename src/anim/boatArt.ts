import type p5 from "p5";
import type { ColorTheme } from "../theme/themes";

/**
 * Theme-aware LoonE boat art.
 *
 * The source SVG is an Inkscape A4 page (viewBox 0 0 210 297) with the boat
 * drawn somewhere inside it and two hardcoded color ramps (gold body, gray
 * details). This module fetches it once, crops the viewBox to the artwork's
 * real bounding box, and re-derives both ramps from the active theme's
 * boatHull / boatDetail tokens — one recolored raster per theme, cached.
 */

/** The exact hex values used by the SVG's gold (hull) ramp, dark → light. */
const HULL_SOURCE = ["#d4aa00", "#ffcc00", "#ffd42a", "#ffdd55", "#ffe680"];
/** Mix of the theme's hull base toward black (−) / white (+) per ramp step,
 *  chosen so the default gold theme reproduces the original art. */
const HULL_SHADES = [-0.22, -0.08, 0, 0.25, 0.5];

/** The SVG's gray (detail) ramp, dark → light. */
const DETAIL_SOURCE = ["#333333", "#999999", "#b3b3b3", "#cccccc"];
const DETAIL_SHADES = [-0.71, -0.15, 0, 0.14];

/** Raster upscale over the cropped viewBox so 1080p canvas draws stay crisp. */
const RASTER_SCALE = 4;

/** Mix a hex color toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const toward = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (toward - c) * t);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix) as [
    number,
    number,
    number,
  ];
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function buildColorMap(theme: ColorTheme): Map<string, string> {
  const map = new Map<string, string>();
  HULL_SOURCE.forEach((src, i) => map.set(src, shade(theme.boatHull, HULL_SHADES[i] ?? 0)));
  DETAIL_SOURCE.forEach((src, i) =>
    map.set(src, shade(theme.boatDetail, DETAIL_SHADES[i] ?? 0)),
  );
  return map;
}

let croppedTemplate: string | null = null;

/** Fetch the SVG and rewrite its page-sized viewBox to hug the artwork. */
async function loadTemplate(): Promise<string> {
  if (croppedTemplate) return croppedTemplate;

  const res = await fetch("/assets/loone-boat.svg");
  if (!res.ok) throw new Error(`boat svg fetch failed: ${res.status}`);
  const text = await res.text();

  // getBBox needs a rendered element; park the SVG off-screen briefly.
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-99999px;top:0;";
  host.innerHTML = text;
  document.body.appendChild(host);
  const svg = host.querySelector("svg") as SVGGraphicsElement & SVGSVGElement;
  const box = svg.getBBox();
  host.remove();

  const pad = 2;
  const [x, y, w, h] = [box.x - pad, box.y - pad, box.width + 2 * pad, box.height + 2 * pad];
  croppedTemplate = text.replace(/<svg[^>]*>/, (tag) =>
    tag
      .replace(/\swidth="[^"]*"/, ` width="${Math.round(w * RASTER_SCALE)}"`)
      .replace(/\sheight="[^"]*"/, ` height="${Math.round(h * RASTER_SCALE)}"`)
      .replace(/\sviewBox="[^"]*"/, ` viewBox="${x} ${y} ${w} ${h}"`),
  );
  return croppedTemplate;
}

const imageCache = new Map<string, p5.Image>();
const inFlight = new Set<string>();

/**
 * The themed boat raster for `theme`, or null while it is still being built
 * (kicks the build off on first miss; re-renders pick it up when ready).
 */
export function themedBoatImage(p: p5, theme: ColorTheme): p5.Image | null {
  const cached = imageCache.get(theme.name);
  if (cached) return cached;

  if (!inFlight.has(theme.name)) {
    inFlight.add(theme.name);
    void loadTemplate()
      .then((template) => {
        const colors = buildColorMap(theme);
        const recolored = template.replace(
          /#[0-9a-fA-F]{6}/g,
          (hex) => colors.get(hex.toLowerCase()) ?? hex,
        );
        const url = `data:image/svg+xml;base64,${btoa(
          unescape(encodeURIComponent(recolored)),
        )}`;
        p.loadImage(
          url,
          (img) => imageCache.set(theme.name, img),
          () => console.warn(`[boat] raster failed for theme "${theme.name}"`),
        );
      })
      .catch((err) => console.warn("[boat] svg unavailable:", err));
  }
  return null;
}
