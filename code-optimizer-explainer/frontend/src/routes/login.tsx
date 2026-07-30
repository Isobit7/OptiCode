import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Chrome,
  Github,
  Linkedin,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { loginGoogle, loginUser, registerUser } from "@/api/backend";
import { AuthContextPanel } from "@/components/auth/AuthContextPanel";
import { ContinueWithoutLogin } from "@/components/auth/ContinueWithoutLogin";
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/auth/Logo";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { SocialButton } from "@/components/auth/SocialButton";
import { ThemeToggle } from "@/components/auth/ThemeToggle";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — OptiCode" },
      {
        name: "description",
        content: "Sign in or create an OptiCode account to save your optimization history.",
      },
    ],
  }),
  component: LoginRoute,
});

type AuthTab = "login" | "register";
type Theme = "light" | "dark";

const socialProviders = [
  { name: "Google", icon: Chrome },
  { name: "GitHub", icon: Github },
  { name: "LinkedIn", icon: Linkedin },
] as const;

function LoginRoute() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [theme, setTheme] = useState<Theme>("dark");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("opticode_theme");
      if (savedTheme === "light") {
        setTheme("light");
      } else {
        setTheme("dark");
        if (!savedTheme) localStorage.setItem("opticode_theme", "dark");
      }
    } catch {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("opticode_theme", theme);
    } catch {
      // Theme still applies for this session if storage is unavailable.
    }
  }, [theme]);

  const finishAuth = () => {
    setAuthSuccess(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("opticode_auth_change"));
    }
    window.setTimeout(() => {
      navigate({ to: "/preferences" });
    }, 750);
  };

  const runAuth = async (request: () => Promise<{ redirecting?: boolean } | void | unknown>) => {
    setAuthError(null);
    setAuthSuccess(false);
    setLoading(true);
    try {
      const res = await request();
      if (res && typeof res === "object" && "redirecting" in res && (res as any).redirecting) {
        return;
      }
      finishAuth();
    } catch (error: unknown) {
      setAuthError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (email: string, password: string) =>
    runAuth(() => loginUser(email, password));

  const handleRegister = (email: string, password: string, fullName: string) =>
    runAuth(() => registerUser(email, password, fullName || undefined));

  const handleSocialAuth = async (provider: string) => {
    await runAuth(async () => {
      if (provider === "Google") {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey && !supabaseUrl.includes("placeholder")) {
          try {
            const { supabase } = await import("@/api/supabaseClient");
            const { data, error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: `${window.location.origin}/preferences` },
            });
            if (error) throw error;
            if (data?.url) {
              window.location.href = data.url;
              return { redirecting: true };
            }
          } catch (err: any) {
            console.warn("Supabase Google OAuth error, falling back to backend auth:", err);
          }
        }
        await loginGoogle("google_user@opticode.dev", "Google Developer");
        return;
      }

      await loginGoogle(`${provider.toLowerCase()}_user@opticode.dev`, `${provider} Developer`);
    });
  };

  const handleTabChange = (value: string) => {
    const nextTab = value as AuthTab;
    setActiveTab(nextTab);
    setAuthError(null);
    setAuthSuccess(false);
  };

  const handleGuestContinue = () => {
    navigate({ to: "/preferences" });
  };

  return (
    <main className="min-h-screen bg-(--auth-pearl) text-(--auth-ink)">
      <div className="min-h-screen lg:flex">
        <AuthContextPanel />

        <section className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-35"
            style={{
              background:
                "radial-gradient(circle at 78% 10%, color-mix(in srgb, var(--auth-accent) 7%, transparent), transparent 28%), linear-gradient(180deg, var(--auth-pearl), var(--auth-pearl))",
            }}
            aria-hidden="true"
          />

          <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg text-xs font-semibold text-(--auth-muted) transition hover:text-(--auth-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--auth-accent)/30 focus-visible:ring-offset-4 focus-visible:ring-offset-(--auth-pearl)"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to home
            </Link>
            <ThemeToggle theme={theme} onToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} />
          </header>

          <div className="relative z-10 mx-5 overflow-hidden rounded-3xl bg-(--auth-workspace) px-5 py-6 text-white shadow-xl shadow-black/10 sm:mx-8 sm:px-8 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <Logo size="sm" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">Build better</span>
            </div>
            <p className="mt-8 max-w-sm text-2xl font-black leading-none tracking-[-0.04em]">
              Make every <span className="text-(--auth-accent)">line</span> count.
            </p>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-[600px] flex-1 flex-col justify-center px-5 py-12 sm:px-8 lg:px-12">
            <div className="mx-auto w-full max-w-[430px] animate-fade-in-up">
              <div className="mb-8">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-(--auth-border) bg-(--auth-paper)/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-(--auth-muted)" style={{display: 'none'}}>
                  <Sparkles className="h-3 w-3 text-(--auth-accent)" aria-hidden="true" />
                  The developer workspace
                </div>
                <h2 className="font-heading text-4xl font-black leading-none tracking-[-0.055em] text-(--auth-ink) sm:text-5xl">
                  {activeTab === "login" ? "Welcome back." : "Start with clarity."}
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-(--auth-muted)">
                  {activeTab === "login"
                    ? "Sign in to pick up where you left off and keep your best refactors close."
                    : "Create a free account and give every optimization session a place to land."}
                </p>
              </div>

              <div className="mb-7 grid grid-cols-2 rounded-xl border border-(--auth-border) bg-(--auth-paper)/55 p-1">
                <button
                  type="button"
                  onClick={() => handleTabChange("login")}
                  className={`rounded-lg px-4 py-2.5 text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--auth-accent)/30 ${
                    activeTab === "login"
                      ? "bg-(--auth-ink) text-(--auth-paper) shadow-sm"
                      : "text-(--auth-muted) hover:text-(--auth-ink)"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("register")}
                  className={`rounded-lg px-4 py-2.5 text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--auth-accent)/30 ${
                    activeTab === "register"
                      ? "bg-(--auth-ink) text-(--auth-paper) shadow-sm"
                      : "text-(--auth-muted) hover:text-(--auth-ink)"
                  }`}
                >
                  Create OptiCode Account
                </button>
              </div>

              {activeTab === "login" ? (
                <LoginForm onSubmit={handleLogin} loading={loading} error={authError} success={authSuccess} />
              ) : (
                <RegisterForm onSubmit={handleRegister} loading={loading} error={authError} success={authSuccess} />
              )}

              <div className="mt-8 border-t border-(--auth-border) pt-6">
                <div className="mb-4 flex items-center gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-(--auth-muted)">
                    Or continue securely with
                  </p>
                </div>
                <div className="flex gap-2">
                  {socialProviders.map((provider) => (
                    <SocialButton
                      key={provider.name}
                      provider={provider.name}
                      icon={provider.icon}
                      loading={loading}
                      onClick={() => void handleSocialAuth(provider.name)}
                    />
                  ))}
                </div>
              </div>

              <ContinueWithoutLogin onContinue={handleGuestContinue} />

              <p className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] text-(--auth-muted)">
                <ShieldCheck className="h-3.5 w-3.5 text-(--auth-success)" aria-hidden="true" />
                Your code stays yours. We never train on private snippets.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Authentication failed. Please check your details and try again.";
}
