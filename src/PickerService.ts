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
}: {
  oauthToken: string;
  sessionId: string;
}) {
  if (!oauthToken || !sessionId) {
    throw new Error(
      `Missing oauthToken or sessionId for pollSession - oauthToken: ${!!oauthToken}, sessionId: ${!!sessionId}`
    );
  }

  let pollInterval = 2000; // Start with 2 seconds
  let totalTimeout = 300000; // 5 minutes total timeout
  let elapsed = 0;

  while (elapsed < totalTimeout) {
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

    // Check if user has finished selecting media
    if (data.mediaItemsSet === true) {
      return true;
    }

    // Update polling configuration if provided by the API
    if (data.pollingConfig) {
      if (data.pollingConfig.pollInterval) {
        pollInterval = data.pollingConfig.pollInterval;
      }
      if (data.pollingConfig.timeoutIn) {
        totalTimeout = data.pollingConfig.timeoutIn;
      }
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;
  }

  return false; // Timed out
}

export async function fetchPickedMediaItems({
  oauthToken,
  sessionId,
}: {
  oauthToken: string;
  sessionId: string;
}) {
  if (!oauthToken || !sessionId) {
    throw new Error(
      `Missing oauthToken or sessionId for fetchPickedMediaItems - oauthToken: ${!!oauthToken}, sessionId: ${!!sessionId}`
    );
  }

  const res = await fetch(
    `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}`,
    {
      headers: {
        Authorization: `Bearer ${oauthToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch picked media items for session '${sessionId}': ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();
  return (data.mediaItems || []) as MediaItem[];
}
