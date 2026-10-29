import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { authApi } from "../api/auth.api.js";
import { storage } from "../utils/storage.js";
import useToast from "../hooks/useToast.js";

export default function OAuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    window.history.replaceState(null, "", window.location.pathname);

    if (!token) {
      toast.error("Login Failed");
      navigate("/login", { replace: true });
      return;
    }

    // apiFetch reads the token from storage, so set it before calling getMe
    storage.setToken(token);
    authApi
      .getMe()
      .then((user) => {
        login({ id: user._id, name: user.name, email: user.email }, token);
        navigate("/home", { replace: true });
      })
      .catch((err) => {
        console.error(err);
        storage.clear();
        toast.error("Login Failed");
        navigate("/login", { replace: true });
      });
  }, [login, navigate, toast]);

  return (
    <div className="font-body min-h-screen flex items-center justify-center bg-background-muted text-foreground-muted">
      Signing you in...
    </div>
  );
}
