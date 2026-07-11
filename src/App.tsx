import { Navigate, Route, Routes } from "react-router-dom";
import ConfigPage from "./pages/ConfigPage";
import RenderPage from "./pages/RenderPage";
import { ThemeProvider } from "./theme/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<ConfigPage />} />
        <Route path="/config" element={<Navigate to="/" replace />} />
        <Route path="/render" element={<RenderPage />} />
      </Routes>
    </ThemeProvider>
  );
}
