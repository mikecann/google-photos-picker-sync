import { GoogleAuthProvider } from "./GoogleAuthProvider";
import AuthButton from "./AuthButton";
import SyncButton from "./SyncButton";

export default function App() {
  return (
    <GoogleAuthProvider>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          alignItems: "center",
          marginTop: 40,
        }}
      >
        <h1>Google Photos Picker Sync</h1>
        <AuthButton />
        <SyncButton />
      </div>
    </GoogleAuthProvider>
  );
}
