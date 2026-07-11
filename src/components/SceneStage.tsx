import { ReactP5Wrapper, type Sketch } from "@p5-wrapper/react";
import { BOAT, EXPORT, FPS, STAGE, WAVE, setLoopFrames } from "../anim/constants";
import { sceneConfig, type SceneSketchProps } from "../anim/sceneConfig";
import type { RenderSettings } from "../settings";
import { useTheme } from "../theme/ThemeContext";

export type SceneVariant = "loading" | "glitch";

interface SceneStageProps {
  sketch: Sketch<SceneSketchProps>;
  label: string;
  variant: SceneVariant;
  /** Bump to remount the sketch (restarts the loop and any auto-capture). */
  runId: number;
  settings: RenderSettings;
}

/** The canvas plus its centered DOM text overlay. */
export function SceneStage({ sketch, label, variant, runId, settings }: SceneStageProps) {
  const { theme } = useTheme();
  const {
    width,
    height,
    boatScale,
    boatXFrac,
    flipBoat,
    moveAnimate,
    moveDirection,
    moveSpeed,
    moveWrap,
    bakeLabel,
    autoCapture,
    waveAmplitude,
    waveCrests,
    loopSeconds,
    exportFormat,
    exportQuality,
    recordMode,
  } = settings;

  // Direct singleton mutation, same pattern for every value that must be
  // correct at setup()/BoatRig-construction time (not just eventually
  // consistent) — these all need a fresh sketch mount to take effect, which
  // the remount key below guarantees.
  STAGE.width = width;
  STAGE.height = height;
  BOAT.scale = boatScale;
  WAVE.amplitudeFrac = waveAmplitude;
  WAVE.crests = waveCrests;
  setLoopFrames(Math.round(loopSeconds * FPS));
  EXPORT.format = exportFormat;
  EXPORT.quality = exportQuality;

  // Snapshot for the sketch's earliest frames, which can render before
  // updateWithProps delivers live props (auto-capture fires on frame 1).
  sceneConfig.theme = theme;
  sceneConfig.autoCapture = autoCapture;
  sceneConfig.bakeLabel = bakeLabel;
  sceneConfig.flipBoat = flipBoat;
  sceneConfig.boatScale = boatScale;
  sceneConfig.boatXFrac = boatXFrac;
  sceneConfig.moveAnimate = moveAnimate;
  sceneConfig.moveDirection = moveDirection;
  sceneConfig.moveSpeed = moveSpeed;
  sceneConfig.moveWrap = moveWrap;
  sceneConfig.recordMode = recordMode;

  const maxStageWidth = 720;
  const stageWidth = width > height ? maxStageWidth : maxStageWidth * (width / height);

  const remountKey = [
    runId,
    width,
    height,
    boatScale,
    waveAmplitude,
    waveCrests,
    loopSeconds,
    exportFormat,
    exportQuality,
  ].join("-");

  return (
    <div
      className="stage"
      data-variant={variant}
      style={{
        width: `min(88vmin, ${stageWidth}px)`,
        aspectRatio: `${width} / ${height}`,
      }}
    >
      <ReactP5Wrapper
        key={remountKey}
        sketch={sketch}
        theme={theme}
        autoCapture={autoCapture}
        bakeLabel={bakeLabel}
        label={label}
        canvasWidth={width}
        canvasHeight={height}
        flipBoat={flipBoat}
        boatScale={boatScale}
        boatXFrac={boatXFrac}
        moveAnimate={moveAnimate}
        moveDirection={moveDirection}
        moveSpeed={moveSpeed}
        moveWrap={moveWrap}
        recordMode={recordMode}
      />
      <div
        className={`overlay overlay--${variant}`}
        aria-hidden="true"
        style={{ opacity: bakeLabel ? 0 : 1 }}
      >
        <h1 data-text={label}>{label}</h1>
      </div>
    </div>
  );
}
