import { beforeEach, describe, expect, it, vi } from "vitest";
import { openRoiEditor, syncRoiOverlayBounds } from "./nativeWindows";

const { invokeMock, currentMonitorMock, availableMonitorsMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  currentMonitorMock: vi.fn(),
  availableMonitorsMock: vi.fn()
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));

vi.mock("@tauri-apps/api/window", () => ({
  currentMonitor: currentMonitorMock,
  availableMonitors: availableMonitorsMock
}));

describe("ROI overlay fallback bounds", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    currentMonitorMock.mockReset();
    availableMonitorsMock.mockReset();
    installWindowViewport();
  });

  it("opens ROI editor using current monitor bounds when scanner status is unavailable", async () => {
    currentMonitorMock.mockResolvedValue({
      position: { x: 100, y: 50 },
      size: { width: 1920, height: 1080 }
    });
    invokeMock.mockResolvedValue(undefined);

    await openRoiEditor(null);

    expect(invokeMock).toHaveBeenNthCalledWith(1, "set_roi_overlay_bounds", {
      rect: { x: 100, y: 50, width: 1920, height: 1080 }
    });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "set_roi_edit_mode", { editing: true });
  });

  it("syncs ROI overlay using browser viewport when monitor APIs are unavailable", async () => {
    currentMonitorMock.mockRejectedValue(new Error("no monitor"));
    availableMonitorsMock.mockResolvedValue([]);
    invokeMock.mockResolvedValue(undefined);

    await syncRoiOverlayBounds(null);

    expect(invokeMock).toHaveBeenCalledWith("set_roi_overlay_bounds", {
      rect: { x: 30, y: 40, width: 1440, height: 900 }
    });
  });
});

function installWindowViewport() {
  globalThis.window = {
    screenX: 30,
    screenY: 40,
    innerWidth: 1440,
    innerHeight: 900
  } as unknown as Window & typeof globalThis;
}
