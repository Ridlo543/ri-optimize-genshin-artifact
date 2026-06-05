import React from "react";
import { createRoot } from "react-dom/client";
import { AssistantBubbleApp } from "./AssistantBubbleApp";
import { App } from "./App";
import { RoiOverlayApp } from "./RoiOverlayApp";
import "./styles.css";

const windowMode = new URLSearchParams(window.location.search).get("window") ?? "main";
document.body.dataset.window = windowMode;

const Root = windowMode === "roi-overlay" ? RoiOverlayApp : windowMode === "assistant-bubble" ? AssistantBubbleApp : App;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
