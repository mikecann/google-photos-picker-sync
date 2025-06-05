import { useState, useEffect, useRef } from "react";
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handlePhotosSelected = (
    mediaItems: any[],
    oauthToken: string,
    sessionId: string
  ) => {
    setSelectedPhotos({ mediaItems, oauthToken, sessionId });
    // Reset directory info when new photos are selected
    setDirectoryInfo(null);
    // Scroll to step 3
    scrollToStep(3);
  };

  const handleDirectorySelected = (
    directory: FileSystemDirectoryHandle,
    filteredItems: any[],
    existingCount: number
  ) => {
    setDirectoryInfo({ directory, filteredItems, existingCount });
    // Scroll to step 4
    scrollToStep(4);
  };

  const scrollToStep = (stepNumber: number) => {
    if (!scrollContainerRef.current) return;

    const stepWidth = 400; // Each step is roughly 400px wide
    const scrollPosition = (stepNumber - 1) * (stepWidth + 32); // 32px is the gap

    scrollContainerRef.current.scrollTo({
      left: scrollPosition,
      behavior: "smooth",
    });
  };

  // Auto-scroll to step 2 when signed in
  useEffect(() => {
    if (isSignedIn) {
      scrollToStep(2);
    }
  }, [isSignedIn]);

  // Determine step states
  const step1Complete = isSignedIn;
  const step2Complete = !!selectedPhotos;
  const step3Complete = !!directoryInfo;
  const step4Complete = false; // We could track download completion if needed

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        padding: "20px 0",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1 style={{ margin: "0 0 8px 0", color: "#333" }}>
          Google Photos Picker Sync
        </h1>
        <p style={{ margin: 0, color: "#666", fontSize: "16px" }}>
          Sync your Google Photos to your computer in 4 easy steps
        </p>
      </div>

      {/* Progress indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 30,
          padding: "0 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            maxWidth: "800px",
            width: "100%",
          }}
        >
          {[1, 2, 3, 4].map((step, index) => {
            const isComplete =
              (step === 1 && step1Complete) ||
              (step === 2 && step2Complete) ||
              (step === 3 && step3Complete) ||
              (step === 4 && step4Complete);

            const isActive =
              (step === 1 && !step1Complete) ||
              (step === 2 && step1Complete && !step2Complete) ||
              (step === 3 && step2Complete && !step3Complete) ||
              (step === 4 && step3Complete && !step4Complete);

            return (
              <div
                key={step}
                style={{ display: "flex", alignItems: "center", flex: 1 }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: isComplete
                      ? "#4caf50"
                      : isActive
                      ? "#2196f3"
                      : "#e0e0e0",
                    color: isComplete || isActive ? "white" : "#999",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  {isComplete ? "✓" : step}
                </div>
                {index < 3 && (
                  <div
                    style={{
                      flex: 1,
                      height: "2px",
                      backgroundColor: isComplete ? "#4caf50" : "#e0e0e0",
                      marginLeft: "8px",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Horizontal scrolling steps container */}
      <div
        ref={scrollContainerRef}
        style={{
          display: "flex",
          gap: 32,
          padding: "0 20px",
          overflowX: "auto",
          scrollBehavior: "smooth",
          // Hide scrollbar but keep functionality
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Step 1: Authentication */}
        <div
          style={{
            minWidth: "400px",
            opacity: 1,
            transition: "opacity 0.3s ease",
          }}
        >
          <AuthButton />
        </div>

        {/* Step 2: Photo Selection */}
        <div
          style={{
            minWidth: "400px",
            opacity: step1Complete ? 1 : 0.4,
            transition: "opacity 0.3s ease",
          }}
        >
          <PhotoSelector
            onPhotosSelected={handlePhotosSelected}
            disabled={!isSignedIn}
          />
        </div>

        {/* Step 3: Directory Selection */}
        <div
          style={{
            minWidth: "400px",
            opacity: step2Complete ? 1 : 0.4,
            transition: "opacity 0.3s ease",
          }}
        >
          <DirectorySelector
            mediaItems={selectedPhotos?.mediaItems || []}
            onDirectorySelected={handleDirectorySelected}
            disabled={!selectedPhotos}
          />
        </div>

        {/* Step 4: Download */}
        <div
          style={{
            minWidth: "400px",
            opacity: step3Complete ? 1 : 0.4,
            transition: "opacity 0.3s ease",
          }}
        >
          {directoryInfo ? (
            <DownloadManager
              mediaItems={directoryInfo.filteredItems}
              oauthToken={selectedPhotos!.oauthToken}
              sessionId={selectedPhotos!.sessionId}
              selectedDirectory={directoryInfo.directory}
              existingCount={directoryInfo.existingCount}
            />
          ) : (
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
                  Complete Step 3 to enable downloads
                </p>
              </div>
              <button
                disabled
                style={{
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "white",
                  backgroundColor: "#ccc",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "not-allowed",
                  minWidth: "200px",
                }}
              >
                🚀 Download Files
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hide horizontal scrollbar with CSS */}
      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
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
