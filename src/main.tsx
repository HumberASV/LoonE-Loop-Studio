import "./p5-global"; // must precede any p5 plugin import
import "./anim/capture"; // loads p5.capture + sets default export options
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

// No StrictMode on purpose: its dev double-mount would create two p5
// instances back-to-back and fire the frame-1 auto-capture twice.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
