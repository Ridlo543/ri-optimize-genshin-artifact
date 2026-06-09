import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { lockRoiEditor, syncRoiOverlayBounds } from "./nativeWindows";
import { scannerStatus, ScannerStatus } from "./scanner";
import { RoiEditor } from "./RoiEditor";
import { loadRoiEditingState, loadScanRegion, saveRoiEditingState, saveScanRegion } from "./roi";
import { useRef } from "react";

export function RoiOverlayApp() {
  const [region, setRegion] = useState(loadScanRegion);
  const [editing, setEditing] = useState(loadRoiEditingState);
  const [status, setStatus] = useState<ScannerStatus | null>(null);
  const [error, setError] = useState("");
  const statusPollingRef = useRef(false);

  useEffect(() => {
    saveScanRegion(region);
  }, [region]);

  useEffect(() => {
    saveRoiEditingState(editing);
  }, [editing]);

  useEffect(() => {
    let ignore = false;

    async function syncWindow() {
      if (statusPollingRef.current) {
        return;
      }
      statusPollingRef.current = true;
      try {
        const next = await scannerStatus();
        if (ignore) {
          return;
        }
        setStatus(next);
        await syncRoiOverlayBounds(next);
        setError(next.available ? "" : next.error ?? "Live scanner unavailable. ROI test mode is still available.");
      } catch (caught) {
        if (!ignore) {
          const message = caught instanceof Error ? caught.message : "Waiting for native scanner.";
          setStatus({ available: false, error: message });
          setError(editing ? "Live scanner unavailable. ROI test mode is still available." : message);
        }
      } finally {
        statusPollingRef.current = false;
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
      saveRoiEditingState(false);
      await lockRoiEditor();
      setEditing(false);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to lock ROI.");
    }
  }

  return (
    <div className={`roi-overlay roi-overlay--${editing ? "editing" : "locked"} roi-overlay--${status?.available ? "available" : "unavailable"} roi-overlay--visible`}>
      <RoiEditor region={region} editing={editing} onRegionChange={setRegion} onLockRoi={lockRoi} />

      <div className="roi-statusbar">
        <span className="roi-statusbar__text" role="status">
          {editing
            ? "Drag edges to resize · Drag center to move · Confirm below"
            : error || (status?.available ? `${status.resolution} · Red box = OCR capture area` : status?.resolution ?? "ROI test mode · Red box = OCR capture area")}
        </span>
      </div>
    </div>
  );
}
