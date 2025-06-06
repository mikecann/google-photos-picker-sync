import type { MediaItem } from "./types";

export async function createPickerSession({
  oauthToken,
}: {
  oauthToken: string;
}) {
  if (!oauthToken) {
    throw new Error(
      "OAuth token of type 'string' for createPickerSession could not be found"
    );
  }

  const res = await fetch("https://photospicker.googleapis.com/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${oauthToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to create picker session: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();

  if (!data.pickerUri || !data.id) {
    throw new Error("Picker session response missing pickerUri or session id");
  }

  return {
    pickerUri: data.pickerUri,
    sessionId: data.id,
  };
}

export async function pollSession({
  oauthToken,
  sessionId,
  onCancel,
}: {
  oauthToken: string;
  sessionId: string;
  onCancel?: () => boolean; // Function that returns true if polling should be cancelled
}) {
  if (!oauthToken || !sessionId) {
    throw new Error(
      `Missing oauthToken or sessionId for pollSession - oauthToken: ${!!oauthToken}, sessionId: ${!!sessionId}`
    );
  }

  let pollInterval = 1500; // Start with 1.5 seconds
  const minPollInterval = 1000; // Minimum 1 second between polls
  let totalTimeout = 300000; // 5 minutes total timeout
  let elapsed = 0;

  while (elapsed < totalTimeout) {
    // Check if operation was cancelled
    if (onCancel && onCancel()) {
      console.log("Polling cancelled by user");
      return false;
    }

    const res = await fetch(
      `https://photospicker.googleapis.com/v1/sessions/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${oauthToken}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(
        `Failed to poll session '${sessionId}': ${res.status} ${res.statusText}`
      );
    }

    const data = await res.json();

    console.log("Polling response:", {
      mediaItemsSet: data.mediaItemsSet,
      pollingConfig: data.pollingConfig,
    });

    // Check if user has finished selecting media
    if (data.mediaItemsSet === true) {
      return true;
    }

    // Update polling configuration if provided by the API, but enforce minimum
    if (data.pollingConfig) {
      if (data.pollingConfig.pollInterval) {
        const apiInterval = Number(data.pollingConfig.pollInterval);
        if (!isNaN(apiInterval) && apiInterval > 0) {
          pollInterval = Math.max(apiInterval, minPollInterval);
        } else {
          console.warn(
            "Invalid polling interval from API:",
            data.pollingConfig.pollInterval,
            "using default"
          );
          pollInterval = Math.max(pollInterval, minPollInterval);
        }
      }
      if (data.pollingConfig.timeoutIn) {
        const apiTimeout = Number(data.pollingConfig.timeoutIn);
        if (!isNaN(apiTimeout) && apiTimeout > 0) {
          totalTimeout = apiTimeout;
        } else {
          console.warn(
            "Invalid timeout from API:",
            data.pollingConfig.timeoutIn,
            "using default"
          );
        }
      }
    }

    // Ensure pollInterval is always a valid number
    if (isNaN(pollInterval) || pollInterval <= 0) {
      console.warn(
        "Invalid pollInterval detected:",
        pollInterval,
        "resetting to minimum"
      );
      pollInterval = minPollInterval;
    }

    console.log(`Polling in ${pollInterval}ms...`);

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;

    // Check cancellation again after the wait
    if (onCancel && onCancel()) {
      console.log("Polling cancelled by user during wait");
      return false;
    }
  }

  return false; // Timed out
}

export async function fetchPickedMediaItems({
  oauthToken,
  sessionId,
  onProgress,
}: {
  oauthToken: string;
  sessionId: string;
  onProgress?: (progress: {
    currentPage: number;
    totalItemsFetched: number;
    isComplete: boolean;
  }) => void;
}) {
  if (!oauthToken || !sessionId) {
    throw new Error(
      `Missing oauthToken or sessionId for fetchPickedMediaItems - oauthToken: ${!!oauthToken}, sessionId: ${!!sessionId}`
    );
  }

  const allMediaItems: MediaItem[] = [];
  let pageToken: string | undefined = undefined;
  let pageCount = 0;

  do {
    pageCount++;
    console.log(`Fetching page ${pageCount} of media items...`);

    // Update progress - fetching current page
    onProgress?.({
      currentPage: pageCount,
      totalItemsFetched: allMediaItems.length,
      isComplete: false,
    });

    // Build URL with pagination parameters
    const url = new URL("https://photospicker.googleapis.com/v1/mediaItems");
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("pageSize", "100"); // Maximum allowed page size
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${oauthToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(
        `Failed to fetch picked media items for session '${sessionId}' (page ${pageCount}): ${res.status} ${res.statusText}`
      );
    }

    const data = await res.json();
    const mediaItems = data.mediaItems || [];

    console.log(`Page ${pageCount}: Retrieved ${mediaItems.length} items`);
    allMediaItems.push(...mediaItems);

    // Update progress - page completed
    onProgress?.({
      currentPage: pageCount,
      totalItemsFetched: allMediaItems.length,
      isComplete: false,
    });

    // Get the next page token
    pageToken = data.nextPageToken;
  } while (pageToken);

  // Final progress update
  onProgress?.({
    currentPage: pageCount,
    totalItemsFetched: allMediaItems.length,
    isComplete: true,
  });

  console.log(
    `✅ Fetched all ${allMediaItems.length} media items across ${pageCount} pages`
  );
  return allMediaItems as MediaItem[];
}
