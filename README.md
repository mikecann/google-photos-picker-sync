# Google Photos Picker Sync

A seamless way to sync photos from Google Photos to your local drive using the Google Photos Picker API.

## 🎯 Features

- **Google OAuth Authentication** - Secure access to your Google Photos
- **Interactive Photo Picker** - Visual selection of photos using Google's picker
- **Real-time Progress Tracking** - Live updates during download
- **Local Server Architecture** - Bypasses CORS restrictions for seamless downloads
- **Smart Duplicate Detection** - Skips files that already exist
- **Batch Processing** - Efficiently downloads multiple files

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) installed on your system
- **Google Photos API credentials** (see setup instructions below)

### Setup

1. **⚠️ FIRST: Set up Google Photos API access**
   - Follow the [Google Cloud Console Setup](#️-google-cloud-console-setup) instructions below
   - This step is **required** - the app will not work without it!

2. **Clone and install dependencies:**
   ```bash
   bun install
   ```

3. **Build the application:**
   ```bash
   bun run build
   ```

4. **Start the server:**
   ```bash
   bun run start
   ```
   
   Or for development:
   ```bash
   bun run server
   ```

5. **Open your browser and navigate to:**
   ```
   http://localhost:3000
   ```

## ⚙️ Google Cloud Console Setup

**⚠️ IMPORTANT: This step is required before running the application!**

You need to set up Google Photos API access through Google Cloud Console. Follow these steps carefully:

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click **"Select a project"** dropdown at the top
4. Click **"New Project"**
5. Enter a project name (e.g., "My Photos Sync App")
6. Click **"Create"**
7. Wait for the project to be created and make sure it's selected

### Step 2: Enable Required APIs

1. In your Google Cloud Console, go to **"APIs & Services" > "Library"**
2. Search for **"Google Photos Picker API"**
3. Click on **"Google Photos Picker API"**
4. Click **"Enable"**
5. Wait for the API to be enabled

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Select **"External"** user type (unless you have a Google Workspace account)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: Enter a name for your app (e.g., "My Photos Sync")
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the **"Scopes"** page, click **"Save and Continue"** (no changes needed)
7. On the **"Test users"** page, click **"+ Add Users"**
8. Add your own email address as a test user
9. Click **"Save and Continue"**
10. Review the summary and click **"Back to Dashboard"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"+ Create Credentials"** at the top
3. Select **"OAuth 2.0 Client IDs"**
4. Choose **"Web application"** as the application type
5. Enter a name (e.g., "Photos Sync Client")
6. Under **"Authorized JavaScript origins"**, click **"+ Add URI"**
7. Add: `http://localhost:3000`
8. Under **"Authorized redirect URIs"**, click **"+ Add URI"**
9. Add: `http://localhost:3000`
10. Click **"Create"**

### Step 5: Get Your Client ID

1. After creating the OAuth client, a popup will show your credentials
2. **Copy the "Client ID"** (it looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
3. **Important**: Keep this Client ID safe - you'll need it in the next step

### Step 6: Create Environment File

1. In your project root directory, create a file named `.env`
2. Add this line to the `.env` file:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id_here
   ```
3. Replace `your_client_id_here` with the Client ID you copied in Step 5
4. Save the file

**Example `.env` file:**
```
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

### ⚠️ Common Issues and Solutions

- **"Error 403: access_denied"**: Make sure you added your email as a test user in Step 3
- **"Error 400: redirect_uri_mismatch"**: Verify you added `http://localhost:3000` to both JavaScript origins AND redirect URIs
- **"API not enabled"**: Make sure you enabled the "Photos Library API" in Step 2
- **"Invalid client ID"**: Double-check your `.env` file format and that the Client ID is correct

### 🔒 Security Notes

- Your `.env` file is already in `.gitignore` and won't be committed to Git
- The Client ID is not secret (it's visible in the browser), but keep your project secure
- For production use, you'll need to verify your app with Google (but not needed for personal use)

**For personal use only, you can skip app publishing and use the app as a "test" app.**

## 🏗️ How It Works

### New Architecture (Current)
1. **Bun Server** hosts the web application and provides API endpoints
2. **Browser** handles Google OAuth and photo selection
3. **Local API** receives session data and downloads files directly
4. **Real-time Progress** via polling the server for download status

### Benefits over Previous Architecture
- ✅ **Seamless Experience** - No manual file downloads or script execution
- ✅ **Real-time Progress** - Live updates during download process
- ✅ **CORS-free Downloads** - Server-side requests bypass browser limitations
- ✅ **Error Handling** - Better error reporting and recovery

## 🔧 Available Scripts

- `bun run start` - Build and start the production server
- `bun run server` - Start the development server (requires built files)
- `bun run build` - Build the React application
- `bun run dev` - Start Vite development server (legacy)

## 🔄 Migration from Legacy

The legacy CLI script has been removed. Please use the web interface at `http://localhost:3000` for all photo syncing operations.

## 🌐 API Endpoints

- `POST /api/download` - Start download process with session data
- `GET /api/progress?id={progressId}` - Get download progress

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
