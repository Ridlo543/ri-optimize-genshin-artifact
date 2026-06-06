import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __RI_REPO_ROOT__: JSON.stringify("")
  },
  test: {
    exclude: [...defaultExclude, "e2e/**"]
  }
});
