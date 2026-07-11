import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME_NAME,
  THEMES,
  type ColorTheme,
  type ThemeName,
} from "./themes";

interface ThemeContextValue {
  theme: ColorTheme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "loone-loop-studio:theme:v1";

/** Restore the saved theme, ignoring an unknown/renamed key. */
function loadThemeName(): ThemeName {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && stored in THEMES) return stored as ThemeName;
  } catch {
    // storage unavailable — fall through to the default
  }
  return DEFAULT_THEME_NAME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(loadThemeName);
  const theme = THEMES[themeName];

  // Persist the selected theme so it survives a reload.
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch {
      // best-effort — ignore private-mode / quota errors
    }
  }, [themeName]);

  // Mirror tokens into CSS variables so the DOM overlays restyle in lockstep
  // with the canvas when the theme shifts.
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--theme-bg", theme.background);
    root.setProperty("--theme-primary", theme.primary);
    root.setProperty("--theme-secondary", theme.secondary);
    root.setProperty("--theme-accent", theme.accent);
    root.setProperty("--theme-wave", theme.waveFill);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, themeName, setThemeName }),
    [theme, themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
