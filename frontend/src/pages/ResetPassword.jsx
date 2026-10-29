import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Logo from "@/components/Logo";
import DarkModeToggle from "@/components/DarkModeToggle";
import PasswordInput from "@/components/PasswordInput";
import { authApi } from "../api/auth.api.js";
import useToast from "../hooks/useToast.js";

const inputClass =
  "border rounded-md p-3 w-full bg-background text-base sm:text-md border-border-muted focus:ring-1 focus:ring-border focus:outline-none";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success("Password updated, please sign in");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err.message || "Reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col font-body items-center justify-center bg-background-muted px-4 py-10">
      <Logo />
      <div className="absolute right-2 top-2">
        <DarkModeToggle />
      </div>
      <div className="text-xl sm:text-2xl mt-10 font-semibold p-2 text-foreground text-center">
        Reset your password
      </div>

      <div className="w-full max-w-md mt-6">
        {token ? (
          <form onSubmit={onSubmit}>
            <div className="mb-4">
              <label className="block mb-2 text-sm">New password</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className={inputClass}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="mb-6">
              <label className="block mb-2 text-sm">Confirm password</label>
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
                className={inputClass}
                placeholder="Repeat your password"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer bg-primary shadow-sm hover:bg-primary-hover rounded-md p-2 flex justify-center items-center text-primary-foreground font-semibold text-md w-full disabled:opacity-60"
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-foreground-muted text-center">
            This reset link is invalid.
          </p>
        )}

        <div className="mt-4 text-sm text-center">
          <button
            onClick={() => navigate("/login")}
            className="cursor-pointer text-primary hover:text-primary-hover"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
