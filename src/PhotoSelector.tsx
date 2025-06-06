import { useState, useRef } from "react";
import { useAuth } from "./GoogleAuthProvider";
import {
  createPickerSession,
  pollSession,
  fetchPickedMediaItems,
} from "./PickerService";
import type { MediaItem } from "./types";

interface PhotoSelectorProps {
  onPhotosSelected: (
    mediaItems: MediaItem[],
    oauthToken: string,
    sessionId: string
  ) => void;
  disabled?: boolean;
}

// Modal overlay to show while picker is open
function PickerOverlay({
  isOpen,
  onCancel,
  status,
}: {
  isOpen: boolean;
  onCancel: () => void;
  status: string;
}) {
  if (!isOpen) return null;

  const isWaiting = status.includes("Waiting") || status.includes("Checking");

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "32px",
          maxWidth: "400px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            marginBottom: "16px",
          }}
        >
          {status.includes("✅") ? "✅" : "📸"}
        </div>

        <h3 style={{ margin: "0 0 16px 0", color: "#333" }}>
          Google Photos Picker Open
        </h3>

        <p style={{ margin: "0 0 24px 0", color: "#666", lineHeight: 1.5 }}>
          {status}
        </p>

        {isWaiting && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "24px",
            }}
          >
            <div
              className="spinner"
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid #e0e0e0",
                borderTop: "2px solid #4285f4",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <span style={{ color: "#666", fontSize: "14px" }}>
              {status.includes("Closing")
                ? "Finishing up..."
                : "Actively checking for selections..."}
            </span>
          </div>
        )}

        {!status.includes("✅") && !status.includes("Closing") && (
          <button
            onClick={onCancel}
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
        )}
      </div>
    </div>
  );
}

export default function PhotoSelector({
  onPhotosSelected,
  disabled,
}: PhotoSelectorProps) {
  const { oauthToken } = useAuth();
  const [isSelecting, setIsSelecting] = useState(false);
  const [status, setStatus] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [pickerWindow, setPickerWindow] = useState<Window | null>(null);
  const cancelledRef = useRef(false);

  const handleSelectPhotos = async () => {
    if (!oauthToken) {
      setStatus("Please sign in first");
      return;
    }

    setIsSelecting(true);
    setStatus("Creating picker session...");
    cancelledRef.current = false; // Reset cancellation flag

    try {
      // Create a picker session
      const { pickerUri, sessionId } = await createPickerSession({
        oauthToken,
      });

      // Calculate centered popup position
      const width = 1000;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      // Open the picker in a well-positioned popup window
      const popup = window.open(
        pickerUri,
        "googlePhotosPicker",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no`
      );

      if (!popup) {
        throw new Error(
          "Failed to open picker window. Please allow popups and try again."
        );
      }

      console.log("Popup window opened successfully");

      setPickerWindow(popup);
      setShowOverlay(true);
      setStatus(
        "Select your photos in the picker window, then click 'Done' to continue"
      );

      // Focus the popup window
      popup.focus();

      // Check if popup is still open before starting polling
      if (popup.closed) {
        console.error("Popup window closed immediately after opening");
        throw new Error("Popup window closed unexpectedly");
      }

      console.log("Popup window is open, starting polling");

      // Poll the session to check if user has finished selecting
      setStatus("Waiting for you to select photos...");
      console.log("Starting polling, cancelled:", cancelledRef.current);

      const mediaItemsSet = await pollSession({
        oauthToken,
        sessionId,
        onCancel: () => {
          const isCancelled = cancelledRef.current;
          console.log("Polling onCancel check:", isCancelled);
          return isCancelled;
        },
      });

      console.log(
        "Polling completed, result:",
        mediaItemsSet,
        "cancelled:",
        cancelledRef.current
      );

      // Check if operation was cancelled
      if (cancelledRef.current) {
        console.log("Photo selection was cancelled");
        return; // Exit early, cleanup already handled in handleCancelSelection
      }

      // Immediately close popup and update status when selection is detected
      if (mediaItemsSet) {
        setStatus("✅ Photos detected! Closing picker...");

        // Close popup immediately
        if (popup && !popup.closed) {
          popup.close();
        }
        setPickerWindow(null);
        setShowOverlay(false);

        // Brief delay to show the success message
        await new Promise((resolve) => setTimeout(resolve, 600));
      } else {
        // Close overlay and popup if selection failed/timed out
        setShowOverlay(false);
        if (popup && !popup.closed) {
          popup.close();
        }
        setPickerWindow(null);
      }

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
      setShowOverlay(false);
      if (pickerWindow && !pickerWindow.closed) {
        pickerWindow.close();
      }
      setPickerWindow(null);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during photo selection.";
      setStatus(`Error: ${errorMessage}`);
    } finally {
      setIsSelecting(false);
      cancelledRef.current = false; // Reset cancellation flag
    }
  };

  const handleCancelSelection = () => {
    console.log("User cancelled photo selection");
    cancelledRef.current = true; // Set cancellation flag

    setShowOverlay(false);
    if (pickerWindow && !pickerWindow.closed) {
      pickerWindow.close();
    }
    setPickerWindow(null);
    setStatus("Photo selection cancelled.");
    setIsSelecting(false);
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

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
              disabled || isSelecting || !oauthToken
                ? "not-allowed"
                : "pointer",
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

      {/* Picker Overlay */}
      <PickerOverlay
        isOpen={showOverlay}
        onCancel={handleCancelSelection}
        status={status}
      />
    </>
  );
}
