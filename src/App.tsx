import { useState, useEffect } from "react";
import { GoogleAuthProvider } from "./GoogleAuthProvider";
import { useAuth } from "./GoogleAuthProvider";
import AuthButton from "./AuthButton";
import PhotoSelector from "./PhotoSelector";
import DirectorySelector from "./DirectorySelector";
import DownloadSettings from "./DownloadSettings";
import DownloadManager from "./DownloadManager";
import type {
  MediaItem,
  DownloadSettings as DownloadSettingsType,
} from "./types";

function AppContent() {
  const { isSignedIn } = useAuth();
  const [selectedPhotos, setSelectedPhotos] = useState<{
    mediaItems: MediaItem[];
    oauthToken: string;
    sessionId: string;
  } | null>(null);

  const [directoryInfo, setDirectoryInfo] = useState<{
    directory: FileSystemDirectoryHandle;
    filteredItems: MediaItem[];
    existingCount: number;
  } | null>(null);

  const [downloadSettings, setDownloadSettings] = useState<{
    settings: DownloadSettingsType;
    filteredItems: MediaItem[];
  } | null>(null);

  const [downloadComplete, setDownloadComplete] = useState(false);
  const [baseUrlTimer, setBaseUrlTimer] = useState<{
    startTime: number;
    timeRemaining: number;
  } | null>(null);

  // Timer countdown effect for base URL expiration
  useEffect(() => {
    if (!baseUrlTimer?.startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - baseUrlTimer.startTime) / 1000; // seconds elapsed
      const remaining = Math.max(0, 3600 - elapsed); // 60 minutes = 3600 seconds

      setBaseUrlTimer((prev) =>
        prev ? { ...prev, timeRemaining: remaining } : null
      );

      if (remaining <= 0) {
        // Base URLs have expired
        setSelectedPhotos(null);
        setDirectoryInfo(null);
        setDownloadComplete(false);
        setBaseUrlTimer(null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [baseUrlTimer?.startTime]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Get timer color based on time remaining
  const getTimerColor = (seconds: number) => {
    if (seconds > 1800) return "#4caf50"; // Green (>30 min)
    if (seconds > 600) return "#ff9800"; // Orange (>10 min)
    return "#f44336"; // Red (≤10 min)
  };

  // Get timer warning message
  const getTimerWarning = (seconds: number) => {
    if (seconds <= 300) return "⚠️ Only 5 minutes left!";
    if (seconds <= 600) return "⚠️ Less than 10 minutes remaining";
    if (seconds <= 1800) return "⏰ Less than 30 minutes remaining";
    return null;
  };

  const handlePhotosSelected = (
    mediaItems: MediaItem[],
    oauthToken: string,
    sessionId: string
  ) => {
    setSelectedPhotos({ mediaItems, oauthToken, sessionId });
    // Reset directory info and download completion when new photos are selected
    setDirectoryInfo(null);
    setDownloadComplete(false);
    // Start the 60-minute timer for base URL expiration
    setBaseUrlTimer({
      startTime: Date.now(),
      timeRemaining: 3600,
    });
    // Navigate to step 3 (directory selection)
    setCurrentStep(3);
  };

  const handleDirectorySelected = (
    directory: FileSystemDirectoryHandle,
    filteredItems: MediaItem[],
    existingCount: number
  ) => {
    setDirectoryInfo({ directory, filteredItems, existingCount });
    // Reset download settings and completion when new directory is selected
    setDownloadSettings(null);
    setDownloadComplete(false);
    // Navigate to step 4 (settings)
    setCurrentStep(4);
  };

  const handleDownloadSettingsConfirmed = (
    settings: DownloadSettingsType,
    filteredItems: MediaItem[]
  ) => {
    setDownloadSettings({ settings, filteredItems });
    // Reset download completion when new settings are applied
    setDownloadComplete(false);
    // Navigate to step 5 (download)
    setCurrentStep(5);
  };

  const handleDownloadSettingsCancel = () => {
    // Don't change anything, just stay on settings step
    // User can modify directory or settings again
  };

  const handleDownloadComplete = () => {
    setDownloadComplete(true);
  };

  // Determine step states
  const step1Complete = isSignedIn;
  const step2Complete = !!selectedPhotos;
  const step3Complete = !!directoryInfo;
  const step4Complete = !!downloadSettings; // Settings step
  const step5Complete = downloadComplete;

  // Determine which step is currently active
  const getCurrentStep = () => {
    if (!step1Complete) return 1;
    if (!step2Complete) return 2;
    if (!step3Complete) return 3;
    if (!step4Complete) return 4;
    if (!step5Complete) return 5;
    return 5; // If all complete, show final step
  };

  const [currentStep, setCurrentStep] = useState(getCurrentStep());

  // Update current step when progress changes
  useEffect(() => {
    setCurrentStep(getCurrentStep());
  }, [
    step1Complete,
    step2Complete,
    step3Complete,
    step4Complete,
    step5Complete,
  ]);

  // Navigation logic - can always go back, can only go forward to available steps
  const canNavigateToStep = (stepNumber: number) => {
    if (stepNumber === 1) return true; // Always can go to step 1
    if (stepNumber === 2) return step1Complete; // Can go to step 2 if signed in
    if (stepNumber === 3) return step2Complete; // Can go to step 3 if photos selected
    if (stepNumber === 4) return step3Complete; // Can go to settings if directory selected
    if (stepNumber === 5) return step4Complete; // Can go to step 5 if settings confirmed
    return false;
  };

  const handleStepClick = (stepNumber: number) => {
    if (canNavigateToStep(stepNumber)) {
      setCurrentStep(stepNumber);
    }
  };

  // Auto-navigate to step 2 when signed in
  useEffect(() => {
    if (isSignedIn) {
      setCurrentStep(2);
    }
  }, [isSignedIn]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%),
          radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.02) 0%, transparent 50%),
          radial-gradient(circle at 40% 70%, rgba(16, 185, 129, 0.02) 0%, transparent 50%)
        `,
        padding: "20px",
        boxSizing: "border-box",
        maxWidth: "100vw",
        overflow: "hidden", // Prevent page-level horizontal scroll
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        position: "relative",
      }}
    >
      {/* Main container - centered with max width */}
      <div
        style={{
          width: "100%",
          maxWidth: "800px", // Increased max width
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <h1 style={{ margin: "0 0 8px 0", color: "#333" }}>
            Google Photos Picker Sync
          </h1>
          <p style={{ margin: 0, color: "#666", fontSize: "16px" }}>
            Sync your Google Photos to your computer in 5 easy steps
          </p>
        </div>

        {/* Base URL Timer Banner - Shows for Steps 3 & 4 */}
        {baseUrlTimer && selectedPhotos && (
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              marginBottom: 15,
              padding: "12px 16px",
              border: `2px solid ${getTimerColor(baseUrlTimer.timeRemaining)}`,
              borderRadius: "8px",
              backgroundColor: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: "14px",
                    marginBottom: "2px",
                  }}
                >
                  ⏱️ Google Photos Access Timer
                </div>
                <div style={{ fontSize: "10px", color: "#666" }}>
                  Google limits download access to 60 minutes
                </div>
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: getTimerColor(baseUrlTimer.timeRemaining),
                  fontFamily: "monospace",
                }}
              >
                {formatTime(baseUrlTimer.timeRemaining)}
              </div>
            </div>
            {getTimerWarning(baseUrlTimer.timeRemaining) && (
              <div
                style={{
                  fontSize: "12px",
                  color: getTimerColor(baseUrlTimer.timeRemaining),
                  fontWeight: "bold",
                  marginTop: "8px",
                  padding: "4px 8px",
                  backgroundColor: `${getTimerColor(
                    baseUrlTimer.timeRemaining
                  )}15`,
                  borderRadius: "4px",
                  display: "inline-block",
                }}
              >
                {getTimerWarning(baseUrlTimer.timeRemaining)}
              </div>
            )}
          </div>
        )}

        {/* Progress indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 30,
            width: "100%",
            maxWidth: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              width: "100%",
            }}
          >
            {[1, 2, 3, 4, 5].map((step, index) => {
              const isComplete =
                (step === 1 && step1Complete) ||
                (step === 2 && step2Complete) ||
                (step === 3 && step3Complete) ||
                (step === 4 && step4Complete) ||
                (step === 5 && step5Complete);

              const isActive =
                (step === 1 && !step1Complete) ||
                (step === 2 && step1Complete && !step2Complete) ||
                (step === 3 && step2Complete && !step3Complete) ||
                (step === 4 && step3Complete && !step4Complete) ||
                (step === 5 && step4Complete && !step5Complete);

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
                  {index < 4 && (
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

        {/* Current Step Container */}
        <div
          style={{
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            width: "100%",
            maxWidth: "100%",
            backgroundColor: "#f8f9fa",
            padding: "20px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {/* Render current step */}
          {currentStep === 1 && <AuthButton />}

          {currentStep === 2 && (
            <PhotoSelector
              onPhotosSelected={handlePhotosSelected}
              disabled={!isSignedIn}
            />
          )}

          {currentStep === 3 && (
            <DirectorySelector
              mediaItems={selectedPhotos?.mediaItems || []}
              onDirectorySelected={handleDirectorySelected}
              disabled={!selectedPhotos}
            />
          )}

          {currentStep === 4 && (
            <>
              {directoryInfo ? (
                <DownloadSettings
                  mediaItems={directoryInfo.filteredItems}
                  onSettingsConfirmed={handleDownloadSettingsConfirmed}
                  onCancel={handleDownloadSettingsCancel}
                  disabled={!directoryInfo}
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
                      ⚙️ Step 4: Download Settings
                    </h3>
                    <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                      Complete Step 3 to configure download settings
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {currentStep === 5 && (
            <>
              {downloadSettings && directoryInfo ? (
                <DownloadManager
                  mediaItems={downloadSettings.filteredItems}
                  downloadSettings={downloadSettings.settings}
                  oauthToken={selectedPhotos!.oauthToken}
                  sessionId={selectedPhotos!.sessionId}
                  selectedDirectory={directoryInfo.directory}
                  existingCount={directoryInfo.existingCount}
                  onDownloadComplete={handleDownloadComplete}
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
                      🚀 Step 5: Download
                    </h3>
                    <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                      Complete Step 4 to enable downloads
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
            </>
          )}
        </div>
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
