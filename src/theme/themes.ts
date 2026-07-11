/**
 * Rigid theme token map. Every color in the app — canvas backdrop, waves,
 * overlay text, boat fallback — must come from a ColorTheme so palettes can
 * swap live without touching scene code.
 */
export interface ColorTheme {
  /** Display name shown in the theme picker. */
  name: string;
  /** Page chrome + outermost canvas backdrop. */
  background: string;
  /** Vertical sky gradient painted behind the waves (top of canvas). */
  skyTop: string;
  /** Vertical sky gradient at the waterline. */
  skyBottom: string;
  /** Headline overlay + baked canvas text. */
  primary: string;
  /** Supporting text / UI chrome. */
  secondary: string;
  /** Boat fallback hull + highlight details. */
  accent: string;
  /** Base color shared by all four wave layers. */
  waveFill: string;
  /** Per-layer alpha, same order as WAVE.parallax (back → front). */
  waveOpacities: [number, number, number, number];
  /** Boat body base color — the LoonE SVG's gold ramp is regenerated from
   *  this (see anim/boatArt.ts). */
  boatHull: string;
  /** Boat detail base color — regenerates the SVG's gray ramp (head, eye,
   *  antenna). */
  boatDetail: string;
}

export const THEMES = {
  // HumberASV brand guide: Primary #B980F1, Compliment #D8FA07,
  // Alternate #00435C, Dark #080721, Shade #D9D9D9, Light #F2F2F2.
  brandLight: {
    name: "Humber ASV — Light",
    background: "#f2f2f2", // Light
    skyTop: "#f2f2f2", // Light
    skyBottom: "#d9d9d9", // Shade
    primary: "#080721", // Dark (logo-on-light)
    secondary: "#00435c", // Alternate
    accent: "#d8fa07", // Compliment
    waveFill: "#b980f1", // Primary
    waveOpacities: [0.8, 0.4, 0.4, 0.4],
    boatHull: "#d8fa07", // Compliment — high-viz hull on purple water
    boatDetail: "#080721", // Dark
  },
  brandDark: {
    name: "Humber ASV — Dark",
    background: "#080721", // Dark (banner treatment in the guide)
    skyTop: "#080721", // Dark
    skyBottom: "#00435c", // Alternate glow at the horizon
    primary: "#f2f2f2", // Light (logo-on-dark)
    secondary: "#d9d9d9", // Shade
    accent: "#d8fa07", // Compliment
    waveFill: "#b980f1", // Primary
    waveOpacities: [0.8, 0.4, 0.4, 0.4],
    boatHull: "#d8fa07", // Compliment
    boatDetail: "#d9d9d9", // Shade
  },
  humber: {
    name: "Humber Day",
    background: "#eef1fb",
    skyTop: "#f8faff",
    skyBottom: "#c9d5f4",
    primary: "#140f66",
    secondary: "#4c5480",
    accent: "#ffcc33", // LoonE gold
    waveFill: "#1f06a9", // from the original SVG hero wave
    waveOpacities: [0.8, 0.4, 0.4, 0.4],
    boatHull: "#ffd42a", // the SVG's original gold
    boatDetail: "#b3b3b3",
  },
  midnight: {
    name: "Midnight Swell",
    background: "#04050e",
    skyTop: "#070a1f",
    skyBottom: "#141b40",
    primary: "#e8ecff",
    secondary: "#7f88b3",
    accent: "#ffd966",
    waveFill: "#3d5afe",
    waveOpacities: [0.8, 0.4, 0.4, 0.4],
    boatHull: "#e8b84a", // moonlit brass
    boatDetail: "#8b93b8",
  },
  broadcast: {
    name: "Broadcast",
    background: "#0d0d10",
    skyTop: "#131316",
    skyBottom: "#2c2c34",
    primary: "#f4f4f6",
    secondary: "#9a9aa6",
    accent: "#ff4d4d",
    waveFill: "#8c8c99",
    waveOpacities: [0.8, 0.4, 0.4, 0.4],
    boatHull: "#ff4d4d", // test-card red
    boatDetail: "#9a9aa6",
  },
} satisfies Record<string, ColorTheme>;

export type ThemeName = keyof typeof THEMES;

export const DEFAULT_THEME_NAME: ThemeName = "humber";
export const DEFAULT_THEME: ColorTheme = THEMES[DEFAULT_THEME_NAME];
