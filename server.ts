#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { file } from "bun";

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
  selectedDirectoryPath: string;
  timestamp: string;
}

interface DownloadProgress {
  total: number;
  downloaded: number;
  skipped: number;
  failed: number;
  currentFile: string | null;
  isComplete: boolean;
  errors: string[];
}

// Global progress tracking
const downloadProgress: Map<string, DownloadProgress> = new Map();

async function downloadFile(
  url: string,
  filepath: string,
  oauthToken: string
): Promise<void> {
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
}

async function processDownloads(sessionData: SessionData, progressId: string) {
  const { oauthToken, mediaItems, selectedDirectoryPath } = sessionData;

  // Create target directory if it doesn't exist
  const resolvedTargetDir = resolve(selectedDirectoryPath);
  if (!existsSync(resolvedTargetDir)) {
    mkdirSync(resolvedTargetDir, { recursive: true });
  }

  // Initialize progress
  const progress: DownloadProgress = {
    total: mediaItems.length,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    currentFile: null,
    isComplete: false,
    errors: [],
  };
  downloadProgress.set(progressId, progress);

  // Analyze existing files
  const existingFiles = new Set<string>();
  try {
    const files = readdirSync(resolvedTargetDir);
    files.forEach((file) => existingFiles.add(file));
  } catch (error) {
    console.log(`⚠️  Could not read directory: ${error}`);
  }

  // Process downloads
  for (let i = 0; i < mediaItems.length; i++) {
    const item = mediaItems[i];
    const { mediaFile } = item;

    if (!mediaFile?.filename || !mediaFile?.baseUrl) {
      progress.failed++;
      progress.errors.push(`Item ${i + 1}: Missing filename or baseUrl`);
      continue;
    }

    const { filename, baseUrl, mimeType } = mediaFile;
    const targetPath = join(resolvedTargetDir, filename);

    progress.currentFile = filename;
    downloadProgress.set(progressId, { ...progress });

    // Check if file already exists
    if (existingFiles.has(filename)) {
      progress.skipped++;
      existingFiles.add(filename);
      continue;
    }

    // Download the file
    try {
      const downloadUrl = `${baseUrl}=d`;
      await downloadFile(downloadUrl, targetPath, oauthToken);
      progress.downloaded++;
      existingFiles.add(filename);
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

console.log(
  `🚀 Google Photos Sync server running at http://localhost:${server.port}`
);
console.log(`📁 Serving static files from ./dist`);
console.log(`🔗 Open http://localhost:3000 in your browser to start syncing`);
