import { useState, useRef, useEffect } from "react";
import {
  Mail,
  Lock,
  Camera,
  Save,
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DarkModeToggle from "@/components/DarkModeToggle";
import { useAuth } from "@/hooks/useAuth";
import useToast from "@/hooks/useToast";
import { authApi } from "@/api/auth.api";
import { storage } from "@/utils/storage";

// ─── tiny section wrapper ────────────────────────────────────────────────────
function Section({ title, description, children }) {
  return (
    <div className="border border-border-muted/60 rounded-xl p-6 flex flex-col gap-5 bg-background">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-foreground/50 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── labelled input ──────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-foreground/60">{label}</label>
      {children}
    </div>
  );
}

const inputCls = `w-full px-3 py-2 text-sm rounded-lg bg-background
  border border-border-muted/60 focus:border-border focus:outline-none
  focus:ring-1 focus:ring-border text-foreground transition-colors
  placeholder:text-foreground/30`;

// ─── main page ───────────────────────────────────────────────────────────────
export default function AccountSettings() {
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();
  const toast = useToast();

  /* profile state */
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatarPreview, setAvatarPreview] = useState(
    user?.profilePicture ?? null,
  );
  const [avatarFile, setAvatarFile] = useState(null);

  // Stored user may lack profilePicture, so load the fresh profile once
  useEffect(() => {
    authApi
      .getMe()
      .then((me) => {
        setName(me.name);
        setEmail(me.email);
        setAvatarPreview(me.profilePicture ?? null);
      })
      .catch(() => {});
  }, []);

  /* password state */
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  /* ui state */
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwError, setPwError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fileInputRef = useRef(null);

  /* ── avatar pick ── */
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  /* ── save profile ── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      // Build a FormData if there's a new avatar, otherwise plain object
      const payload = avatarFile
        ? (() => {
            const fd = new FormData();
            fd.append("name", name.trim());
            fd.append("email", email.trim());
            fd.append("avatar", avatarFile);
            return fd;
          })()
        : { name: name.trim(), email: email.trim() };

      const me = await authApi.updateProfile(payload);
      login(
        { ...user, name: me.name, email: me.email, profilePicture: me.profilePicture },
        storage.getToken(),
      );
      setAvatarFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── change password ── */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");

    if (newPw.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("New passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setPwError(err?.message ?? "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await authApi.deleteAccount();
      logout();
      navigate("/");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const seedUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "User")}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── top bar ── */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border-muted/40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors text-foreground/60 hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-semibold">Account Settings</h1>

          {saved && (
            <span className="ml-auto text-xs text-success font-medium animate-in fade-in">
              Saved ✓
            </span>
          )}
        </div>
        <div className="absolute right-3 top-2">
          <DarkModeToggle />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* ── profile section ── */}
        <Section
          title="Profile"
          description="Update your display name, email, and photo."
        >
          {/* avatar */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="relative group w-20 h-20 flex-shrink-0">
              <img
                src={avatarPreview ?? seedUrl}
                alt={name}
                className="w-20 h-20 rounded-full object-cover border-2 border-border-muted/60"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0
                group-hover:opacity-100 transition-opacity flex items-center
                justify-center text-white"
                title="Change photo"
              >
                <Camera size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{name || "Your Name"}</span>
              <span className="text-xs text-foreground/50">{email}</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-foreground/50 hover:text-foreground
                underline underline-offset-2 text-left transition-colors mt-0.5"
              >
                Change photo
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <Field label="Display name">
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </Field>

            <Field label="Email">
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"
                />
                <input
                  className={`${inputCls} pl-8`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </Field>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                font-medium bg-primary text-primary-foreground
                hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </Section>

        {/* ── password section ── */}
        <Section
          title="Password"
          description="Use a strong password you don't use elsewhere."
        >
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <Field label="Current password">
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"
                />
                <input
                  className={`${inputCls} pl-8 pr-9`}
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Leave blank if you sign in with Google/GitHub"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/30
                  hover:text-foreground/60 transition-colors"
                >
                  {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </Field>

            <Field label="New password">
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"
                />
                <input
                  className={`${inputCls} pl-8 pr-9`}
                  type={showNewPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/30
                  hover:text-foreground/60 transition-colors"
                >
                  {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </Field>

            <Field label="Confirm new password">
              <input
                className={inputCls}
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            {pwError && <p className="text-xs text-danger">{pwError}</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                font-medium bg-primary text-primary-foreground
                hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50"
              >
                <Lock size={14} />
                {saving ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </Section>

        {/* ── danger zone ── */}
        <Section title="Danger zone">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-danger">Delete account</p>
              <p className="text-xs text-foreground/50 mt-0.5">
                Permanently remove your account and all associated data. This
                cannot be undone.
              </p>
            </div>

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg
                text-xs font-medium text-danger border border-danger/30
                hover:bg-danger/10 active:scale-95 transition-all"
              >
                <Trash2 size={13} /> Delete
              </button>
            ) : (
              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <div className="flex items-center gap-1 text-xs text-danger">
                  <AlertTriangle size={12} /> Are you sure?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium
                    hover:bg-foreground/8 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-danger text-background hover:opacity-90 active:scale-95 transition-all"
                  >
                    Yes, delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
