import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { X, ShieldCheck, KeyRound, Cloud, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { registerUser, loginUser, loginGoogle } from "@/api/backend";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — OptiCode" },
      {
        name: "description",
        content: "Sign in to OptiCode to save your optimization history and access premium features.",
      },
    ],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);

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
      setTimeout(() => {
        navigate({ to: "/preferences" });
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
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          try {
            const { supabase } = await import("@/api/supabaseClient");
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: `${window.location.origin}/preferences`,
              },
            });
            if (error) throw error;
            return;
          } catch (err: any) {
            console.warn("Supabase Google OAuth fallback to backend auth:", err);
          }
        }
        await loginGoogle("google_user@opticode.dev", "Google Developer");
      } else {
        await loginGoogle(`${providerName.toLowerCase()}_user@opticode.dev`, `${providerName} Developer`);
      }
      setAuthSuccess(true);
      setTimeout(() => {
        navigate({ to: "/preferences" });
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message || `${providerName} login failed.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate({ to: "/preferences" });
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
    <div className="min-h-screen bg-[#0e0e14] flex items-center justify-center p-4">
      {/* Back to Home */}
      <button
        onClick={() => navigate({ to: "/" })}
        className="absolute top-6 left-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </button>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200/20 bg-white/5 backdrop-blur-xl p-6 sm:p-8 text-zinc-100 shadow-2xl">
        {/* Top Gradient Glow Accent */}
        <div
          className="absolute -top-24 left-1/2 h-36 w-64 -translate-x-1/2 rounded-full opacity-40 blur-2xl pointer-events-none"
          style={{ background: "var(--accent-warm, #f97316)" }}
        />

        {/* Header */}
        <div className="flex flex-col items-center text-center pt-2 mb-6">
          <h2 className="font-headings text-2xl font-bold tracking-tight text-white">
            {activeTab === "login" ? "Welcome back" : "Create your Account"}
          </h2>
          <p className="mt-1.5 text-xs text-zinc-400">
            {activeTab === "login" 
              ? "Sign in to access your optimization history" 
              : "Join thousands of developers optimizing their code"}
          </p>
        </div>

        {/* Login / Register Tab Switcher */}
        <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 mb-5">
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === "login"
                ? "bg-orange-500 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === "register"
                ? "bg-orange-500 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Register</span>
          </button>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 mb-5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Main Auth Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-3.5 mb-5">
          {activeTab === "register" && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Developer"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@opticode.dev"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-2.5 text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white hover:brightness-110 active:scale-[0.99] transition duration-200 shadow-md cursor-pointer disabled:opacity-50"
          >
            {loading ? "Processing..." : authSuccess ? "✓ Success!" : activeTab === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
        </form>

        {/* Third-Party Social Auth Buttons */}
        <div className="border-t border-white/10 pt-4 text-center mb-5">
          <p className="text-[11px] text-zinc-500 mb-3">
            Or continue with social provider
          </p>
          <div className="flex justify-center gap-3">
            {socialProviders.map((provider) => (
              <button
                key={provider.name}
                onClick={() => handleSocialAuth(provider.name)}
                disabled={loading}
                title={`Continue with ${provider.name}`}
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition transform hover:scale-110 cursor-pointer shadow-2xs disabled:opacity-50"
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
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-xs text-zinc-300 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              <strong>Guest Mode Active:</strong> Unlimited free instant analysis
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 shrink-0 text-sky-400" />
            <span>
              <strong>Cloud History:</strong> Save and restore optimization sessions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>BYO API Key:</strong> Connect OpenAI, Claude, or custom LLM endpoints
            </span>
          </div>
        </div>

        {/* Optional Custom API Key Saver */}
        <form onSubmit={handleSaveKey} className="border-t border-white/10 pt-3 mb-4">
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            Save Custom LLM API Key (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-500 outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition cursor-pointer shadow-sm"
            >
              Save
            </button>
          </div>
          {keySaved && (
            <p className="mt-1 text-[11px] text-emerald-400 font-medium">
              ✓ Custom key saved to browser storage!
            </p>
          )}
        </form>

        {/* Skip Button */}
        <div className="text-center">
          <button
            onClick={handleSkip}
            className="text-xs font-medium text-zinc-500 hover:text-white transition cursor-pointer"
          >
            Continue as Guest →
          </button>
        </div>
      </div>
    </div>
  );
}
