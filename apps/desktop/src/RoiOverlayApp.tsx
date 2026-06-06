import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { lockRoiEditor, syncRoiOverlayBounds } from "./nativeWindows";
import { scannerStatus, ScannerStatus } from "./scanner";
import { RoiEditor } from "./RoiEditor";
import { loadScanRegion, saveScanRegion } from "./roi";

export function RoiOverlayApp() {
  const [region, setRegion] = useState(loadScanRegion);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<ScannerStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    saveScanRegion(region);
  }, [region]);

  useEffect(() => {
    let ignore = false;

    async function syncWindow() {
      try {
        const next = await scannerStatus();
        if (ignore) {
          return;
        }
        setStatus(next);

        if (next.available) {
          await syncRoiOverlayBounds(next);
          setError("");
        } else if (editing) {
          await lockRoiEditor();
          setEditing(false);
          setError(next.error ?? "Genshin is no longer available.");
        }
      } catch (caught) {
        if (!ignore) {
          const message = caught instanceof Error ? caught.message : "Waiting for native scanner.";
          setStatus({ available: false, error: message });
          setError(message);
        }
      }
    }

    void syncWindow();
    const id = window.setInterval(() => void syncWindow(), 1000);
    return () => {
      ignore = true;
      window.clearInterval(id);
    };
  }, [editing]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<boolean>("roi-edit-mode", (event) => {
      setEditing(event.payload);
      if (event.payload) {
        setRegion(loadScanRegion());
      }
    }).then((cleanup) => {
      unlisten = cleanup;
    }).catch(() => undefined);
    return () => unlisten?.();
  }, []);

  async function lockRoi() {
    try {
      await lockRoiEditor();
      setEditing(false);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to lock ROI.");
    }
  }

  return (
    <div className={`roi-overlay roi-overlay--${editing ? "editing" : "locked"} roi-overlay--${status?.available ? "available" : "unavailable"} roi-overlay--visible`}>
      <RoiEditor region={region} editing={editing} onRegionChange={setRegion} />

      {editing ? (
        <div className="roi-toolbar">
          <span>{error || (status?.available ? status.resolution : "Waiting for Genshin")}</span>
          <button onClick={() => void lockRoi()}>Lock ROI</button>
        </div>
      ) : null}
    </div>
  );
}
