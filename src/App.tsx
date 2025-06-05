import { useState } from "react";
import { GoogleAuthProvider } from "./GoogleAuthProvider";
import { useAuth } from "./GoogleAuthProvider";
import AuthButton from "./AuthButton";
import PhotoSelector from "./PhotoSelector";
import DirectorySelector from "./DirectorySelector";

function AppContent() {
  const { isSignedIn } = useAuth();
  const [selectedPhotos, setSelectedPhotos] = useState<{
    mediaItems: any[];
    oauthToken: string;
    sessionId: string;
  } | null>(null);

  const handlePhotosSelected = (
    mediaItems: any[],
    oauthToken: string,
    sessionId: string
  ) => {
    setSelectedPhotos({ mediaItems, oauthToken, sessionId });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        alignItems: "center",
        marginTop: 40,
        padding: "0 20px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 8px 0", color: "#333" }}>
          Google Photos Picker Sync
        </h1>
        <p style={{ margin: 0, color: "#666", fontSize: "16px" }}>
          Sync your Google Photos to your computer in 3 easy steps
        </p>
      </div>

      {/* Step 1: Authentication */}
      <AuthButton />

      {/* Step 2: Photo Selection */}
      <PhotoSelector
        onPhotosSelected={handlePhotosSelected}
        disabled={!isSignedIn}
      />

      {/* Step 3: Directory Selection & Download */}
      {selectedPhotos && (
        <DirectorySelector
          mediaItems={selectedPhotos.mediaItems}
          oauthToken={selectedPhotos.oauthToken}
          sessionId={selectedPhotos.sessionId}
        />
      )}

      {/* Progress Indicator */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: "20px",
          padding: "16px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
          fontSize: "14px",
          color: "#666",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: isSignedIn ? "#4caf50" : "#999",
          }}
        >
          {isSignedIn ? "✅" : "⭕"} Step 1: Sign In
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: selectedPhotos ? "#4caf50" : "#999",
          }}
        >
          {selectedPhotos ? "✅" : "⭕"} Step 2: Select Photos
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "#999",
          }}
        >
          ⭕ Step 3: Download
        </div>
      </div>

      {/* Help Text */}
      <div
        style={{
          maxWidth: "600px",
          textAlign: "center",
          fontSize: "14px",
          color: "#888",
          lineHeight: "1.5",
          marginTop: "20px",
        }}
      >
        {!isSignedIn && (
          <p>
            🔐 Start by signing in with your Google account to access your
            photos.
          </p>
        )}
        {isSignedIn && !selectedPhotos && (
          <p>
            📸 Now you can select which photos you want to sync from Google
            Photos.
          </p>
        )}
        {selectedPhotos && (
          <p>
            📁 Choose where to save your {selectedPhotos.mediaItems.length}{" "}
            selected photos and start the download.
          </p>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GoogleAuthProvider>
      <AppContent />
    </GoogleAuthProvider>
  );
}
