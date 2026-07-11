/**
 * Render settings persisted to localStorage so a reload restores the last
 * applied setup. localStorage (not a cookie) on purpose: these never need to
 * reach the server, so there's no reason to ship them on every request.
 */

/**
 * Everything that needs a sketch re-render to apply. The form edits a draft
 * copy; submitting commits it in one shot and remounts the sketch — no
 * mid-loop mutations, no remount thrashing while dragging sliders.
 */
export type ExportFormat = "gif" | "webm";
export type RecordMode = "standard" | "untilExit";

export interface RenderSettings {
  width: number;
  height: number;
  fixedRatio: boolean;
  boatScale: number;
  boatXFrac: number;
  flipBoat: boolean;
  moveAnimate: boolean;
  moveDirection: number;
  moveSpeed: number;
  moveWrap: boolean;
  bakeLabel: boolean;
  autoCapture: boolean;
  /** Wave crest-to-trough height, as a fraction of canvas height. */
  waveAmplitude: number;
  /** How many full waves span the canvas width. */
  waveCrests: number;
  /** Export loop length in seconds (× FPS = frame count). */
  loopSeconds: number;
  exportFormat: ExportFormat;
  exportQuality: number;
  /** "standard" records a fixed loopSeconds-length loop; "untilExit" stops
   *  the moment the sailing boat first exits the frame. Only meaningful
   *  when moveAnimate + moveWrap are both on — otherwise treated as
   *  "standard" at render time (see sceneRuntime.ts). */
  recordMode: RecordMode;
}

export const DEFAULT_SETTINGS: RenderSettings = {
  width: 1920,
  height: 1080,
  fixedRatio: false,
  boatScale: 1,
  boatXFrac: 0.5,
  flipBoat: true,
  moveAnimate: false,
  moveDirection: 1,
  moveSpeed: 0.004,
  moveWrap: true,
  bakeLabel: true,
  autoCapture: false,
  waveAmplitude: 0.039,
  waveCrests: 3,
  loopSeconds: 4,
  exportFormat: "gif",
  exportQuality: 0.7,
  recordMode: "standard",
};

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const STORAGE_KEY = "loone-loop-studio:settings:v1";

/** Bring any stored/edited settings into valid ranges before they drive a
 *  render (the form also clamps width/height on submit; this covers the
 *  load path and guards against hand-edited or stale stored values). */
export function sanitizeSettings(s: RenderSettings): RenderSettings {
  const width = clamp(Math.round(s.width) || DEFAULT_SETTINGS.width, 200, 3840);
  const height = clamp(Math.round(s.height) || DEFAULT_SETTINGS.height, 200, 3840);
  return {
    ...s,
    width,
    height: s.fixedRatio ? width : height,
    boatScale: clamp(s.boatScale, 0.5, 2),
    boatXFrac: clamp(s.boatXFrac, 0.1, 0.9),
    moveSpeed: clamp(s.moveSpeed, 0.001, 0.015),
    moveDirection: s.moveDirection < 0 ? -1 : 1,
    waveAmplitude: clamp(s.waveAmplitude, 0.01, 0.08),
    waveCrests: clamp(Math.round(s.waveCrests) || DEFAULT_SETTINGS.waveCrests, 1, 6),
    // Rounded to the nearest 0.5s so loopSeconds × FPS(60) is always a whole
    // frame count — LOOP_FRAMES must be an integer for the loop math.
    loopSeconds: Math.round(clamp(s.loopSeconds, 1, 8) * 2) / 2,
    exportFormat: s.exportFormat === "webm" ? "webm" : "gif",
    exportQuality: clamp(s.exportQuality, 0.1, 1),
    recordMode: s.recordMode === "untilExit" ? "untilExit" : "standard",
  };
}

/**
 * The saved settings merged over the current defaults (so a new field added
 * later gets a sane value instead of undefined), sanitized. Falls back to
 * DEFAULT_SETTINGS if nothing is stored or the payload is unreadable.
 *
 * Does NOT touch autoCapture — RenderPage relies on this returning exactly
 * what was just committed by ConfigPage's "Apply & Render" (which is itself
 * the user's deliberate re-enable). The "don't silently resume a stale
 * recording toggle" guard belongs on the *form's* default instead — see
 * ConfigPage's draft initialization — so it fires when a user lands on the
 * config form, not when the render page reads what they just submitted.
 */
export function loadSettings(): RenderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<RenderSettings>;
    return sanitizeSettings({ ...DEFAULT_SETTINGS, ...parsed });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: RenderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // private-mode / quota / disabled storage: persistence is best-effort
  }
}
