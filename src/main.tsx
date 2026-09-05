import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/press-start-2p/latin-400.css";
import "@fontsource-variable/pixelify-sans";
import "@fontsource-variable/space-grotesk";
import "./index.css";
import "./expansion.css";
import "./mastery.css";
import "./portals.css";
import "./together.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
