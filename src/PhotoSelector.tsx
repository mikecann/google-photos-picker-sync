import { useState } from "react";
import { useAuth } from "./GoogleAuthProvider";
import {
  createPickerSession,
  pollSession,
  fetchPickedMediaItems,
} from "./PickerService";

interface PhotoSelectorProps {
  onPhotosSelected: (
    mediaItems: any[],
    oauthToken: string,
    sessionId: string
  ) => void;
  disabled?: boolean;
}

export default function PhotoSelector({
  onPhotosSelected,
  disabled,
}: PhotoSelectorProps) {
  const { oauthToken } = useAuth();
  const [isSelecting, setIsSelecting] = useState(false);
  const [status, setStatus] = useState("");

  const handleSelectPhotos = async () => {
    if (!oauthToken) {
      setStatus("Please sign in first");
      return;
    }

    setIsSelecting(true);
    setStatus("Creating picker session...");

    try {
      // Create a picker session
      const { pickerUri, sessionId } = await createPickerSession({
        oauthToken,
      });

      // Open the picker for the user
      setStatus(
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

      // Poll the session to check if user has finished selecting
      setStatus("Waiting for you to finish selecting photos...");
      const mediaItemsSet = await pollSession({ oauthToken, sessionId });

      if (!mediaItemsSet) {
        setStatus("Selection timed out or was cancelled.");
        setIsSelecting(false);
        return;
      }

      // Fetch the selected media items
      setStatus("Fetching selected media items...");
      const mediaItems = await fetchPickedMediaItems({ oauthToken, sessionId });

      if (!mediaItems || mediaItems.length === 0) {
        setStatus("No media items were selected.");
        setIsSelecting(false);
        return;
      }

      // Success! Pass the selected items to parent
      setStatus(`✅ Selected ${mediaItems.length} photos successfully!`);
      onPhotosSelected(mediaItems, oauthToken, sessionId);
    } catch (error) {
      console.error("Photo selection error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during photo selection.";
      setStatus(`Error: ${errorMessage}`);
    } finally {
      setIsSelecting(false);
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
        maxWidth: "500px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h3 style={{ margin: "0 0 8px 0", color: "#333" }}>
          📸 Step 2: Select Photos
        </h3>
        <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
          Choose which photos from Google Photos you want to sync
        </p>
      </div>

      <button
        onClick={handleSelectPhotos}
        disabled={disabled || isSelecting || !oauthToken}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          fontWeight: "bold",
          color: "white",
          backgroundColor: disabled || !oauthToken ? "#ccc" : "#4285f4",
          border: "none",
          borderRadius: "8px",
          cursor:
            disabled || isSelecting || !oauthToken ? "not-allowed" : "pointer",
          minWidth: "180px",
        }}
      >
        {isSelecting ? "Selecting Photos..." : "Select Photos"}
      </button>

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
            maxWidth: "400px",
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
