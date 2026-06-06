import { fileURLToPath } from "node:url";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const server = {
  port: 5173,
  strictPort: true,
  host: host || false,
  fs: {
    allow: [searchForWorkspaceRoot(process.cwd()), repoRoot]
  },
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
  define: {
    __RI_REPO_ROOT__: JSON.stringify(repoRoot)
  },
  server,
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG)
  }
});
