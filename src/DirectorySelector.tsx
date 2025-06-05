import { useState, useEffect } from "react";
import { getDirectoryHandle } from "./FileService";

interface DirectorySelectorProps {
  mediaItems: any[];
  oauthToken: string;
  sessionId: string;
  disabled?: boolean;
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

export default function DirectorySelector({
  mediaItems,
  oauthToken,
  sessionId,
  disabled,
}: DirectorySelectorProps) {
  const [selectedDirectory, setSelectedDirectory] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [directoryPath, setDirectoryPath] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

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
            setStatus(
              `🎉 Download complete! ${progress.downloaded} files downloaded, ${progress.skipped} skipped, ${progress.failed} failed.`
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

  const handleSelectDirectory = async () => {
    try {
      setStatus("Opening directory picker...");
      const directoryHandle = await getDirectoryHandle();
      setSelectedDirectory(directoryHandle);
      setStatus(`Selected directory: ${directoryHandle.name}`);

      // Since the File System Access API doesn't give us full paths for security reasons,
      // we need to ask the user to provide the full path
      const userPath = prompt(
        `Please enter the full path to the selected directory "${directoryHandle.name}":\n\nExample: C:\\Users\\YourName\\Pictures\\${directoryHandle.name}`,
        directoryHandle.name
      );

      if (userPath) {
        setDirectoryPath(userPath);
        setStatus(`✅ Directory ready: ${userPath}`);
      } else {
        setStatus("Full directory path is required to continue.");
        setSelectedDirectory(null);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setStatus("Directory selection cancelled.");
      } else {
        console.error("Directory selection error:", error);
        setStatus(`Error selecting directory: ${error}`);
      }
    }
  };

  const handleStartDownload = async () => {
    if (!directoryPath || !mediaItems.length) {
      setStatus("Please select a directory first.");
      return;
    }

    setIsDownloading(true);
    setStatus("Starting downloads...");
    setDownloadProgress(null);

    try {
      const sessionData = {
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
      setStatus("Downloads started! Check progress below...");
    } catch (error) {
      console.error("Download start error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred starting downloads.";
      setStatus(`Error: ${errorMessage}`);
      setIsDownloading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        padding: "24px",
        border: "2px solid #e0e0e0",
        borderRadius: "12px",
        backgroundColor: "#fafafa",
        maxWidth: "600px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h3 style={{ margin: "0 0 8px 0", color: "#333" }}>
          📁 Step 3: Choose Directory & Download
        </h3>
        <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
          Select where to save your {mediaItems.length} selected photos
        </p>
      </div>

      {/* Directory Selection */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <button
          onClick={handleSelectDirectory}
          disabled={disabled || isDownloading}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            color: "white",
            backgroundColor: disabled || isDownloading ? "#ccc" : "#ff9800",
            border: "none",
            borderRadius: "8px",
            cursor: disabled || isDownloading ? "not-allowed" : "pointer",
            minWidth: "180px",
          }}
        >
          📂 Choose Directory
        </button>

        {selectedDirectory && directoryPath && (
          <button
            onClick={handleStartDownload}
            disabled={disabled || isDownloading || !directoryPath}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "bold",
              color: "white",
              backgroundColor:
                disabled || isDownloading || !directoryPath
                  ? "#ccc"
                  : "#4caf50",
              border: "none",
              borderRadius: "8px",
              cursor:
                disabled || isDownloading || !directoryPath
                  ? "not-allowed"
                  : "pointer",
              minWidth: "180px",
            }}
          >
            {isDownloading ? "Downloading..." : "🚀 Start Download"}
          </button>
        )}
      </div>

      {/* Status */}
      {status && (
        <div
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: status.startsWith("Error")
              ? "#d32f2f"
              : status.startsWith("✅") || status.startsWith("🎉")
              ? "#4caf50"
              : "#666",
            maxWidth: "500px",
            lineHeight: "1.4",
            padding: "8px",
            backgroundColor: status.startsWith("Error")
              ? "#ffebee"
              : status.startsWith("✅") || status.startsWith("🎉")
              ? "#f1f8e9"
              : "transparent",
            borderRadius: "4px",
          }}
        >
          {status}
        </div>
      )}

      {/* Progress Display */}
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
            width: "100%",
            boxSizing: "border-box",
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
