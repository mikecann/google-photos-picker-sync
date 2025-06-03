# Install 

Below are the concise steps needed to obtain the three environment variables:

```env
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE  
VITE_GOOGLE_API_KEY=YOUR_API_KEY_HERE  
VITE_GOOGLE_ALBUM_ID=YOUR_ALBUM_ID_HERE  
```

Each step includes links and citations to official documentation.

---

## 1. Create (or select) a Google Cloud Project

1. Navigate to the Google Cloud Console: [https://console.cloud.google.com/](https://console.cloud.google.com/)

2. If you don’t already have a project, click the project dropdown (top-left) → **New Project** name doest matter


## 2. Enable the Google Photos Picker API

1. While in your new (or chosen) project, go to **APIs & Services → Library**.
2. Search for **“Google Photos Picker API”** and click on it.
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

## 5. Obtain the Google Photos Album ID (for VITE\_GOOGLE\_ALBUM\_ID)

### Option A: Use the Web URL (if album is shared)

1. In **Google Photos**, open the album you want to sync.

2. Click **Share** → **Create link** (if not already shared).

3. Copy the resulting link, which looks like:

   ```
   https://photos.app.goo.gl/AbCdEFGhIjkLmNoP?p=AbCdEFGhIjkLmNoP
   ```

4. The part after the last slash (before `?`) is often a Firebase short link, not the API “albumId.” Instead, do the steps in **Option B** below—relying on the Photos Library listing to retrieve the album’s real ID.


