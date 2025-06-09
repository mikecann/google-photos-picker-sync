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
- Google Photos API credentials

### Setup

1. **Clone and install dependencies:**
   ```bash
   bun install
   ```

2. **Build the application:**
   ```bash
   bun run build
   ```

3. **Start the server:**
   ```bash
   bun run start
   ```
   
   Or for development:
   ```bash
   bun run server
   ```

4. **Open your browser and navigate to:**
   ```
   http://localhost:3000
   ```

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

## 📁 Directory Structure

```
google-photos-picker-sync/
├── src/                    # React application source
│   ├── App.tsx
│   ├── SyncButton.tsx     # Main sync interface with progress
│   ├── GoogleAuthProvider.tsx
│   ├── PickerService.ts   # Google Photos Picker API
│   └── ...
├── server.ts              # Bun server (serves app + API)
└── dist/                  # Built application (auto-generated)
```

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

## 🎨 Development

For development, you can run the React app separately:

```bash
# Terminal 1: Start Vite dev server
bun run dev

# Terminal 2: Start API server only (if needed)
bun run server
```

## 📝 Notes

- The application prompts for the full directory path for security reasons
- Downloads include a small delay between files to be respectful to Google's servers
- Existing files are automatically skipped to avoid duplicates
- Progress is tracked and displayed in real-time

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test with `bun run start`
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
