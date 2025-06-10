import { useState } from "react";
import type { DownloadSettings, MediaItem } from "./types";

interface DownloadSettingsProps {
  mediaItems: MediaItem[];
  originalMediaItems: MediaItem[];
  existingCount: number;
  onSettingsConfirmed: (
    settings: DownloadSettings,
    filteredItems: MediaItem[]
  ) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const defaultSettings: DownloadSettings = {
  includePhotos: true,
  includeVideos: true,
  imageQuality: "original",
  imageCrop: false,
  videoQuality: "original",
  videoRemoveOverlay: false,
};

export default function DownloadSettings({
  mediaItems,
  originalMediaItems,
  existingCount,
  onSettingsConfirmed,
  onCancel,
  disabled = false,
}: DownloadSettingsProps) {
  const [showModal, setShowModal] = useState(false);
  const [settings, setSettings] = useState<DownloadSettings>(defaultSettings);

  // Count media types from original selection
  const originalPhotoCount = originalMediaItems.filter(
    (item) => item.type === "PHOTO"
  ).length;
  const originalVideoCount = originalMediaItems.filter(
    (item) => item.type === "VIDEO"
  ).length;

  // Count media types available for download (after duplicate removal)
  const availablePhotoCount = mediaItems.filter(
    (item) => item.type === "PHOTO"
  ).length;
  const availableVideoCount = mediaItems.filter(
    (item) => item.type === "VIDEO"
  ).length;

  // Filter items based on current settings
  const getFilteredItems = (currentSettings: DownloadSettings) => {
    return mediaItems.filter((item) => {
      if (item.type === "PHOTO" && !currentSettings.includePhotos) return false;
      if (item.type === "VIDEO" && !currentSettings.includeVideos) return false;
      return true;
    });
  };

  const filteredItems = getFilteredItems(settings);

  const handleOpenModal = () => {
    if (!disabled) {
      setShowModal(true);
    }
  };

  const handleConfirm = () => {
    onSettingsConfirmed(settings, filteredItems);
    setShowModal(false);
  };

  const handleCancel = () => {
    setShowModal(false);
    onCancel();
  };

  const updateSettings = (updates: Partial<DownloadSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const getQualityDescription = (quality: string, type: "image" | "video") => {
    if (type === "image") {
      switch (quality) {
        case "original":
          return "Full resolution with metadata";
        case "high":
          return "2048x2048 max";
        case "medium":
          return "1024x1024 max";
        case "low":
          return "512x512 max";
        default:
          return "";
      }
    } else {
      switch (quality) {
        case "original":
          return "Full video file";
        case "high":
          return "Full video file";
        case "thumbnail":
          return "Video thumbnail (1280x720)";
        default:
          return "";
      }
    }
  };

  return (
    <>
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
          maxWidth: "500px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h3 style={{ margin: "0 0 8px 0", color: "#333" }}>
            ⚙️ Step 4: Download Settings
          </h3>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
            Configure what and how to download
          </p>
        </div>

        {/* File Summary */}
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#e8f4fd",
            borderRadius: "8px",
            fontSize: "14px",
            textAlign: "center",
            width: "100%",
            border: "1px solid #b3d9ff",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            📊 File Analysis
          </div>
          <div>
            📂 Total selected: {originalPhotoCount + originalVideoCount} files (
            {originalPhotoCount} photos, {originalVideoCount} videos)
          </div>
          {existingCount > 0 && (
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              ✅ {existingCount} files already exist • 📥{" "}
              {availablePhotoCount + availableVideoCount} new files to download
            </div>
          )}
          {existingCount === 0 && (
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              📥 All {availablePhotoCount + availableVideoCount} files are new -
              no duplicates found
            </div>
          )}
        </div>

        {/* Quick preview */}
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#f0f0f0",
            borderRadius: "8px",
            fontSize: "14px",
            textAlign: "center",
            width: "100%",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Current Selection:
          </div>
          <div>
            {settings.includePhotos &&
              settings.includeVideos &&
              `${filteredItems.length} items to download`}
            {settings.includePhotos &&
              !settings.includeVideos &&
              `${
                filteredItems.filter((i) => i.type === "PHOTO").length
              } photos to download`}
            {!settings.includePhotos &&
              settings.includeVideos &&
              `${
                filteredItems.filter((i) => i.type === "VIDEO").length
              } videos to download`}
            {!settings.includePhotos &&
              !settings.includeVideos &&
              "No items selected"}
          </div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
            Originally selected: {originalPhotoCount} photos,{" "}
            {originalVideoCount} videos
            {existingCount > 0 && ` • ${existingCount} duplicates found`}
          </div>
          {settings.imageQuality !== "original" && settings.includePhotos && (
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              Photos: {getQualityDescription(settings.imageQuality, "image")}
            </div>
          )}
          {settings.videoQuality !== "original" && settings.includeVideos && (
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              Videos: {getQualityDescription(settings.videoQuality, "video")}
            </div>
          )}
        </div>

        <button
          onClick={handleOpenModal}
          disabled={disabled}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            color: "white",
            backgroundColor: disabled ? "#ccc" : "#4285f4",
            border: "none",
            borderRadius: "8px",
            cursor: disabled ? "not-allowed" : "pointer",
            minWidth: "180px",
          }}
        >
          Configure Download
        </button>

        <button
          onClick={() => onSettingsConfirmed(settings, filteredItems)}
          disabled={disabled || filteredItems.length === 0}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            color: disabled || filteredItems.length === 0 ? "#ccc" : "#4285f4",
            backgroundColor: "transparent",
            border: `1px solid ${
              disabled || filteredItems.length === 0 ? "#ccc" : "#4285f4"
            }`,
            borderRadius: "6px",
            cursor:
              disabled || filteredItems.length === 0
                ? "not-allowed"
                : "pointer",
          }}
        >
          Use Default Settings
        </button>
      </div>

      {/* Settings Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px 0",
                color: "#333",
                textAlign: "center",
              }}
            >
              Download Settings
            </h2>

            {/* Media Type Filtering */}
            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  margin: "0 0 12px 0",
                  color: "#555",
                  fontSize: "16px",
                }}
              >
                📂 What to Download
              </h3>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.includePhotos}
                    onChange={(e) =>
                      updateSettings({ includePhotos: e.target.checked })
                    }
                    style={{ transform: "scale(1.2)" }}
                  />
                  <span>
                    📸 Photos ({originalPhotoCount} selected,{" "}
                    {availablePhotoCount} new)
                  </span>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.includeVideos}
                    onChange={(e) =>
                      updateSettings({ includeVideos: e.target.checked })
                    }
                    style={{ transform: "scale(1.2)" }}
                  />
                  <span>
                    🎥 Videos ({originalVideoCount} selected,{" "}
                    {availableVideoCount} new)
                  </span>
                </label>
              </div>
            </div>

            {/* Image Settings */}
            {settings.includePhotos && (
              <div style={{ marginBottom: "24px" }}>
                <h3
                  style={{
                    margin: "0 0 12px 0",
                    color: "#555",
                    fontSize: "16px",
                  }}
                >
                  📸 Photo Settings
                </h3>
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    Quality:
                  </label>
                  <select
                    value={settings.imageQuality}
                    onChange={(e) =>
                      updateSettings({ imageQuality: e.target.value as any })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #ddd",
                      fontSize: "14px",
                    }}
                  >
                    <option value="original">
                      Original (Full resolution with metadata)
                    </option>
                    <option value="high">High (2048x2048 max)</option>
                    <option value="medium">Medium (1024x1024 max)</option>
                    <option value="low">Low (512x512 max)</option>
                  </select>
                </div>

                {settings.imageQuality !== "original" && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            fontSize: "14px",
                          }}
                        >
                          Max Width (px):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="16383"
                          placeholder="Auto"
                          value={settings.imageMaxWidth || ""}
                          onChange={(e) =>
                            updateSettings({
                              imageMaxWidth: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            fontSize: "14px",
                          }}
                        >
                          Max Height (px):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="16383"
                          placeholder="Auto"
                          value={settings.imageMaxHeight || ""}
                          onChange={(e) =>
                            updateSettings({
                              imageMaxHeight: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                    </div>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={settings.imageCrop}
                        onChange={(e) =>
                          updateSettings({ imageCrop: e.target.checked })
                        }
                        style={{ transform: "scale(1.1)" }}
                      />
                      <span style={{ fontSize: "14px" }}>
                        Crop to exact dimensions (maintains aspect ratio)
                      </span>
                    </label>
                  </>
                )}
              </div>
            )}

            {/* Video Settings */}
            {settings.includeVideos && (
              <div style={{ marginBottom: "24px" }}>
                <h3
                  style={{
                    margin: "0 0 12px 0",
                    color: "#555",
                    fontSize: "16px",
                  }}
                >
                  🎥 Video Settings
                </h3>
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    Quality:
                  </label>
                  <select
                    value={settings.videoQuality}
                    onChange={(e) =>
                      updateSettings({ videoQuality: e.target.value as any })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #ddd",
                      fontSize: "14px",
                    }}
                  >
                    <option value="original">Original (Full video file)</option>
                    <option value="high">High (Full video file)</option>
                    <option value="thumbnail">
                      Thumbnail Only (1280x720 image)
                    </option>
                  </select>
                </div>

                {settings.videoQuality === "thumbnail" && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={settings.videoRemoveOverlay}
                      onChange={(e) =>
                        updateSettings({ videoRemoveOverlay: e.target.checked })
                      }
                      style={{ transform: "scale(1.1)" }}
                    />
                    <span style={{ fontSize: "14px" }}>
                      Remove play button overlay from thumbnails
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* Summary */}
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #e9ecef",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                Summary:
              </div>
              <div style={{ fontSize: "14px" }}>
                {filteredItems.length === 0 && (
                  <div style={{ color: "#dc3545" }}>
                    ⚠️ No items will be downloaded with current settings
                  </div>
                )}
                {filteredItems.length > 0 && (
                  <div>
                    ✅ Will download {filteredItems.length} items
                    {settings.includePhotos &&
                      settings.includeVideos &&
                      ` (${
                        filteredItems.filter((i) => i.type === "PHOTO").length
                      } photos, ${
                        filteredItems.filter((i) => i.type === "VIDEO").length
                      } videos)`}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleCancel}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  color: "#666",
                  backgroundColor: "transparent",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={filteredItems.length === 0}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: "white",
                  backgroundColor:
                    filteredItems.length === 0 ? "#ccc" : "#4285f4",
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    filteredItems.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
