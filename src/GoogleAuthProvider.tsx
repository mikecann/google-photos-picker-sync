import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";

interface User {
  name: string;
  email: string;
  picture: string;
}

interface AuthContextType {
  oauthToken: string | null;
  setOauthToken: (token: string | null) => void;
  isSignedIn: boolean;
  user: User | null;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within a GoogleAuthProvider");
  return ctx;
}

function AuthProviderInner({ children }: { children: ReactNode }) {
  const [oauthToken, setOauthToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
    onSuccess: (tokenResponse) => {
      setOauthToken(tokenResponse.access_token);
    },
  });

  // Fetch user info when token is available
  useEffect(() => {
    if (oauthToken) {
      fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${oauthToken}`
      )
        .then((response) => response.json())
        .then((data) => {
          setUser({
            name: data.name,
            email: data.email,
            picture: data.picture,
          });
        })
        .catch((error) => {
          console.error("Failed to fetch user info:", error);
        });
    } else {
      setUser(null);
    }
  }, [oauthToken]);

  const signOut = () => {
    setOauthToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    oauthToken,
    setOauthToken,
    isSignedIn: !!oauthToken,
    user,
    signIn: login,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </GoogleOAuthProvider>
  );
}
