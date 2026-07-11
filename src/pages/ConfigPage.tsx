import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FPS } from "../anim/constants";
import { ConfigPreview } from "../components/ConfigPreview";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  sanitizeSettings,
  saveSettings,
  type RenderSettings,
} from "../settings";
import { useTheme } from "../theme/ThemeContext";
import { THEMES, type ThemeName } from "../theme/themes";

const PRESETS = [
  { id: "1:1", name: "1:1 Square (1080×1080)", w: 1080, h: 1080 },
  { id: "16:9", name: "16:9 Widescreen (1920×1080)", w: 1920, h: 1080 },
  { id: "9:16", name: "9:16 Portrait (1080×1920)", w: 1080, h: 1920 },
  { id: "4:3", name: "4:3 Standard (1440×1080)", w: 1440, h: 1080 },
  { id: "3:2", name: "3:2 Photo (1620×1080)", w: 1620, h: 1080 },
  { id: "5:4", name: "5:4 Display (1350×1080)", w: 1350, h: 1080 },
  { id: "16:10", name: "16:10 Widescreen (1728×1080)", w: 1728, h: 1080 },
  { id: "1.85:1", name: "1.85:1 Cinema (1998×1080)", w: 1998, h: 1080 },
  { id: "2.35:1", name: "2.35:1 Cinemascope (2538×1080)", w: 2538, h: 1080 },
];

/** A reload of the config form should never resurface a pre-armed "record"
 *  toggle from a past session — the user re-enables it deliberately each
 *  time they configure a render. (RenderPage's own loadSettings() call is
 *  NOT stripped this way — it must honor exactly what Apply just saved.) */
function loadDraftSettings(): RenderSettings {
  return { ...loadSettings(), autoCapture: false };
}

export default function ConfigPage() {
  const { themeName, setThemeName } = useTheme();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<RenderSettings>(loadDraftSettings);

  const crossings = Math.max(1, Math.round(draft.moveSpeed * draft.loopSeconds * FPS));
  const untilExitAvailable = draft.moveAnimate && draft.moveWrap;

  /** Edit the draft only — the preview re-renders every frame anyway (it
   *  has its own rAF loop), so no extra plumbing is needed for "live". */
  const edit = (patch: Partial<RenderSettings>) =>
    setDraft((d) => {
      const next = { ...d, ...patch };
      if (next.fixedRatio) {
        if (patch.width !== undefined) next.height = patch.width;
        else if (patch.height !== undefined) next.width = patch.height;
        else if (patch.fixedRatio) next.height = next.width;
      }
      return next;
    });

  const presetId =
    PRESETS.find((p) => p.w === draft.width && p.h === draft.height)?.id ?? "custom";

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const clean = sanitizeSettings(draft);
    saveSettings(clean);
    navigate("/render");
  };

  return (
    <main className="studio">
      <header>
        <h1>LoonE Loop Studio</h1>
        <p>Configure the loop, then render it</p>
      </header>

      <ConfigPreview draft={draft} />

      <section className="controls">
        <label>
          Theme{" "}
          <select
            value={themeName}
            onChange={(e) => setThemeName(e.target.value as ThemeName)}
          >
            {(Object.keys(THEMES) as ThemeName[]).map((key) => (
              <option key={key} value={key}>
                {THEMES[key].name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <form className="settings" onSubmit={apply}>
        <fieldset>
          <legend>Canvas</legend>
          <label>
            Preset{" "}
            <select
              value={presetId}
              onChange={(e) => {
                const preset = PRESETS.find((p) => p.id === e.target.value);
                if (preset) {
                  edit({
                    width: preset.w,
                    height: preset.h,
                    fixedRatio: preset.w === preset.h,
                  });
                }
              }}
            >
              <option value="custom">Custom</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Width{" "}
            <input
              type="number"
              min={200}
              max={3840}
              value={draft.width}
              onChange={(e) => edit({ width: e.target.valueAsNumber || 0 })}
            />{" "}
            px
          </label>
          <label>
            Height{" "}
            <input
              type="number"
              min={200}
              max={3840}
              value={draft.height}
              onChange={(e) => edit({ height: e.target.valueAsNumber || 0 })}
            />{" "}
            px
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.fixedRatio}
              onChange={(e) => edit({ fixedRatio: e.target.checked })}
            />{" "}
            Lock 1:1 (square)
          </label>
          <label>
            Loop Duration: {draft.loopSeconds}s
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={draft.loopSeconds}
              onChange={(e) => edit({ loopSeconds: e.target.valueAsNumber })}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Waves</legend>
          <label>
            Wave Height: {Math.round(draft.waveAmplitude * 1000) / 10}%
            <input
              type="range"
              min={0.01}
              max={0.08}
              step={0.001}
              value={draft.waveAmplitude}
              onChange={(e) => edit({ waveAmplitude: e.target.valueAsNumber })}
            />
          </label>
          <label>
            Waves Across Frame: {draft.waveCrests}
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={draft.waveCrests}
              onChange={(e) => edit({ waveCrests: e.target.valueAsNumber })}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Boat</legend>
          <label>
            Size: {Math.round(draft.boatScale * 100)}%
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={draft.boatScale}
              onChange={(e) => edit({ boatScale: e.target.valueAsNumber })}
            />
          </label>
          <label style={{ opacity: draft.moveAnimate ? 0.5 : 1 }}>
            Position: {Math.round(draft.boatXFrac * 100)}%
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.01}
              value={draft.boatXFrac}
              disabled={draft.moveAnimate}
              onChange={(e) => edit({ boatXFrac: e.target.valueAsNumber })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.flipBoat}
              onChange={(e) => edit({ flipBoat: e.target.checked })}
            />{" "}
            ↔ Flip boat
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.moveAnimate}
              onChange={(e) => edit({ moveAnimate: e.target.checked })}
            />{" "}
            Animate boat movement
          </label>
          {draft.moveAnimate && (
            <>
              <label>
                Direction{" "}
                <select
                  value={draft.moveDirection}
                  onChange={(e) => edit({ moveDirection: parseInt(e.target.value) })}
                >
                  <option value={1}>Right</option>
                  <option value={-1}>Left</option>
                </select>
              </label>
              <label>
                Speed:{" "}
                {draft.moveWrap
                  ? `${crossings}× across per loop`
                  : Math.round(draft.moveSpeed * 1000)}
                <input
                  type="range"
                  min={0.001}
                  max={0.015}
                  step={0.001}
                  value={draft.moveSpeed}
                  onChange={(e) => edit({ moveSpeed: e.target.valueAsNumber })}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.moveWrap}
                  onChange={(e) => edit({ moveWrap: e.target.checked })}
                />{" "}
                Wrap at ends — seamless loop (uncheck to bounce)
              </label>
            </>
          )}
        </fieldset>

        <fieldset>
          <legend>Output</legend>
          <label>
            <input
              type="checkbox"
              checked={draft.bakeLabel}
              onChange={(e) => edit({ bakeLabel: e.target.checked })}
            />{" "}
            Bake label into canvas
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.autoCapture}
              onChange={(e) => edit({ autoCapture: e.target.checked })}
            />{" "}
            Record on render
          </label>
          <label>
            Export format{" "}
            <select
              value={draft.exportFormat}
              onChange={(e) => edit({ exportFormat: e.target.value as RenderSettings["exportFormat"] })}
            >
              <option value="gif">GIF</option>
              <option value="webm">WebM</option>
            </select>
          </label>
          <label>
            Quality: {Math.round(draft.exportQuality * 100)}%
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={draft.exportQuality}
              onChange={(e) => edit({ exportQuality: e.target.valueAsNumber })}
            />
          </label>
          <label style={{ opacity: untilExitAvailable ? 1 : 0.5 }}>
            Record mode{" "}
            <select
              value={untilExitAvailable ? draft.recordMode : "standard"}
              disabled={!untilExitAvailable}
              onChange={(e) => edit({ recordMode: e.target.value as RenderSettings["recordMode"] })}
            >
              <option value="standard">Perfect loop ({draft.loopSeconds}s)</option>
              <option value="untilExit">Until boat exits frame</option>
            </select>
          </label>
          {!untilExitAvailable && (
            <p className="field-hint">
              "Until boat exits frame" needs wrap-mode boat movement enabled above.
            </p>
          )}
        </fieldset>

        <div className="apply-row">
          <button type="submit" className="apply">
            Apply &amp; Render{draft.autoCapture ? " + Record" : ""}
          </button>
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_SETTINGS)}
          >
            Reset to defaults
          </button>
        </div>
      </form>
    </main>
  );
}
