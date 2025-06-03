import { useState } from "react";
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

export default function SyncButton() {
  const { oauthToken } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState("");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  const handleSync = async () => {
    console.log("🚀 Starting sync process...");

    if (!oauthToken) {
      console.log("❌ No OAuth token found");
      setProgress("Please sign in first");
      return;
    }

    setIsSyncing(true);
    setSessionData(null);
    setProgress("Please select a folder to sync to...");
    console.log("📁 Requesting directory selection from user...");

    try {
      // Step 1: Get directory handle while we still have user gesture
      const dir = await getDirectoryHandle();
      console.log("✅ Directory selected:", dir.name);

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

      // Step 6: Create session data for Bun script
      const sessionDataToExport: SessionData = {
        oauthToken,
        sessionId,
        mediaItems,
        selectedDirectoryPath: dir.name, // This is just the name, script will ask for full path
        timestamp: new Date().toISOString(),
      };

      setSessionData(sessionDataToExport);
      console.log("✅ Session data prepared for export");

      setProgress(
        `Ready to download ${mediaItems.length} files! Click "Download Session Data" and run the Bun script.`
      );
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

  const downloadSessionData = () => {
    if (!sessionData) return;

    const dataStr = JSON.stringify(sessionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `google-photos-session-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log("📄 Session data downloaded");
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

      {sessionData && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            padding: "16px",
            border: "2px solid #4CAF50",
            borderRadius: "8px",
            backgroundColor: "#f9fff9",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
              ✅ Ready for Bulk Download!
            </div>
            <div style={{ fontSize: "14px", color: "#666" }}>
              Selected {sessionData.mediaItems.length} files from Google Photos
            </div>
          </div>

          <button
            onClick={downloadSessionData}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            📄 Download Session Data
          </button>

          <div
            style={{
              fontSize: "12px",
              color: "#666",
              textAlign: "center",
              lineHeight: "1.4",
            }}
          >
            Download the session file, then run:
            <br />
            <code
              style={{
                backgroundColor: "#f5f5f5",
                padding: "2px 4px",
                borderRadius: "3px",
                fontFamily: "monospace",
              }}
            >
              bun run sync-photos.ts [session-file.json] [target-directory]
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
