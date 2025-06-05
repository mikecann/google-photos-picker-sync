import { useState } from "react";
import { GoogleAuthProvider } from "./GoogleAuthProvider";
import { useAuth } from "./GoogleAuthProvider";
import AuthButton from "./AuthButton";
import PhotoSelector from "./PhotoSelector";
import DirectorySelector from "./DirectorySelector";
import DownloadManager from "./DownloadManager";

function AppContent() {
  const { isSignedIn } = useAuth();
  const [selectedPhotos, setSelectedPhotos] = useState<{
    mediaItems: any[];
    oauthToken: string;
    sessionId: string;
  } | null>(null);

  const [directoryInfo, setDirectoryInfo] = useState<{
    directory: FileSystemDirectoryHandle;
    filteredItems: any[];
    existingCount: number;
  } | null>(null);

  const handlePhotosSelected = (
    mediaItems: any[],
    oauthToken: string,
    sessionId: string
  ) => {
    setSelectedPhotos({ mediaItems, oauthToken, sessionId });
    // Reset directory info when new photos are selected
    setDirectoryInfo(null);
  };

  const handleDirectorySelected = (
    directory: FileSystemDirectoryHandle,
    filteredItems: any[],
    existingCount: number
  ) => {
    setDirectoryInfo({ directory, filteredItems, existingCount });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        alignItems: "center",
        marginTop: 40,
        padding: "0 20px 40px 20px",
        minHeight: "100vh",
        backgroundColor: "#ffffff",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 8px 0", color: "#333" }}>
          Google Photos Picker Sync
        </h1>
        <p style={{ margin: 0, color: "#666", fontSize: "16px" }}>
          Sync your Google Photos to your computer in 4 easy steps
        </p>
      </div>

      {/* Step 1: Authentication */}
      <AuthButton />

      {/* Step 2: Photo Selection */}
      <PhotoSelector
        onPhotosSelected={handlePhotosSelected}
        disabled={!isSignedIn}
      />

      {/* Step 3: Directory Selection */}
      {selectedPhotos && (
        <DirectorySelector
          mediaItems={selectedPhotos.mediaItems}
          onDirectorySelected={handleDirectorySelected}
          disabled={!selectedPhotos}
        />
      )}

      {/* Step 4: Download */}
      {selectedPhotos && directoryInfo && (
        <DownloadManager
          mediaItems={directoryInfo.filteredItems}
          oauthToken={selectedPhotos.oauthToken}
          sessionId={selectedPhotos.sessionId}
          selectedDirectory={directoryInfo.directory}
          existingCount={directoryInfo.existingCount}
        />
      )}
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
