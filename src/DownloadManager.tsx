import { useState, useEffect } from "react";

interface DownloadManagerProps {
  mediaItems: any[];
  oauthToken: string;
  sessionId: string;
  selectedDirectory: FileSystemDirectoryHandle;
  existingCount: number;
  disabled?: boolean;
}

interface DownloadProgress {
  total: number;
  downloaded: number;
  failed: number;
  currentFile: string | null;
  isComplete: boolean;
  errors: string[];
  files: Array<{ filename: string; size: number; ready: boolean }>;
}

export default function DownloadManager({
  mediaItems,
  oauthToken,
  sessionId,
  selectedDirectory,
  existingCount,
  disabled,
}: DownloadManagerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [savedFiles, setSavedFiles] = useState<Set<string>>(new Set());

  // Poll for download progress and save files
  useEffect(() => {
    if (!progressId || !isDownloading || !selectedDirectory) return;

    const pollProgressAndSave = async () => {
      try {
        const response = await fetch(`/api/progress?id=${progressId}`);
        if (response.ok) {
          const progress = await response.json();
          setDownloadProgress(progress);

          // Save any ready files that haven't been saved yet
          for (const fileInfo of progress.files) {
            if (fileInfo.ready && !savedFiles.has(fileInfo.filename)) {
              await saveFileToDirectory(fileInfo.filename);
            }
          }

          if (progress.isComplete) {
            setIsDownloading(false);
            const savedCount = savedFiles.size;
            const totalFiles = savedCount + existingCount;
            setStatus(
              `🎉 Download complete! ${savedCount} new files saved, ${existingCount} files already existed. Total: ${totalFiles} files in your directory.`
            );

            // Cleanup server-side temporary files
            try {
              await fetch("/api/cleanup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ progressId }),
              });
            } catch (error) {
              console.warn("Failed to cleanup temporary files:", error);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch progress:", error);
      }
    };

    const interval = setInterval(pollProgressAndSave, 1000);
    return () => clearInterval(interval);
  }, [progressId, isDownloading, selectedDirectory, savedFiles, existingCount]);

  const saveFileToDirectory = async (filename: string) => {
    if (!selectedDirectory || !progressId) return;

    try {
      // Download file from server
      const response = await fetch(
        `/api/file?progressId=${progressId}&filename=${encodeURIComponent(
          filename
        )}`
      );
      if (!response.ok) throw new Error("Failed to fetch file from server");

      // Get file data
      const arrayBuffer = await response.arrayBuffer();

      // Request permission for this specific file if needed
      const permission = await selectedDirectory.requestPermission({
        mode: "readwrite",
      });
      if (permission !== "granted") {
        throw new Error("Permission denied to write to directory");
      }

      // Create file in selected directory
      const fileHandle = await selectedDirectory.getFileHandle(filename, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(arrayBuffer);
      await writable.close();

      setSavedFiles((prev) => new Set([...prev, filename]));
    } catch (error) {
      console.error(`Failed to save ${filename}:`, error);
      setStatus(`Error saving ${filename}: ${error}`);
    }
  };

  const handleStartDownload = async () => {
    if (!selectedDirectory || !mediaItems.length) {
      if (mediaItems.length === 0) {
        setStatus(
          "All files already exist in the selected directory. Nothing to download!"
        );
      } else {
        setStatus("Please select a directory first.");
      }
      return;
    }

    setIsDownloading(true);
    setStatus("Starting downloads...");
    setDownloadProgress(null);
    setSavedFiles(new Set());

    try {
      const sessionData = {
        oauthToken,
        sessionId,
        mediaItems: mediaItems, // Only download new files (already filtered)
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
      setStatus(
        `Downloads started! ${mediaItems.length} files will be saved to ${selectedDirectory.name}...`
      );
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

  const savedCount = savedFiles.size;
  const newFilesCount = mediaItems.length;

  // Determine button text and state
  const getButtonText = () => {
    if (isDownloading) return "Downloading...";
    if (newFilesCount === 0) return "Nothing to Download";
    if (downloadProgress?.isComplete) return "✅ Download Complete";
    return `🚀 Download ${newFilesCount} Files`;
  };

  const isButtonDisabled =
    disabled ||
    isDownloading ||
    newFilesCount === 0 ||
    downloadProgress?.isComplete;

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
          🚀 Step 4: Download
        </h3>
        <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
          {newFilesCount === 0
            ? "All files already exist in your directory"
            : `Download ${newFilesCount} files to ${selectedDirectory.name}`}
        </p>
      </div>

      {/* Download Button */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <button
          onClick={handleStartDownload}
          disabled={isButtonDisabled}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            color: "white",
            backgroundColor: isButtonDisabled ? "#ccc" : "#4caf50",
            border: "none",
            borderRadius: "8px",
            cursor: isButtonDisabled ? "not-allowed" : "pointer",
            minWidth: "200px",
          }}
        >
          {getButtonText()}
        </button>
      </div>

      {/* Status */}
      {status && (
        <div
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: status.startsWith("Error")
              ? "#d32f2f"
              : status.startsWith("🎉")
              ? "#4caf50"
              : "#666",
            maxWidth: "500px",
            lineHeight: "1.4",
            padding: "8px",
            backgroundColor: status.startsWith("Error")
              ? "#ffebee"
              : status.startsWith("🎉")
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
              {savedCount} of {downloadProgress.total} new files saved to
              directory
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
                  downloadProgress.total > 0
                    ? (savedCount / downloadProgress.total) * 100
                    : 0
                }%`,
                backgroundColor: "#4CAF50",
                height: "100%",
                borderRadius: "4px",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <div style={{ fontSize: "12px", color: "#666", textAlign: "center" }}>
            📁 Saved: {savedCount} • ⬇️ Downloaded:{" "}
            {downloadProgress.downloaded} • ❌ Failed: {downloadProgress.failed}
            {existingCount > 0 && (
              <>
                <br />
                ⏭️ Already existed: {existingCount}
              </>
            )}
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
                color: "#4caf50",
                fontWeight: "bold",
              }}
            >
              🎉 All new files saved to your directory!
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
