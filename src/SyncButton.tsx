import { useState } from "react";
import { useAuth } from "./GoogleAuthProvider";
import {
  createPickerSession,
  pollSession,
  fetchPickedMediaItems,
} from "./PickerService";
import { getDirectoryHandle, fileExists } from "./FileService";

export default function SyncButton() {
  const { oauthToken } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState("");

  const handleSync = async () => {
    if (!oauthToken) {
      setProgress("Please sign in first");
      return;
    }

    setIsSyncing(true);
    setProgress("Creating picker session...");

    try {
      // Step 1: Create a picker session
      const { pickerUri, sessionId } = await createPickerSession({
        oauthToken,
      });

      // Step 2: Open the picker for the user
      setProgress(
        "Opening Google Photos Picker... Please select your photos and close the picker window when done."
      );
      const pickerWindow = window.open(
        pickerUri,
        "_blank",
        "width=800,height=600,scrollbars=yes,resizable=yes"
      );

      if (!pickerWindow) {
        throw new Error(
          "Failed to open picker window. Please allow popups and try again."
        );
      }

      // Step 3: Poll the session to check if user has finished selecting
      setProgress("Waiting for you to finish selecting photos...");
      const mediaItemsSet = await pollSession({ oauthToken, sessionId });

      if (!mediaItemsSet) {
        setProgress("Selection timed out or was cancelled.");
        setIsSyncing(false);
        return;
      }

      // Step 4: Fetch the selected media items
      setProgress("Fetching selected media items...");
      const mediaItems = await fetchPickedMediaItems({ oauthToken, sessionId });

      if (!mediaItems || mediaItems.length === 0) {
        setProgress("No media items were selected.");
        setIsSyncing(false);
        return;
      }

      // Step 5: Download the selected items
      setProgress(
        `Found ${mediaItems.length} items. Please select a folder to save them...`
      );
      const dir = await getDirectoryHandle();

      let downloaded = 0;
      let skipped = 0;

      for (const item of mediaItems) {
        const { filename, baseUrl } = item;

        if (!filename || !baseUrl) {
          console.warn("Skipping item missing filename or baseUrl:", item);
          continue;
        }

        const exists = await fileExists(dir, filename);
        if (exists) {
          skipped++;
          continue;
        }

        setProgress(
          `Downloading ${filename}... (${downloaded + 1}/${
            mediaItems.length - skipped
          })`
        );

        // Download the media item
        const downloadUrl = `${baseUrl}=d`;
        const response = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${oauthToken}` },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to download ${filename}: ${response.statusText}`
          );
        }

        const blob = await response.blob();
        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        downloaded++;
      }

      const message =
        downloaded > 0
          ? `Successfully downloaded ${downloaded} new files${
              skipped > 0 ? ` (${skipped} already existed)` : ""
            }.`
          : skipped > 0
          ? `All ${skipped} selected files already exist in the folder.`
          : "No files were downloaded.";

      setProgress(message);
    } catch (error) {
      console.error("Sync error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during sync.";
      setProgress(`Error: ${errorMessage}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <button
        onClick={handleSync}
        disabled={isSyncing || !oauthToken}
        style={{
          minWidth: "120px",
          opacity: isSyncing || !oauthToken ? 0.6 : 1,
          cursor: isSyncing || !oauthToken ? "not-allowed" : "pointer",
        }}
      >
        {isSyncing ? "Syncing..." : "Sync Photos"}
      </button>
      {progress && (
        <div
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "#666",
            maxWidth: "400px",
            lineHeight: "1.4",
          }}
        >
          {progress}
        </div>
      )}
    </div>
  );
}
