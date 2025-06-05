import { useState, useEffect } from "react";
import { useAuth } from "./GoogleAuthProvider";
import {
  createPickerSession,
  pollSession,
  fetchPickedMediaItems,
} from "./PickerService";
import { getDirectoryHandle } from "./FileService";

interface SessionData {
  oauthToken: string;
  sessionId: string;
  mediaItems: any[];
  selectedDirectoryPath: string;
  timestamp: string;
}

interface DownloadProgress {
  total: number;
  downloaded: number;
  skipped: number;
  failed: number;
  currentFile: string | null;
  isComplete: boolean;
  errors: string[];
}

export default function SyncButton() {
  const { oauthToken } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [progressId, setProgressId] = useState<string | null>(null);

  // Poll for download progress
  useEffect(() => {
    if (!progressId || !isDownloading) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/progress?id=${progressId}`);
        if (response.ok) {
          const progress = await response.json();
          setDownloadProgress(progress);

          if (progress.isComplete) {
            setIsDownloading(false);
            setProgress(
              `Download complete! ${progress.downloaded} files downloaded, ${progress.skipped} skipped, ${progress.failed} failed.`
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch progress:", error);
      }
    };

    const interval = setInterval(pollProgress, 1000);
    return () => clearInterval(interval);
  }, [progressId, isDownloading]);

  const handleSync = async () => {
    console.log("🚀 Starting sync process...");

    if (!oauthToken) {
      console.log("❌ No OAuth token found");
      setProgress("Please sign in first");
      return;
    }

    setIsSyncing(true);
    setDownloadProgress(null);
    setProgressId(null);
    setProgress("Please select a folder to sync to...");
    console.log("📁 Requesting directory selection from user...");

    try {
      // Step 1: Get directory handle while we still have user gesture
      const dir = await getDirectoryHandle();
      console.log("✅ Directory selected:", dir.name);

      // Get the full directory path from the handle
      let directoryPath = dir.name;

      // Try to get a more complete path if possible
      // Note: For security reasons, browsers don't give full paths
      // But we can ask the user for it
      const userPath = prompt(
        `Please enter the full path to the selected directory "${dir.name}":\n\nExample: C:\\Users\\YourName\\Pictures\\GooglePhotos`,
        directoryPath
      );

      if (!userPath) {
        setProgress("Directory path required to continue.");
        setIsSyncing(false);
        return;
      }

      directoryPath = userPath;

      // Step 2: Create a picker session
      setProgress("Creating picker session...");
      console.log("🔄 Creating picker session...");
      const { pickerUri, sessionId } = await createPickerSession({
        oauthToken,
      });
      console.log("✅ Picker session created:", { sessionId, pickerUri });

      // Step 3: Open the picker for the user
      setProgress(
        "Opening Google Photos Picker... Please select your photos and close the picker window when done."
      );
      console.log("🖼️ Opening picker window...");
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
      console.log("✅ Picker window opened successfully");

      // Step 4: Poll the session to check if user has finished selecting
      setProgress("Waiting for you to finish selecting photos...");
      console.log("⏳ Starting to poll session for completion...");
      const mediaItemsSet = await pollSession({ oauthToken, sessionId });
      console.log("🔍 Polling result:", { mediaItemsSet });

      if (!mediaItemsSet) {
        console.log("❌ Selection timed out or was cancelled");
        setProgress("Selection timed out or was cancelled.");
        setIsSyncing(false);
        return;
      }

      // Step 5: Fetch the selected media items
      setProgress("Fetching selected media items...");
      console.log("📥 Fetching selected media items...");
      const mediaItems = await fetchPickedMediaItems({ oauthToken, sessionId });
      console.log("✅ Media items fetched:", {
        count: mediaItems?.length,
        items: mediaItems,
      });

      if (!mediaItems || mediaItems.length === 0) {
        console.log("❌ No media items were selected");
        setProgress("No media items were selected.");
        setIsSyncing(false);
        return;
      }

      // Step 6: Send session data to server and start downloads
      setProgress("Starting downloads...");
      const sessionData: SessionData = {
        oauthToken,
        sessionId,
        mediaItems,
        selectedDirectoryPath: directoryPath,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start download");
      }

      const result = await response.json();
      setProgressId(result.progressId);
      setIsDownloading(true);
      setProgress("Downloads started! Check progress below...");
      console.log("✅ Downloads started with progress ID:", result.progressId);
    } catch (error) {
      console.error("💥 Sync error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during sync.";
      setProgress(`Error: ${errorMessage}`);
    } finally {
      console.log("🏁 Sync process completed");
      setIsSyncing(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        maxWidth: "600px",
      }}
    >
      <button
        onClick={handleSync}
        disabled={isSyncing || !oauthToken || isDownloading}
        style={{
          minWidth: "120px",
          opacity: isSyncing || !oauthToken || isDownloading ? 0.6 : 1,
          cursor:
            isSyncing || !oauthToken || isDownloading
              ? "not-allowed"
              : "pointer",
        }}
      >
        {isSyncing
          ? "Syncing..."
          : isDownloading
          ? "Downloading..."
          : "Sync Photos"}
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

      {downloadProgress && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "16px",
            border: "2px solid #4CAF50",
            borderRadius: "8px",
            backgroundColor: "#f9fff9",
            minWidth: "400px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
              📥 Download Progress
            </div>
            <div style={{ fontSize: "14px", color: "#666" }}>
              {downloadProgress.downloaded + downloadProgress.skipped} of{" "}
              {downloadProgress.total} files processed
            </div>
          </div>

          <div
            style={{
              width: "100%",
              backgroundColor: "#e0e0e0",
              borderRadius: "4px",
              height: "20px",
            }}
          >
            <div
              style={{
                width: `${
                  ((downloadProgress.downloaded + downloadProgress.skipped) /
                    downloadProgress.total) *
                  100
                }%`,
                backgroundColor: "#4CAF50",
                height: "100%",
                borderRadius: "4px",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <div style={{ fontSize: "12px", color: "#666", textAlign: "center" }}>
            ✅ Downloaded: {downloadProgress.downloaded} • ⏭️ Skipped:{" "}
            {downloadProgress.skipped} • ❌ Failed: {downloadProgress.failed}
          </div>

          {downloadProgress.currentFile && (
            <div
              style={{ fontSize: "12px", color: "#666", textAlign: "center" }}
            >
              Currently downloading: {downloadProgress.currentFile}
            </div>
          )}

          {downloadProgress.isComplete && (
            <div
              style={{
                textAlign: "center",
                color: "#4CAF50",
                fontWeight: "bold",
              }}
            >
              🎉 All downloads completed!
            </div>
          )}

          {downloadProgress.errors.length > 0 && (
            <details style={{ fontSize: "12px" }}>
              <summary style={{ cursor: "pointer", color: "#d32f2f" }}>
                ⚠️ Show {downloadProgress.errors.length} error(s)
              </summary>
              <div style={{ marginTop: "8px", color: "#d32f2f" }}>
                {downloadProgress.errors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
