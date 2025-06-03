import type { MediaItem } from "./types";

export async function launchPicker({ oauthToken }: { oauthToken: string }) {
  if (!oauthToken) return null;

  const createSessionResponse = await fetch(
    "https://photospicker.googleapis.com/v1/sessions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${oauthToken}`,
      },
      body: JSON.stringify({
        albumId: import.meta.env.VITE_GOOGLE_ALBUM_ID,
        view: { includeMediaTypes: ["PHOTO", "VIDEO"] },
      }),
    }
  );
  if (!createSessionResponse.ok)
    throw new Error(
      `Failed to create picker session: ${createSessionResponse.statusText}`
    );
  const session = await createSessionResponse.json();
  const pickerUri = session.sessionUri;
  const sessionId = session.sessionId;
  window.open(pickerUri, "_blank", "width=600,height=600");
  // In a real app, you'd want to listen for the session completion
  // For now, just return sessionId for next step
  return sessionId;
}

export async function fetchMediaItems({
  oauthToken,
  sessionId,
}: {
  oauthToken: string;
  sessionId: string;
}) {
  const mediaItemsResponse = await fetch(
    `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}`,
    {
      headers: {
        Authorization: `Bearer ${oauthToken}`,
      },
    }
  );
  if (!mediaItemsResponse.ok)
    throw new Error(
      `Failed to fetch media items: ${mediaItemsResponse.statusText}`
    );
  const mediaItemsJson = await mediaItemsResponse.json();
  return mediaItemsJson.mediaItems as MediaItem[];
}
