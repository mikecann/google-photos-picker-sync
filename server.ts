#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { file } from "bun";
import { tmpdir } from "os";

// Environment check function
function checkEnvironmentVariables() {
  const requiredVar = "VITE_GOOGLE_CLIENT_ID";
  const value = process.env[requiredVar];

  if (!value || value.trim() === "") {
    console.error("");
    console.error("🚨 SETUP REQUIRED: Missing Google Photos API Configuration");
    console.error(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );
    console.error("");
    console.error(
      `❌ The ${requiredVar} environment variable is required to run this application.`
    );
    console.error("");
    console.error(
      "📖 PLEASE READ THE README FILE FOR COMPLETE SETUP INSTRUCTIONS:"
    );
    console.error(
      "   https://github.com/mikecann/google-photos-picker-sync#google-cloud-console-setup"
    );
    console.error("");
    console.error("📋 Quick Setup Summary:");
    console.error(
      "   1. Go to Google Cloud Console (https://console.cloud.google.com/)"
    );
    console.error("   2. Create a new project or select existing one");
    console.error('   3. Enable "Google Photos Picker API"');
    console.error("   4. Set up OAuth consent screen");
    console.error("   5. Create OAuth 2.0 Client ID credentials");
    console.error("   6. Copy your Client ID");
    console.error(
      "   7. Create a .env file with: VITE_GOOGLE_CLIENT_ID=your_client_id_here"
    );
    console.error("");
    console.error(
      "⚠️  IMPORTANT: The README contains detailed step-by-step instructions"
    );
    console.error(
      "   with screenshots and troubleshooting to avoid common mistakes."
    );
    console.error("");
    console.error(
      "💡 For development server, create .env file in the project root directory."
    );
    console.error("");
    console.error("🔄 After setup, restart this application.");
    console.error("");
    console.error(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );
    console.error("");
    process.exit(1);
  }

  console.log(`✅ Environment check passed: ${requiredVar} is configured`);
}

interface MediaFile {
  filename: string;
  baseUrl: string;
  mimeType: string;
}

interface MediaItem {
  id: string;
  createTime: string;
  type: "PHOTO" | "VIDEO";
  mediaFile: MediaFile;
}

interface SessionData {
  oauthToken: string;
  sessionId: string;
  mediaItems: MediaItem[];
  downloadSettings?: {
    includePhotos: boolean;
    includeVideos: boolean;
    imageQuality: "original" | "high" | "medium" | "low";
    imageMaxWidth?: number;
    imageMaxHeight?: number;
    imageCrop: boolean;
    videoQuality: "original" | "high" | "thumbnail";
    videoRemoveOverlay: boolean;
  };
  timestamp: string;
}

interface DownloadProgress {
  total: number;
  downloaded: number;
  failed: number;
  currentFile: string | null;
  isComplete: boolean;
  errors: string[];
  files: Array<{ filename: string; size: number; ready: boolean }>;
}

// Global progress tracking
const downloadProgress: Map<string, DownloadProgress> = new Map();
const downloadDirs: Map<string, string> = new Map(); // Maps progressId to temp directory

// Generate the correct Google Photos download URL based on settings
function generateDownloadUrl(
  baseUrl: string,
  mediaType: "PHOTO" | "VIDEO",
  mimeType: string,
  settings?: SessionData["downloadSettings"]
): string {
  if (!settings) {
    // Fallback to original logic
    const isVideo = mediaType === "VIDEO" || mimeType.startsWith("video/");
    return `${baseUrl}=${isVideo ? "dv" : "d"}`;
  }

  const isVideo = mediaType === "VIDEO" || mimeType.startsWith("video/");

  if (isVideo) {
    // Video download settings
    if (settings.videoQuality === "thumbnail") {
      // Download thumbnail
      let params = "w1280-h720";
      if (settings.videoRemoveOverlay) {
        params += "-no";
      }
      return `${baseUrl}=${params}`;
    } else {
      // Download full video (original or high)
      return `${baseUrl}=dv`;
    }
  } else {
    // Image download settings
    if (settings.imageQuality === "original") {
      return `${baseUrl}=d`;
    }

    // Custom or preset quality
    let width: number, height: number;

    if (settings.imageMaxWidth && settings.imageMaxHeight) {
      // Custom dimensions
      width = settings.imageMaxWidth;
      height = settings.imageMaxHeight;
    } else {
      // Preset quality levels
      switch (settings.imageQuality) {
        case "high":
          width = 2048;
          height = 2048;
          break;
        case "medium":
          width = 1024;
          height = 1024;
          break;
        case "low":
          width = 512;
          height = 512;
          break;
        default:
          return `${baseUrl}=d`; // Fallback to original
      }
    }

    let params = `w${width}-h${height}`;
    if (settings.imageCrop) {
      params += "-c";
    }

    return `${baseUrl}=${params}`;
  }
}

async function downloadFile(
  url: string,
  filepath: string,
  oauthToken: string
): Promise<number> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "User-Agent": "Google-Photos-Sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  writeFileSync(filepath, buffer);
  return buffer.length;
}

async function processDownloads(sessionData: SessionData, progressId: string) {
  const { oauthToken, mediaItems, downloadSettings } = sessionData;

  // Create temporary directory for this download session
  const tempDir = join(tmpdir(), `google-photos-sync-${progressId}`);
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }
  downloadDirs.set(progressId, tempDir);

  // Initialize progress
  const progress: DownloadProgress = {
    total: mediaItems.length,
    downloaded: 0,
    failed: 0,
    currentFile: null,
    isComplete: false,
    errors: [],
    files: [],
  };
  downloadProgress.set(progressId, progress);

  // Process downloads
  for (let i = 0; i < mediaItems.length; i++) {
    const item = mediaItems[i];
    const { mediaFile } = item;

    if (!mediaFile?.filename || !mediaFile?.baseUrl) {
      progress.failed++;
      progress.errors.push(`Item ${i + 1}: Missing filename or baseUrl`);
      continue;
    }

    const { filename, baseUrl } = mediaFile;
    const targetPath = join(tempDir, filename);

    progress.currentFile = filename;
    downloadProgress.set(progressId, { ...progress });

    // Download the file
    try {
      // Generate URL based on settings and media type
      const downloadUrl = generateDownloadUrl(
        baseUrl,
        item.type,
        mediaFile.mimeType,
        downloadSettings
      );
      const fileSize = await downloadFile(downloadUrl, targetPath, oauthToken);

      progress.downloaded++;
      progress.files.push({
        filename,
        size: fileSize,
        ready: true,
      });
    } catch (error) {
      progress.failed++;
      progress.errors.push(`${filename}: ${error}`);
    }

    // Update progress
    downloadProgress.set(progressId, { ...progress });

    // Small delay to be nice to Google's servers
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Mark as complete
  progress.isComplete = true;
  progress.currentFile = null;
  downloadProgress.set(progressId, { ...progress });
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // API endpoints
    if (url.pathname.startsWith("/api/")) {
      // Start download endpoint
      if (url.pathname === "/api/download" && req.method === "POST") {
        try {
          const body = (await req.json()) as SessionData;
          const progressId = `download-${Date.now()}`;

          // Start downloads in background
          processDownloads(body, progressId).catch(console.error);

          return Response.json({
            success: true,
            progressId,
            message: "Download started",
          });
        } catch (error) {
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 400 }
          );
        }
      }

      // Progress endpoint
      if (url.pathname === "/api/progress" && req.method === "GET") {
        const progressId = url.searchParams.get("id");
        if (!progressId) {
          return Response.json(
            { error: "Missing progress ID" },
            { status: 400 }
          );
        }

        const progress = downloadProgress.get(progressId);
        if (!progress) {
          return Response.json(
            { error: "Progress not found" },
            { status: 404 }
          );
        }

        return Response.json(progress);
      }

      // Download file endpoint
      if (url.pathname === "/api/file" && req.method === "GET") {
        const progressId = url.searchParams.get("progressId");
        const filename = url.searchParams.get("filename");

        if (!progressId || !filename) {
          return Response.json(
            { error: "Missing progressId or filename" },
            { status: 400 }
          );
        }

        const tempDir = downloadDirs.get(progressId);
        if (!tempDir) {
          return Response.json(
            { error: "Download session not found" },
            { status: 404 }
          );
        }

        const filePath = join(tempDir, filename);
        if (!existsSync(filePath)) {
          return Response.json({ error: "File not found" }, { status: 404 });
        }

        return new Response(file(filePath));
      }

      // Cleanup endpoint
      if (url.pathname === "/api/cleanup" && req.method === "POST") {
        const { progressId } = await req.json();

        const tempDir = downloadDirs.get(progressId);
        if (tempDir && existsSync(tempDir)) {
          try {
            rmSync(tempDir, { recursive: true, force: true });
            downloadDirs.delete(progressId);
            downloadProgress.delete(progressId);
            return Response.json({ success: true });
          } catch {
            return Response.json({ error: "Cleanup failed" }, { status: 500 });
          }
        }

        return Response.json({ success: true });
      }

      // Unknown API endpoint
      return new Response("Not Found", { status: 404 });
    }

    // Serve static files from dist directory
    const distPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(import.meta.dir, "dist", distPath);

    if (existsSync(filePath)) {
      const fileContent = file(filePath);

      // Set appropriate content type
      let contentType = "text/plain";
      if (distPath.endsWith(".html")) contentType = "text/html";
      else if (distPath.endsWith(".js")) contentType = "application/javascript";
      else if (distPath.endsWith(".css")) contentType = "text/css";
      else if (distPath.endsWith(".json")) contentType = "application/json";

      return new Response(fileContent, {
        headers: { "Content-Type": contentType },
      });
    }

    // If file not found in dist, serve index.html (for SPA routing)
    const indexPath = join(import.meta.dir, "dist", "index.html");
    if (existsSync(indexPath)) {
      return new Response(file(indexPath), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

// Check environment variables before starting
checkEnvironmentVariables();

console.log(
  `🚀 Google Photos Sync server running at http://localhost:${server.port}`
);
console.log(`📁 Serving static files from ./dist`);
console.log(`🔗 Open http://localhost:3000 in your browser to start syncing`);
