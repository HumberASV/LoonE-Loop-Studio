import { useState } from "react";
import { Link } from "react-router-dom";
import { FPS } from "../anim/constants";
import { SceneStage, type SceneVariant } from "../components/SceneStage";
import { loadSettings } from "../settings";
import { loadingSketch } from "../sketches/loadingSketch";
import { technicalDifficultySketch } from "../sketches/technicalDifficultySketch";

type SceneId = "loading" | "difficulty";

const SCENES: Record<
  SceneId,
  { title: string; label: string; variant: SceneVariant; sketch: typeof loadingSketch }
> = {
  loading: {
    title: "Loading Screen",
    label: "LOADING...",
    variant: "loading",
    sketch: loadingSketch,
  },
  difficulty: {
    title: "Technical Difficulty",
    label: "TECHNICAL\nDIFFICULTY",
    variant: "glitch",
    sketch: technicalDifficultySketch,
  },
};

/**
 * The actual canvas + recording. Always mounts fresh from whatever settings
 * were last committed to localStorage by ConfigPage — a page navigation is
 * already a full remount, so there's no partial-update path to keep in
 * sync; "Restart loop" just bumps runId to remount again without leaving.
 */
export default function RenderPage() {
  const [sceneId, setSceneId] = useState<SceneId>("loading");
  const [settings] = useState(loadSettings);
  const [runId, setRunId] = useState(0);
  const scene = SCENES[sceneId];
  // Derived from `settings` directly (not the global LOOP_FRAMES, which
  // SceneStage only sets as a side effect once React actually renders it —
  // after this header's JSX expressions are evaluated).
  const loopFrames = Math.round(settings.loopSeconds * FPS);
  // Mirrors the same guard sceneRuntime.ts applies at capture time: "until
  // exit" only actually takes effect with wrap-mode boat motion on.
  const untilExit =
    settings.recordMode === "untilExit" && settings.moveAnimate && settings.moveWrap;

  return (
    <main className="studio">
      <header>
        <h1>LoonE Loop Studio</h1>
        <p>
          {settings.width}×{settings.height} · {loopFrames} frames @ {FPS}fps ·{" "}
          {untilExit ? "records until boat exits" : "perfect loop"}
        </p>
      </header>

      <nav className="tabs">
        {(Object.keys(SCENES) as SceneId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={id === sceneId ? "active" : ""}
            onClick={() => {
              setSceneId(id);
              setRunId((r) => r + 1);
            }}
          >
            {SCENES[id].title}
          </button>
        ))}
      </nav>

      <SceneStage
        key={sceneId}
        sketch={scene.sketch}
        label={scene.label}
        variant={scene.variant}
        runId={runId}
        settings={settings}
      />

      <div className="apply-row">
        <button type="button" onClick={() => setRunId((r) => r + 1)}>
          ⟲ Restart loop{settings.autoCapture ? " + record" : ""}
        </button>
        <Link to="/" className="edit-settings-link">
          ← Edit settings
        </Link>
      </div>
    </main>
  );
}
