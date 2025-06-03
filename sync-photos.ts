#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

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

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(
      "❌ Usage: bun run sync-photos.ts <session-file.json> <target-directory>"
    );
    console.log("");
    console.log("Example:");
    console.log(
      "  bun run sync-photos.ts google-photos-session-1234567890.json ./my-photos"
    );
    process.exit(1);
  }

  const [sessionFilePath, targetDirectory] = args;

  // Validate session file
  if (!existsSync(sessionFilePath)) {
    console.log(`❌ Session file not found: ${sessionFilePath}`);
    process.exit(1);
  }

  // Read and parse session data
  console.log("📄 Reading session data...");
  let sessionData: SessionData;
  try {
    const sessionContent = await Bun.file(sessionFilePath).text();
    sessionData = JSON.parse(sessionContent);
    console.log(
      `✅ Loaded session with ${sessionData.mediaItems.length} items`
    );
    console.log(
      `🕐 Session created: ${new Date(sessionData.timestamp).toLocaleString()}`
    );
  } catch (error) {
    console.log(`❌ Failed to parse session file: ${error}`);
    process.exit(1);
  }

  // Create target directory if it doesn't exist
  const resolvedTargetDir = resolve(targetDirectory);
  if (!existsSync(resolvedTargetDir)) {
    console.log(`📁 Creating directory: ${resolvedTargetDir}`);
    mkdirSync(resolvedTargetDir, { recursive: true });
  } else {
    console.log(`📁 Using existing directory: ${resolvedTargetDir}`);
  }

  // Analyze existing files
  console.log("🔍 Analyzing existing files...");
  const existingFiles = new Set<string>();
  try {
    const files = readdirSync(resolvedTargetDir);
    files.forEach((file) => {
      existingFiles.add(file);
      console.log(`  📄 Found: ${file}`);
    });
    console.log(`📊 Found ${existingFiles.size} existing files`);
  } catch (error) {
    console.log(`⚠️  Could not read directory: ${error}`);
  }

  // Process downloads
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  console.log("\n🚀 Starting downloads...\n");

  for (let i = 0; i < sessionData.mediaItems.length; i++) {
    const item = sessionData.mediaItems[i];
    const { mediaFile } = item;

    if (!mediaFile?.filename || !mediaFile?.baseUrl) {
      console.log(
        `⚠️  [${i + 1}/${
          sessionData.mediaItems.length
        }] Skipping item missing filename or baseUrl`
      );
      failed++;
      continue;
    }

    const { filename, baseUrl, mimeType } = mediaFile;
    const targetPath = join(resolvedTargetDir, filename);

    // Check if file already exists
    if (existingFiles.has(filename)) {
      console.log(
        `⏭️  [${i + 1}/${
          sessionData.mediaItems.length
        }] Skipping existing: ${filename}`
      );
      skipped++;
      continue;
    }

    // Download the file
    console.log(
      `⬇️  [${i + 1}/${
        sessionData.mediaItems.length
      }] Downloading: ${filename} (${mimeType})`
    );
    try {
      const downloadUrl = `${baseUrl}=d`;
      await downloadFile(downloadUrl, targetPath, sessionData.oauthToken);

      // Get file size for confirmation
      const stat = await Bun.file(targetPath).size;
      console.log(
        `✅ Downloaded: ${filename} (${(stat / 1024 / 1024).toFixed(2)} MB)`
      );
      downloaded++;

      // Add to existing files set to avoid duplicates in this session
      existingFiles.add(filename);
    } catch (error) {
      console.log(`❌ Failed to download ${filename}: ${error}`);
      failed++;
    }

    // Small delay to be nice to Google's servers
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Final summary
  console.log("\n📊 Download Summary:");
  console.log(`✅ Downloaded: ${downloaded} files`);
  console.log(`⏭️  Skipped (existing): ${skipped} files`);
  console.log(`❌ Failed: ${failed} files`);
  console.log(`📁 Target directory: ${resolvedTargetDir}`);

  if (downloaded > 0) {
    console.log("\n🎉 Downloads completed successfully!");
  } else if (skipped > 0 && failed === 0) {
    console.log("\n✨ All files already exist - nothing to download!");
  } else {
    console.log(
      "\n⚠️  Some files could not be downloaded. Check the errors above."
    );
  }
}

// Run the script
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
