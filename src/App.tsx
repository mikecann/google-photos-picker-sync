import { useState, useEffect, useRef } from "react";
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    // Scroll to step 3 (center it)
    setTimeout(() => scrollToStep(3), 100);
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
    // Scroll to step 4 (settings)
    setTimeout(() => scrollToStep(4), 100);
  };

  const handleDownloadSettingsConfirmed = (
    settings: DownloadSettingsType,
    filteredItems: MediaItem[]
  ) => {
    setDownloadSettings({ settings, filteredItems });
    // Reset download completion when new settings are applied
    setDownloadComplete(false);
    // Scroll to step 5 (download)
    setTimeout(() => scrollToStep(5), 100);
  };

  const handleDownloadSettingsCancel = () => {
    // Don't change anything, just stay on settings step
    // User can modify directory or settings again
  };

  const handleDownloadComplete = () => {
    setDownloadComplete(true);
  };

  const scrollToStep = (stepNumber: number) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const containerWidth = container.clientWidth;

    // Calculate responsive step width (same logic as CSS)
    const maxWidth = Math.min(350, (window.innerWidth - 140) / 1.5);
    const stepWidth = Math.max(280, maxWidth); // Minimum width for readability
    const gap = 24;
    const spacerWidth = stepWidth; // Same as step width for centering

    // Calculate the position of the target step
    // spacer + (steps before target * (stepWidth + gap)) + half of target step width
    const stepPosition =
      spacerWidth + (stepNumber - 1) * (stepWidth + gap) + stepWidth / 2;

    // Center this position in the viewport
    const scrollPosition = stepPosition - containerWidth / 2;

    container.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: "smooth",
    });
  };

  // Determine step states
  const step1Complete = isSignedIn;
  const step2Complete = !!selectedPhotos;
  const step3Complete = !!directoryInfo;
  const step4Complete = !!downloadSettings; // Settings step
  const step5Complete = downloadComplete;

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
      scrollToStep(stepNumber);
    }
  };

  // Auto-scroll to step 2 when signed in (center it)
  useEffect(() => {
    if (isSignedIn) {
      setTimeout(() => scrollToStep(2), 100);
    }
  }, [isSignedIn]);

  // Center step 1 on initial load
  useEffect(() => {
    setTimeout(() => scrollToStep(1), 100);
  }, []);

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
          maxWidth: "1200px", // Increased for 5 steps
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
            maxWidth: "900px",
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
                    {isComplete ? "✓" : step === 4 ? "⚙️" : step}
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

        {/* Steps container with inner scroll */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            width: "100%",
            maxWidth: "calc(100vw - 40px)", // Ensure it doesn't exceed viewport
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
              // Make the scroll container wide enough for all steps plus centering space
              width: "calc(100% + 1000px)", // Extra space for centering (2 * 500px spacers)
              marginLeft: "-500px", // Offset to allow centering
            }}
          >
            {/* Invisible spacer for centering */}
            <div style={{ minWidth: "500px", flexShrink: 0 }} />

            {/* Step 1: Authentication */}
            <div
              style={{
                minWidth: "350px",
                maxWidth: "350px",
                flexShrink: 0,
                opacity: 1,
                transition: "opacity 0.3s ease",
              }}
            >
              <AuthButton />
            </div>

            {/* Step 2: Photo Selection */}
            <div
              style={{
                minWidth: "350px",
                maxWidth: "350px",
                flexShrink: 0,
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
                minWidth: "350px",
                maxWidth: "350px",
                flexShrink: 0,
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

            {/* Step 4: Download Settings */}
            <div
              style={{
                minWidth: "350px",
                maxWidth: "350px",
                flexShrink: 0,
                opacity: step3Complete ? 1 : 0.4,
                transition: "opacity 0.3s ease",
              }}
            >
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
            </div>

            {/* Step 5: Download */}
            <div
              style={{
                minWidth: "350px",
                maxWidth: "350px",
                flexShrink: 0,
                opacity: step4Complete ? 1 : 0.4,
                transition: "opacity 0.3s ease",
              }}
            >
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
            </div>

            {/* Invisible spacer for centering */}
            <div style={{ minWidth: "500px", flexShrink: 0 }} />
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
            {[1, 2, 3, 4, 5].map((step) => {
              const isCurrentStep =
                (step === 1 && !step1Complete) ||
                (step === 2 && step1Complete && !step2Complete) ||
                (step === 3 && step2Complete && !step3Complete) ||
                (step === 4 && step3Complete && !step4Complete) ||
                (step === 5 && step4Complete);

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
