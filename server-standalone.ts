#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
// file function is available as Bun.file()
import { tmpdir } from "os";

// Import static files to embed them in the executable
import indexHtml from "./dist/index.html" with { type: "file" };
import viteSvg from "./dist/vite.svg" with { type: "file" };

// Dynamically import assets based on what's actually built
import { readdirSync, readFileSync } from "fs";
const assetsDir = "./dist/assets";
const assetFiles = readdirSync(assetsDir);
const jsFile = assetFiles.find(f => f.startsWith("index-") && f.endsWith(".js"));
const cssFile = assetFiles.find(f => f.startsWith("index-") && f.endsWith(".css"));

if (!jsFile || !cssFile) {
  throw new Error("Could not find built assets. Run 'bun run build' first.");
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

// Static file mapping
const staticFiles = new Map([
  ["/", indexHtml],
  ["/index.html", indexHtml],
  ["/vite.svg", viteSvg],
  [`/assets/${jsFile}`, `./dist/assets/${jsFile}`],
  [`/assets/${cssFile}`, `./dist/assets/${cssFile}`],
]);

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
  const { oauthToken, mediaItems } = sessionData;

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
      const downloadUrl = `${baseUrl}=d`;
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

function getContentType(path: string): string {
  if (path === "/" || path.endsWith(".html")) return "text/html";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".svg")) return "image/svg+xml";
  return "text/plain";
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

        return new Response(Bun.file(filePath));
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

    // Serve embedded static files
    const staticFile = staticFiles.get(url.pathname);
    if (staticFile) {
      return new Response(Bun.file(staticFile), {
        headers: { "Content-Type": getContentType(url.pathname) },
      });
    }

    // For SPA routing, serve index.html for unknown paths
    return new Response(Bun.file(indexHtml), {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(
  `🚀 Google Photos Sync server running at http://localhost:${server.port}`
);
console.log(`📦 Serving embedded static files (standalone mode)`);
console.log(`🔗 Open http://localhost:3000 in your browser to start syncing`); 