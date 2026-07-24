import { useCallback, useEffect, useState } from "react";
import { CodeInputBar } from "./CodeInputBar";
import { ActionPills } from "./ActionPills";
import { ResultsPanel } from "./ResultsPanel";
import { SidebarHistory, type HistoryItem } from "./SidebarHistory";
import { SignInModal } from "./SignInModal";
import { runAction, fetchCurrentUser, logoutUser, fetchHistory, type ActionId, type ActionResult } from "@/api/backend";
import { Sparkles, UserRound, ShieldCheck, Terminal, LogOut } from "lucide-react";

const LOCAL_STORAGE_KEY = "code_companion_history";

export function OptimizerApp() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("auto");
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [submittedCode, setSubmittedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  // Theme state: light or dark (SSR safe)
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("opticode_theme");
      if (saved === "dark") setTheme("dark");
    } catch (err) {
      void err;
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("opticode_theme", theme);
    } catch (err) {
      void err;
    }
  }, [theme]);

  const handleToggleTheme = (e?: React.MouseEvent) => {
    const isDark = theme === "dark";

    if (
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const x = e?.clientX ?? window.innerWidth / 2;
      const y = e?.clientY ?? window.innerHeight / 2;

      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      const transition = (
        document as unknown as {
          startViewTransition: (cb: () => void) => { ready: Promise<void> };
        }
      ).startViewTransition(() => {
        setTheme(isDark ? "light" : "dark");
      });

      transition.ready
        .then(() => {
          const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ];
          document.documentElement.animate(
            {
              clipPath: isDark ? [...clipPath].reverse() : clipPath,
            },
            {
              duration: 500,
              easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              pseudoElement: isDark ? "::view-transition-old(root)" : "::view-transition-new(root)",
            },
          );
        })
        .catch((err) => {
          void err;
        });
    } else {
      setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }
  };

  // History & Sidebar state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const checkUserSession = useCallback(async () => {
    const user = await fetchCurrentUser();
    setCurrentUser(user);
    if (user) {
      const serverHistory = await fetchHistory(user.user_id);
      if (serverHistory && Array.isArray(serverHistory) && serverHistory.length > 0) {
        const mappedItems: HistoryItem[] = serverHistory.map((h: any) => ({
          id: h.id || `hist_${Date.now()}`,
          timestamp: h.created_at ? new Date(h.created_at).getTime() : Date.now(),
          action: h.feature_used as ActionId,
          code: h.input_code,
          language: "auto",
          result: {
            action: h.feature_used as ActionId,
            output: h.output,
            isProse: h.feature_used === "explain",
          },
        }));
        saveHistory(mappedItems);
      }
    }
  }, []);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore write errors
    }
  };

  const run = useCallback(
    async (action: ActionId) => {
      if (!code.trim() || loading) return;
      setLoading(true);
      setError(null);
      setResult(null);
      setSubmittedCode(code);
      try {
        const res = await runAction(action, code, language);
        setResult(res);

        // Add to history
        const newItem: HistoryItem = {
          id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          action,
          code,
          language,
          result: res,
        };
        setActiveHistoryId(newItem.id);
        setHistory((prev) => {
          const updated = [newItem, ...prev];
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          } catch (err) {
            void err;
          }
          return updated;
        });
      } catch {
        setError(
          "We couldn't reach the AI service. Check your connection and try again in a moment.",
        );
      } finally {
        setLoading(false);
      }
    },
    [code, language, loading],
  );

  const handleSelectAction = (id: ActionId) => {
    setActiveAction(id);
    if (code.trim()) run(id);
  };

  const handleSubmit = () => {
    if (activeAction) run(activeAction);
  };

  const handleNewSession = () => {
    setCode("");
    setActiveAction(null);
    setResult(null);
    setSubmittedCode("");
    setActiveHistoryId(null);
    setError(null);
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setCode(item.code);
    setLanguage(item.language || "auto");
    setActiveAction(item.action);
    setResult(item.result);
    setSubmittedCode(item.code);
    setActiveHistoryId(item.id);
    setError(null);
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((item) => item.id !== id);
    saveHistory(updated);
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
    }
  };

  const handleClearAllHistory = () => {
    saveHistory([]);
    setActiveHistoryId(null);
  };

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.map((item) =>
      item.id === id ? { ...item, starred: !item.starred } : item,
    );
    saveHistory(updated);
  };

  const handleSelectTemplate = (templateCode: string, lang: string) => {
    setCode(templateCode);
    setLanguage(lang || "auto");
    setActiveAction(null);
    setResult(null);
    setSubmittedCode("");
    setActiveHistoryId(null);
    setError(null);
  };

  return (
    <div
      className="relative flex min-h-screen w-full overflow-x-hidden transition-colors duration-500"
      style={{ background: "var(--app-gradient)" }}
    >
      {/* Ambient Background Multi-Point Light Spheres */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* Top-Center Warm Sunset Beam */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full bg-gradient-to-b from-orange-500/25 via-amber-500/15 to-transparent blur-[140px] dark:from-orange-500/30 dark:via-purple-600/20 dark:blur-[160px]" />

        {/* Top-Right Orange Glow Sphere */}
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-orange-500/20 blur-[130px] dark:bg-orange-600/25 dark:blur-[150px] animate-pulse" />

        {/* Left-Center Cosmic Violet Aura Orb */}
        <div className="absolute top-1/3 -left-36 h-[500px] w-[500px] rounded-full bg-pink-500/15 blur-[120px] dark:bg-purple-600/25 dark:blur-[150px] animate-float" />

        {/* Bottom-Right Indigo Ambient Glow */}
        <div className="absolute -bottom-40 right-10 h-[550px] w-[550px] rounded-full bg-indigo-500/15 blur-[140px] dark:bg-indigo-700/25 dark:blur-[160px]" />
      </div>

      <SidebarHistory
        history={Array.isArray(history) ? history : []}
        activeId={activeHistoryId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNewSession={handleNewSession}
        onSelectHistory={handleSelectHistory}
        onToggleStar={handleToggleStar}
        onDeleteHistory={handleDeleteHistory}
        onClearAll={handleClearAllHistory}
        onSelectTemplate={handleSelectTemplate}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="relative flex w-full items-center justify-end px-4 py-4 sm:px-6 lg:px-8">
          {/* Right Header Navigation Actions */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white/90 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                  👤 {currentUser.email || currentUser.full_name || "User"}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all duration-200 cursor-pointer shadow-sm"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSignInOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 dark:bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md border border-white/20 hover:bg-white/25 hover:border-white/35 transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
              >
                <UserRound className="h-3.5 w-3.5 opacity-80" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </header>

        {/* ChatGPT-Style Dynamic Layout */}
        {!(submittedCode || result || loading) ? (
          /* Initial Landing View */
          <>
            <section className="relative mx-auto w-full max-w-3xl px-4 pt-6 text-center sm:px-8 sm:pt-12">
              <h1 className="font-headings text-balance text-3xl font-bold tracking-tight text-[var(--text-on-dark-primary)] sm:text-5xl sm:leading-tight">
                Analyze, Refine & Rewrite Any Code Instantly.
              </h1>
              <p className="mt-4 text-pretty text-sm text-[var(--text-on-dark-primary)]/85 sm:text-base max-w-2xl mx-auto leading-relaxed">
                Paste your snippet, pick an AI action, and elevate your codebase with high-speed
                refactoring, bug fixes, and plain-language insights.
              </p>
            </section>

            <section className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-8 pb-16">
              <CodeInputBar
                code={code}
                onChange={setCode}
                language={language}
                onLanguageChange={setLanguage}
                onSubmit={handleSubmit}
                loading={loading}
                hasActiveAction={activeAction !== null}
                onSelectAction={handleSelectAction}
              />

              <div className="mt-5">
                <ActionPills active={activeAction} loading={loading} onSelect={handleSelectAction} />
              </div>
            </section>
          </>
        ) : (
          /* Active Response View (ChatGPT Mode: Output on top, Input Anchored at Bottom) */
          <div className="flex-1 flex flex-col justify-between min-h-0">
            {/* Top Response Output View */}
            <main className="flex-1 px-4 sm:px-8 pt-4 pb-32 max-w-4xl mx-auto w-full overflow-y-auto">
              <ResultsPanel original={submittedCode} result={result} loading={loading} error={error} />
            </main>

            {/* Sticky Bottom Anchored Input Box (ChatGPT Style) */}
            <div className="sticky bottom-0 z-30 w-full bg-[#0d1017]/95 backdrop-blur-2xl border-t border-white/10 shadow-2xl py-3 px-4 sm:px-8">
              <div className="max-w-4xl mx-auto space-y-2.5">
                <ActionPills active={activeAction} loading={loading} onSelect={handleSelectAction} />
                <CodeInputBar
                  code={code}
                  onChange={setCode}
                  language={language}
                  onLanguageChange={setLanguage}
                  onSubmit={handleSubmit}
                  loading={loading}
                  hasActiveAction={activeAction !== null}
                  onSelectAction={handleSelectAction}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSuccess={checkUserSession}
      />
    </div>
  );
}

