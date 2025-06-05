import { useState, useEffect } from "react";
import { getDirectoryHandle } from "./FileService";

interface DirectorySelectorProps {
  mediaItems: any[];
  disabled?: boolean;
  onDirectorySelected: (
    directory: FileSystemDirectoryHandle,
    filteredItems: any[],
    existingCount: number
  ) => void;
}

export default function DirectorySelector({
  mediaItems,
  disabled,
  onDirectorySelected,
}: DirectorySelectorProps) {
  const [selectedDirectory, setSelectedDirectory] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [status, setStatus] = useState("");
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

      // Notify parent component
      onDirectorySelected(selectedDirectory, filesToDownload, existing.size);
    } catch (error) {
      console.error("Error checking existing files:", error);
      setStatus(
        `⚠️ Could not check existing files. All ${mediaItems.length} files will be processed.`
      );
      setFilteredMediaItems(mediaItems);
      onDirectorySelected(selectedDirectory, mediaItems, 0);
    } finally {
      setIsCheckingFiles(false);
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
          📁 Step 3: Choose Directory
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
          disabled={disabled || isCheckingFiles}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            color: "white",
            backgroundColor: disabled || isCheckingFiles ? "#ccc" : "#ff9800",
            border: "none",
            borderRadius: "8px",
            cursor: disabled || isCheckingFiles ? "not-allowed" : "pointer",
            minWidth: "200px",
          }}
        >
          {isCheckingFiles
            ? "Checking files..."
            : selectedDirectory
            ? `📂 ${selectedDirectory.name}`
            : "📂 Choose Directory"}
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
              : status.startsWith("✅")
              ? "#4caf50"
              : "#666",
            maxWidth: "500px",
            lineHeight: "1.4",
            padding: "8px",
            backgroundColor: status.startsWith("Error")
              ? "#ffebee"
              : status.startsWith("✅")
              ? "#f1f8e9"
              : "transparent",
            borderRadius: "4px",
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}
