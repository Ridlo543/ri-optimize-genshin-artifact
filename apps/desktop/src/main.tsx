import React from "react";
import { createRoot } from "react-dom/client";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AssistantBubbleApp } from "./AssistantBubbleApp";
import { App } from "./App";
import { FixturePlaygroundApp } from "./FixturePlaygroundApp";
import { RoiOverlayApp } from "./RoiOverlayApp";
import { resolveWindowMode } from "./windowMode";
import "./styles.css";

const windowMode = resolveWindowMode(window.location.search, isTauri() ? getCurrentWindow().label : null);
document.documentElement.dataset.window = windowMode;
document.body.dataset.window = windowMode;

const Root =
  windowMode === "roi-overlay"
    ? RoiOverlayApp
    : windowMode === "assistant-bubble"
      ? AssistantBubbleApp
      : windowMode === "fixture-playground"
        ? FixturePlaygroundApp
        : App;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
