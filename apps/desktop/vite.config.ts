import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;
const server = {
  port: 5173,
  strictPort: true,
  host: host || false,
  watch: {
    ignored: ["**/src-tauri/**"]
  },
  ...(host
    ? {
        hmr: {
          protocol: "ws" as const,
          host,
          port: 1421
        }
      }
    : {})
};

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server,
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG)
  }
});
