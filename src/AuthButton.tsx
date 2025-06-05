import { useAuth } from "./GoogleAuthProvider";

export default function AuthButton() {
  const { isSignedIn, user, signIn, signOut } = useAuth();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        padding: "24px",
        border: "2px solid #e0e0e0",
        borderRadius: "12px",
        backgroundColor: "#fafafa",
        maxWidth: "500px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h3 style={{ margin: "0 0 8px 0", color: "#333" }}>
          🔐 Step 1: Sign in with Google
        </h3>
        <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
          Connect to your Google Photos account to access your photos
        </p>
      </div>

      {isSignedIn ? (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "14px",
              color: "#4caf50",
              marginBottom: "12px",
              padding: "8px",
              backgroundColor: "#f1f8e9",
              borderRadius: "4px",
            }}
          >
            ✅ Signed in as {user?.name}
          </div>
          <button
            onClick={signOut}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              color: "#666",
              backgroundColor: "white",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={signIn}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            color: "white",
            backgroundColor: "#4285f4",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            minWidth: "180px",
          }}
        >
          Sign in with Google
        </button>
      )}
    </div>
  );
}
