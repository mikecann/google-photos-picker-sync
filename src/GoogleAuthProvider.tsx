import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

interface AuthContextType {
  oauthToken: string | null;
  setOauthToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within a GoogleAuthProvider");
  return ctx;
}

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [oauthToken, setOauthToken] = useState<string | null>(null);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthContext.Provider value={{ oauthToken, setOauthToken }}>
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}
