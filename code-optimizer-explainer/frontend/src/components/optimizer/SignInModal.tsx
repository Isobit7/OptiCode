import { useState } from "react";
import { X, ShieldCheck, KeyRound, Cloud, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { registerUser, loginUser, loginGoogle } from "../../api/backend";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SignInModal({ isOpen, onClose, onSuccess }: SignInModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      try {
        localStorage.setItem("opticode_custom_api_key", apiKey.trim());
      } catch (err) {
        void err;
      }
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      if (activeTab === "register") {
        await registerUser(email, password, fullName || undefined);
      } else {
        await loginUser(email, password);
      }
      setAuthSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setAuthSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (providerName: string) => {
    setAuthError(null);
    setLoading(true);
    try {
      if (providerName === "Google") {
        await loginGoogle(email || undefined, fullName || "Google User");
      } else {
        await loginGoogle(email || undefined, fullName || `${providerName} User`);
      }
      setAuthSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setAuthSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message || `${providerName} login failed.`);
    } finally {
      setLoading(false);
    }
  };


  const socialProviders = [
    {
      name: "Google",
      icon: "https://ucarecdn.com/8f25a2ba-bdcf-4ff1-b596-088f330416ef/",
    },
    {
      name: "GitHub",
      icon: "https://ucarecdn.com/be5b0ffd-85e8-4639-83a6-5162dfa15a16/",
      invertDark: true,
    },
    {
      name: "LinkedIn",
      icon: "https://ucarecdn.com/95eebb9c-85cf-4d12-942f-3c40d7044dc6/",
    },
    {
      name: "Twitter",
      icon: "https://ucarecdn.com/82d7ca0a-c380-44c4-ba24-658723e2ab07/",
    },
    {
      name: "Apple",
      icon: "https://ucarecdn.com/3277d952-8e21-4aad-a2b7-d484dad531fb/",
      invertDark: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-all animate-fadeIn">
      {/* Backdrop Click to Close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 dark:border-white/20 bg-white/95 dark:bg-[#141418]/95 p-6 text-zinc-900 dark:text-white shadow-2xl sm:p-8 z-10 backdrop-blur-xl transition-colors duration-300">
        {/* Top Gradient Glow Accent */}
        <div
          className="absolute -top-24 left-1/2 h-36 w-64 -translate-x-1/2 rounded-full opacity-40 blur-2xl pointer-events-none"
          style={{ background: "var(--accent-warm)" }}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-white/80 transition hover:bg-zinc-200 dark:hover:bg-white/20 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center pt-2">
          <h2 className="font-headings text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {activeTab === "login" ? "Log in" : "Create your Account"}
          </h2>
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-white/70">
            Enjoy unlimited sessions, sync code history, or use custom AI models.
          </p>
        </div>

        {/* Login / Register Tab Switcher */}
        <div className="mt-5 flex rounded-xl bg-zinc-100 dark:bg-white/10 p-1 border border-zinc-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === "login"
                ? "bg-orange-500 text-white shadow-md"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Log In</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === "register"
                ? "bg-orange-500 text-white shadow-md"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Register</span>
          </button>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-500 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Main Auth Form */}
        <form onSubmit={handleAuthSubmit} className="mt-5 space-y-3.5">
          {activeTab === "register" && (
            <div>
              <label
                htmlFor="auth-fullname"
                className="block text-[11px] font-semibold text-zinc-700 dark:text-white/80 mb-1"
              >
                Full Name
              </label>
              <input
                id="auth-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Developer"
                className="w-full rounded-xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/5 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/40 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-white/80 mb-1"
            >
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@opticode.dev"
              className="w-full rounded-xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/5 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/40 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-white/80 mb-1"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/5 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/40 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-2.5 text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white hover:brightness-110 active:scale-[0.99] transition duration-200 shadow-md cursor-pointer disabled:opacity-50"
          >
            {loading ? "Processing..." : authSuccess ? "✓ Authenticated!" : activeTab === "login" ? "LOG IN" : "REGISTER NOW"}
          </button>
        </form>

        {/* Third-Party Social Auth Buttons */}
        <div className="mt-5 border-t border-zinc-200 dark:border-white/10 pt-4 text-center">
          <p className="text-[11px] text-zinc-500 dark:text-white/50 mb-3">
            Or continue with social provider
          </p>
          <div className="flex justify-center gap-3">
            {socialProviders.map((provider) => (
              <button
                key={provider.name}
                type="button"
                onClick={() => handleSocialAuth(provider.name)}
                disabled={loading}
                title={`Continue with ${provider.name}`}
                className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 hover:bg-zinc-200 dark:hover:bg-white/20 transition transform hover:scale-110 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <img
                  src={provider.icon}
                  alt={provider.name}
                  className={`h-5 w-5 ${provider.invertDark ? "dark:invert" : ""}`}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Features Checklist */}
        <div className="mt-5 space-y-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 p-3.5 text-xs text-zinc-700 dark:text-white/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
            <span>
              <strong>Guest Mode Active:</strong> Unlimited free instant analysis
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400" />
            <span>
              <strong>Cloud History:</strong> Save and restore optimization sessions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
            <span>
              <strong>BYO API Key:</strong> Connect OpenAI, Claude, or custom LLM endpoints
            </span>
          </div>
        </div>

        {/* Optional Custom API Key Saver */}
        <form
          onSubmit={handleSaveKey}
          className="mt-4 border-t border-zinc-200 dark:border-white/10 pt-3"
        >
          <label className="block text-[11px] font-medium text-zinc-600 dark:text-white/70 mb-1">
            Save Custom LLM API Key (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="flex-1 rounded-xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/5 px-3 py-2 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/40 outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition cursor-pointer shadow-sm"
            >
              Save
            </button>
          </div>
          {keySaved && (
            <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Custom key saved to browser storage!
            </p>
          )}
        </form>

        {/* Footer Close Button */}
        <div className="mt-4 border-t border-zinc-200 dark:border-white/10 pt-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-zinc-500 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
          >
            Continue as Guest (No sign in needed)
          </button>
        </div>
      </div>
    </div>
  );
}
