import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "./GoogleAuthProvider";

export default function AuthButton() {
  const { oauthToken, setOauthToken } = useAuth();
  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/photos.picker.readonly",
    onSuccess: (tokenResponse) => {
      setOauthToken(tokenResponse.access_token);
    },
  });
  return (
    <button onClick={() => login()} disabled={!!oauthToken}>
      {oauthToken ? "Signed in" : "Sign in with Google"}
    </button>
  );
}
