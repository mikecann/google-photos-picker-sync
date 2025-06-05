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
  failed: number;
  currentFile: string | null;
  isComplete: boolean;
  errors: string[];
  files: Array<{ filename: string; size: number; ready: boolean }>;
}

export default function DirectorySelector({
  mediaItems,
  oauthToken,
  sessionId,
  disabled,
}: DirectorySelectorProps) {
  const [selectedDirectory, setSelectedDirectory] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [savedFiles, setSavedFiles] = useState<Set<string>>(new Set());
  const [existingFiles, setExistingFiles] = useState<Set<string>>(new Set());
  const [filteredMediaItems, setFilteredMediaItems] = useState<any[]>([]);
  const [isCheckingFiles, setIsCheckingFiles] = useState(false);

  // Check for existing files when directory is selected
  useEffect(() => {
    if (selectedDirectory) {
      checkExistingFiles();
    }
  }, [selectedDirectory, mediaItems]);

  const checkExistingFiles = async () => {
    if (!selectedDirectory) return;

    setIsCheckingFiles(true);
    setStatus("Checking for existing files...");

    try {
      const existing = new Set<string>();
      const filesToDownload: any[] = [];

      for (const item of mediaItems) {
        const filename = item.mediaFile?.filename;
        if (!filename) continue;

        try {
          // Try to get the file handle - if it exists, this won't throw
          await selectedDirectory.getFileHandle(filename, { create: false });
          existing.add(filename);
        } catch (error) {
          // File doesn't exist, add to download list
          filesToDownload.push(item);
        }
      }

      setExistingFiles(existing);
      setFilteredMediaItems(filesToDownload);

      if (existing.size > 0) {
        setStatus(
          `✅ Directory selected: ${selectedDirectory.name}. Found ${existing.size} existing files, ${filesToDownload.length} new files to download.`
        );
      } else {
        setStatus(
          `✅ Directory selected: ${selectedDirectory.name}. ${filesToDownload.length} files to download.`
        );
      }
    } catch (error) {
      console.error("Error checking existing files:", error);
      setStatus(
        `⚠️ Could not check existing files. All ${mediaItems.length} files will be processed.`
      );
      setFilteredMediaItems(mediaItems);
    } finally {
      setIsCheckingFiles(false);
    }
  };

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
            const existingCount = existingFiles.size;
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
  }, [progressId, isDownloading, selectedDirectory, savedFiles, existingFiles]);

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

  const handleSelectDirectory = async () => {
    try {
      setStatus("Opening directory picker...");
      const directoryHandle = await getDirectoryHandle();

      // Request persistent permission immediately
      try {
        const permission = await directoryHandle.requestPermission({
          mode: "readwrite",
        });
        if (permission !== "granted") {
          setStatus(
            "Permission denied. Please select a directory and allow write access."
          );
          return;
        }
      } catch (error) {
        console.warn("Could not request persistent permissions:", error);
        // Continue anyway, will request per-file permissions
      }

      setSelectedDirectory(directoryHandle);
      // Status will be set by checkExistingFiles
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
    if (!selectedDirectory || !filteredMediaItems.length) {
      if (existingFiles.size === mediaItems.length) {
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
        mediaItems: filteredMediaItems, // Only download new files
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
        `Downloads started! ${filteredMediaItems.length} new files will be saved to your selected directory...`
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
  const totalSelected = mediaItems.length;
  const existingCount = existingFiles.size;
  const newFilesCount = filteredMediaItems.length;

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
          Select where to save your {totalSelected} selected photos
        </p>
      </div>

      {/* File Summary */}
      {selectedDirectory && !isCheckingFiles && (
        <div
          style={{
            textAlign: "center",
            fontSize: "14px",
            padding: "12px",
            backgroundColor: "#f0f8ff",
            borderRadius: "6px",
            border: "1px solid #b3d9ff",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            📊 File Analysis
          </div>
          <div>
            📂 Total selected: {totalSelected} files
            <br />✅ Already exist: {existingCount} files
            <br />
            📥 To download: {newFilesCount} files
          </div>
        </div>
      )}

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
          disabled={disabled || isDownloading || isCheckingFiles}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            color: "white",
            backgroundColor:
              disabled || isDownloading || isCheckingFiles ? "#ccc" : "#ff9800",
            border: "none",
            borderRadius: "8px",
            cursor:
              disabled || isDownloading || isCheckingFiles
                ? "not-allowed"
                : "pointer",
            minWidth: "200px",
          }}
        >
          {isCheckingFiles
            ? "Checking files..."
            : selectedDirectory
            ? `📂 ${selectedDirectory.name}`
            : "📂 Choose Directory"}
        </button>

        {selectedDirectory && !isCheckingFiles && (
          <button
            onClick={handleStartDownload}
            disabled={
              disabled ||
              isDownloading ||
              !selectedDirectory ||
              newFilesCount === 0
            }
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "bold",
              color: "white",
              backgroundColor:
                disabled ||
                isDownloading ||
                !selectedDirectory ||
                newFilesCount === 0
                  ? "#ccc"
                  : "#4caf50",
              border: "none",
              borderRadius: "8px",
              cursor:
                disabled ||
                isDownloading ||
                !selectedDirectory ||
                newFilesCount === 0
                  ? "not-allowed"
                  : "pointer",
              minWidth: "200px",
            }}
          >
            {isDownloading
              ? "Downloading..."
              : newFilesCount === 0
              ? "Nothing to Download"
              : `🚀 Download ${newFilesCount} Files`}
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
