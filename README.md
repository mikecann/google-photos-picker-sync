# Google Photos Picker Sync

A hybrid solution for bulk downloading photos from Google Photos using the Google Photos Picker API.

## How It Works

This app uses a **two-step hybrid approach** to avoid browser CORS limitations:

1. **Browser App**: Handles OAuth authentication and photo selection
2. **Bun Script**: Performs bulk downloads without CORS restrictions

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Below are the concise steps needed to obtain the three environment variables:

```env
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE  
VITE_GOOGLE_API_KEY=YOUR_API_KEY_HERE  
```

Each step includes links and citations to official documentation.

---

## 1. Create (or select) a Google Cloud Project

1. Navigate to the Google Cloud Console: [https://console.cloud.google.com/](https://console.cloud.google.com/)

2. If you don't already have a project, click the project dropdown (top-left) → **New Project** name doest matter


## 2. Enable the Google Photos Picker API

1. While in your new (or chosen) project, go to **APIs & Services → Library**.
2. Search for **"Google Photos Picker API"** and click on it.
3. Click **Enable**.


## 3. Create OAuth 2.0 Client ID 

1. Go to **APIs & Services → Credentials** in the Cloud Console.

2. Click **Create Credentials → OAuth client ID**.

3. Under **Application type**, select **Web application**.

4. In **Authorized JavaScript origins**, add your local dev URL (e.g., `http://localhost:3000`).

5. Click **Create**.

6. Copy the displayed **Client ID** (looks like `1234567890-abcde.apps.googleusercontent.com`) and set it as:

   ```text
   VITE_GOOGLE_CLIENT_ID=1234567890-abcde.apps.googleusercontent.com
   ```
---

## 4. Create an API Key (for VITE\_GOOGLE\_API\_KEY)

1. Still under **APIs & Services → Credentials**, click **Create Credentials → API key**.

2. Google will generate a new API key (a long alphanumeric string, e.g., `AIzaSyD…`).

3. Copy that key and set it as:

   ```text
   VITE_GOOGLE_API_KEY=AIzaSyD…  
   ```

---

## Usage

### Step 1: Run the Browser App

Start the development server:

```bash
bun run dev
```

Open your browser to `http://localhost:5173` and:

1. **Sign in** with your Google account
2. **Click "Sync Photos"** 
3. **Select a folder** to compare against (to see what you already have)
4. **Pick photos** from Google Photos using the picker
5. **Download session data** - this saves a JSON file with your selection

### Step 2: Run the Bulk Download Script

After downloading the session file, run the Bun script:

```bash
bun run sync-photos [session-file.json] [target-directory]
```

**Example:**
```bash
bun run sync-photos google-photos-session-1748947890123.json ./my-photos
```

The script will:
- ✅ Read your session data and OAuth token
- 📁 Create the target directory if needed
- 🔍 Compare against existing files (skip duplicates)
- ⬇️ Download only new files with progress tracking
- 📊 Show a detailed summary when complete

### Alternative Script Usage

You can also run the script directly:

```bash
# Direct execution
bun sync-photos.ts session-file.json ./target-folder

# Or with explicit path
./sync-photos.ts session-file.json /absolute/path/to/photos
```

## Features

- 🔐 **Secure OAuth** - Full Google authentication in browser
- 🚫 **No CORS Issues** - Bun script bypasses browser limitations  
- 🔍 **Smart Deduplication** - Only downloads files you don't already have
- 📊 **Progress Tracking** - Detailed logging and progress indicators
- 🎯 **Bulk Downloads** - Download hundreds of photos automatically
- 💾 **File Integrity** - Direct binary downloads with size verification
- ⚡ **Fast & Efficient** - Concurrent downloads with rate limiting

## Troubleshooting

### OAuth Issues
- Make sure your Google Cloud project has the Photos Picker API enabled
- Verify your OAuth client ID is correctly set in `.env`
- Check that `http://localhost:5173` is in your authorized origins

### Download Issues  
- Ensure your OAuth token hasn't expired (tokens last ~1 hour)
- Check that the session file path is correct
- Verify the target directory is writable

### Rate Limiting
The script includes a 100ms delay between downloads to be respectful to Google's servers. For faster downloads, you can modify the delay in `sync-photos.ts`.

## Technical Details

- **Browser**: React + TypeScript + Vite for OAuth and picker UI
- **Script**: Bun TypeScript runtime for fast, CORS-free downloads  
- **API**: Google Photos Picker API with proper authentication
- **Storage**: File System Access API for folder selection in browser

## Why This Approach?

1. **CORS Limitations**: Google Photos URLs have CORS restrictions that prevent direct browser downloads
2. **OAuth Complexity**: Browser OAuth flow is much easier than CLI authentication
3. **Best of Both**: Hybrid approach gives us easy auth + unrestricted downloads
4. **Performance**: Bun is extremely fast for file operations and HTTP requests

---

*This project demonstrates a practical solution to Google Photos API limitations while maintaining security and user experience.*
