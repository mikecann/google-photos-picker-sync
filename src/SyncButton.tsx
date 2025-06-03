import { useState } from "react";
import { useAuth } from "./GoogleAuthProvider";
import {
  createPickerSession,
  pollSession,
  fetchPickedMediaItems,
} from "./PickerService";
import { getDirectoryHandle } from "./FileService";

interface DownloadableItem {
  filename: string;
  downloadUrl: string;
  mimeType: string;
  id: string;
}

export default function SyncButton() {
  const { oauthToken } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState("");
  const [downloadLinks, setDownloadLinks] = useState<DownloadableItem[]>([]);

  const handleSync = async () => {
    console.log("🚀 Starting sync process...");

    if (!oauthToken) {
      console.log("❌ No OAuth token found");
      setProgress("Please sign in first");
      return;
    }

    setIsSyncing(true);
    setDownloadLinks([]);
    setProgress("Please select a folder to compare against...");
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

      // Let's examine the structure more closely
      if (mediaItems && mediaItems.length > 0) {
        console.log(
          "🔍 Detailed structure of first media item:",
          JSON.stringify(mediaItems[0], null, 2)
        );
        if (mediaItems[0].mediaFile) {
          console.log(
            "📁 MediaFile object:",
            JSON.stringify(mediaItems[0].mediaFile, null, 2)
          );
        }
      }

      if (!mediaItems || mediaItems.length === 0) {
        console.log("❌ No media items were selected");
        setProgress("No media items were selected.");
        setIsSyncing(false);
        return;
      }

      // Step 6: Analyze what's already in the directory
      setProgress("Analyzing existing files in directory...");
      console.log("🔍 Analyzing existing files in selected directory...");

      const existingFiles = new Set<string>();
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === "file") {
          existingFiles.add(name);
          console.log("📄 Found existing file:", name);
        }
      }
      console.log("📊 Total existing files:", existingFiles.size);

      // Step 7: Create download links for new files
      const newItems: DownloadableItem[] = [];
      let existing = 0;
      let failed = 0;

      console.log("🔄 Processing items for download links...");
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        const { mediaFile, id } = item;

        console.log(`\n📋 Processing item ${i + 1}/${mediaItems.length}:`, {
          filename: mediaFile?.filename,
          id,
          hasBaseUrl: !!mediaFile?.baseUrl,
          mimeType: mediaFile?.mimeType,
        });

        if (!mediaFile?.filename || !mediaFile?.baseUrl) {
          console.warn("⚠️ Skipping item missing filename or baseUrl:", item);
          failed++;
          continue;
        }

        const { filename, baseUrl, mimeType } = mediaFile;

        // Check if file already exists
        const fileExists = existingFiles.has(filename);
        console.log(`🔍 File exists check for "${filename}":`, fileExists);

        if (fileExists) {
          console.log(`⏭️ Skipping "${filename}" - already exists`);
          existing++;
          continue;
        }

        // Create authenticated download URL
        const downloadUrl = `${baseUrl}=d`;
        console.log(`🔗 Created download link for "${filename}"`);

        newItems.push({
          filename,
          downloadUrl,
          mimeType: mimeType || "application/octet-stream",
          id,
        });
      }

      // Final summary
      console.log("\n📊 Analysis Summary:", {
        totalSelected: mediaItems.length,
        newFiles: newItems.length,
        existing,
        failed,
        existingFilesInDirectory: existingFiles.size,
      });

      setDownloadLinks(newItems);

      const message =
        newItems.length > 0
          ? `Found ${newItems.length} new files to download${
              existing > 0 ? ` (${existing} already exist)` : ""
            }${failed > 0 ? ` (${failed} failed to process)` : ""}.`
          : existing > 0
          ? `All ${existing} selected files already exist in the folder.`
          : failed > 0
          ? `${failed} files failed to process.`
          : "No files available for download.";

      console.log("🎉 Final result:", message);
      setProgress(message);
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

  const handleDownload = async (item: DownloadableItem) => {
    console.log(`⬇️ Starting download for "${item.filename}"...`);

    try {
      // Create an authenticated fetch request
      const response = await fetch(item.downloadUrl, {
        headers: {
          Authorization: `Bearer ${oauthToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log(`✅ Downloaded "${item.filename}":`, {
        size: blob.size,
        type: blob.type,
      });

      // Create a download link and trigger it
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`💾 Triggered download for "${item.filename}"`);
    } catch (error) {
      console.error(`❌ Failed to download "${item.filename}":`, error);
      alert(
        `Failed to download ${item.filename}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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

      {downloadLinks.length > 0 && (
        <div style={{ width: "100%", marginTop: "16px" }}>
          <h3 style={{ textAlign: "center", marginBottom: "12px" }}>
            📥 New Files to Download ({downloadLinks.length})
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "300px",
              overflowY: "auto",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            {downloadLinks.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px",
                  border: "1px solid #eee",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: "bold" }}>{item.filename}</div>
                  <div style={{ color: "#666", fontSize: "12px" }}>
                    {item.mimeType}
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(item)}
                  style={{
                    marginLeft: "12px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: "#666",
              marginTop: "8px",
            }}
          >
            Click individual download buttons to save files to your default
            downloads folder
          </div>
        </div>
      )}
    </div>
  );
}
