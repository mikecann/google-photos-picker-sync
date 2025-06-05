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
    setTimeout(() => scrollToStep(3), 100);
  };

  const handleDirectorySelected = (
    directory: FileSystemDirectoryHandle,
    filteredItems: any[],
    existingCount: number
  ) => {
    setDirectoryInfo({ directory, filteredItems, existingCount });
    // Scroll to step 4
    setTimeout(() => scrollToStep(4), 100);
  };

  const scrollToStep = (stepNumber: number) => {
    if (!scrollContainerRef.current) return;

    const stepWidth = 380; // Each step is 380px wide (400px - padding)
    const gap = 24; // Gap between steps
    const scrollPosition = (stepNumber - 1) * (stepWidth + gap);

    scrollContainerRef.current.scrollTo({
      left: scrollPosition,
      behavior: "smooth",
    });
  };

  // Determine step states
  const step1Complete = isSignedIn;
  const step2Complete = !!selectedPhotos;
  const step3Complete = !!directoryInfo;
  const step4Complete = false; // We could track download completion if needed

  // Navigation logic - can always go back, can only go forward to available steps
  const canNavigateToStep = (stepNumber: number) => {
    if (stepNumber === 1) return true; // Always can go to step 1
    if (stepNumber === 2) return step1Complete; // Can go to step 2 if signed in
    if (stepNumber === 3) return step2Complete; // Can go to step 3 if photos selected
    if (stepNumber === 4) return step3Complete; // Can go to step 4 if directory selected
    return false;
  };

  const handleStepClick = (stepNumber: number) => {
    if (canNavigateToStep(stepNumber)) {
      scrollToStep(stepNumber);
    }
  };

  // Auto-scroll to step 2 when signed in
  useEffect(() => {
    if (isSignedIn) {
      setTimeout(() => scrollToStep(2), 100);
    }
  }, [isSignedIn]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        padding: "20px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {/* Main constrained container */}
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
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
              maxWidth: "600px",
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

              const isClickable = canNavigateToStep(step);

              return (
                <div
                  key={step}
                  style={{ display: "flex", alignItems: "center", flex: 1 }}
                >
                  <div
                    onClick={() => handleStepClick(step)}
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
                      cursor: isClickable ? "pointer" : "not-allowed",
                      transition: "all 0.2s ease",
                      transform: isClickable ? "scale(1)" : "scale(1)",
                      opacity: isClickable ? 1 : 0.6,
                    }}
                    onMouseEnter={(e) => {
                      if (isClickable) {
                        e.currentTarget.style.transform = "scale(1.1)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 8px rgba(0,0,0,0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isClickable) {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "none";
                      }
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

        {/* Steps container with inner scroll */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            ref={scrollContainerRef}
            style={{
              display: "flex",
              gap: 24,
              padding: "20px",
              overflowX: "auto",
              scrollBehavior: "smooth",
              // Hide scrollbar but keep functionality
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              backgroundColor: "#f8f9fa",
            }}
          >
            {/* Step 1: Authentication */}
            <div
              style={{
                minWidth: "380px",
                maxWidth: "380px",
                opacity: 1,
                transition: "opacity 0.3s ease",
              }}
            >
              <AuthButton />
            </div>

            {/* Step 2: Photo Selection */}
            <div
              style={{
                minWidth: "380px",
                maxWidth: "380px",
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
                minWidth: "380px",
                maxWidth: "380px",
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
                minWidth: "380px",
                maxWidth: "380px",
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

          {/* Scroll indicator */}
          <div
            style={{
              position: "absolute",
              bottom: "8px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "4px",
              padding: "8px 12px",
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: "12px",
              backdropFilter: "blur(4px)",
            }}
          >
            {[1, 2, 3, 4].map((step) => {
              const isCurrentStep =
                (step === 1 && !step1Complete) ||
                (step === 2 && step1Complete && !step2Complete) ||
                (step === 3 && step2Complete && !step3Complete) ||
                (step === 4 && step3Complete);

              const isClickable = canNavigateToStep(step);

              return (
                <div
                  key={step}
                  onClick={() => handleStepClick(step)}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: isCurrentStep
                      ? "#2196f3"
                      : "rgba(255,255,255,0.4)",
                    cursor: isClickable ? "pointer" : "not-allowed",
                    transition: "all 0.2s ease",
                    opacity: isClickable ? 1 : 0.3,
                  }}
                  onMouseEnter={(e) => {
                    if (isClickable) {
                      e.currentTarget.style.transform = "scale(1.5)";
                      e.currentTarget.style.backgroundColor = isCurrentStep
                        ? "#2196f3"
                        : "rgba(255,255,255,0.8)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isClickable) {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.backgroundColor = isCurrentStep
                        ? "#2196f3"
                        : "rgba(255,255,255,0.4)";
                    }
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Hide horizontal scrollbar with CSS */}
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
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
