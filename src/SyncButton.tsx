import { useState } from "react";
import { useAuth } from "./GoogleAuthProvider";
import { launchPicker, fetchMediaItems } from "./PickerService";
import { getDirectoryHandle, fileExists } from "./FileService";

export default function SyncButton() {
  const { oauthToken } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState("");

  const handleSync = async () => {
    if (!oauthToken) return;
    setIsSyncing(true);
    setProgress("Launching picker...");
    try {
      const sessionId = await launchPicker({ oauthToken });
      if (!sessionId) {
        setProgress("No session started");
        setIsSyncing(false);
        return;
      }
      setProgress("Waiting for user to pick media...");
      // In a real app, you'd listen for the picker window to close and then fetch
      // For now, just prompt for sessionId
      const userSessionId = window.prompt(
        "Enter sessionId after picking media:",
        sessionId
      );
      if (!userSessionId) {
        setProgress("No sessionId provided");
        setIsSyncing(false);
        return;
      }
      setProgress("Fetching media items...");
      const mediaItems = await fetchMediaItems({
        oauthToken,
        sessionId: userSessionId,
      });
      setProgress(`Found ${mediaItems.length} items. Picking folder...`);
      const dir = await getDirectoryHandle();
      let downloaded = 0;
      for (const item of mediaItems) {
        const { filename, baseUrl } = item;
        const exists = await fileExists(dir, filename);
        if (exists) continue;
        setProgress(
          `Downloading ${filename}... (${++downloaded}/${mediaItems.length})`
        );
        const downloadUrl = `${baseUrl}=d`;
        const blob = await fetch(downloadUrl).then((res) => res.blob());
        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      }
      setProgress(`Downloaded ${downloaded} new files.`);
    } catch (e: any) {
      setProgress(`Error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <button onClick={handleSync} disabled={isSyncing || !oauthToken}>
        {isSyncing ? "Syncing..." : "Sync Album"}
      </button>
      {progress && <div style={{ marginTop: 8 }}>{progress}</div>}
    </>
  );
}
