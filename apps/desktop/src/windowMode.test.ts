import { describe, expect, it } from "vitest";
import { resolveWindowMode } from "./windowMode";

describe("resolveWindowMode", () => {
  it("prefers the native Tauri window label over the query string", () => {
    expect(resolveWindowMode("?window=main", "assistant-bubble")).toBe("assistant-bubble");
  });

  it("uses the query string for browser fixture previews", () => {
    expect(resolveWindowMode("?window=fixture-playground")).toBe("fixture-playground");
  });

  it("falls back to main for unknown modes", () => {
    expect(resolveWindowMode("?window=unknown")).toBe("main");
  });
});
