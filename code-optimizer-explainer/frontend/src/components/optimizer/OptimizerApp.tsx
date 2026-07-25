import { useCallback, useEffect, useState, useRef } from "react";
import { CodeInputBar } from "./CodeInputBar";
import { ActionPills } from "./ActionPills";
import { ResultsPanel, type ChatMessage } from "./ResultsPanel";
import { SidebarHistory, type HistoryItem } from "./SidebarHistory";
import { SignInModal } from "./SignInModal";
import { PreferencesDropdown, type ExplainDepth, type HumanizeMode } from "./PreferencesDropdown";
import { runAction, fetchCurrentUser, logoutUser, fetchHistory, type ActionId, type ActionResult } from "@/api/backend";
import { Sparkles, UserRound, ShieldCheck, Terminal, LogOut, ArrowDown } from "lucide-react";

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Preference states for Explainer Depth & Humanizer Mode
  const [explainDepth, setExplainDepth] = useState<ExplainDepth>("intermediate");
  const [humanizeMode, setHumanizeMode] = useState<HumanizeMode>("de-ai");

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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const run = useCallback(
    async (action: ActionId) => {
      if (!code.trim() || loading) return;
      const inputSnippet = code;
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      
      // Clear code input field immediately for next input
      setCode("");
      setLoading(true);
      setError(null);
      setResult(null);
      setSubmittedCode(inputSnippet);

      // Append new message entry to thread
      const newMsg: ChatMessage = {
        id: msgId,
        original: inputSnippet,
        result: null,
        loading: true,
        error: null,
      };
      setMessages((prev) => [...prev, newMsg]);
      scrollToBottom();

      try {
        const res = await runAction(action, inputSnippet, language, { explainDepth, humanizeMode });
        setResult(res);

        // Update message thread entry with result
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, result: res, loading: false } : m))
        );

        // Add to history
        const newItem: HistoryItem = {
          id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          action,
          code: inputSnippet,
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
        const errText = "We couldn't reach the AI service. Check your connection and try again in a moment.";
        setError(errText);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, loading: false, error: errText } : m))
        );
      } finally {
        setLoading(false);
        scrollToBottom();
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
    setMessages([]);
    setActiveHistoryId(null);
    setError(null);
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setLanguage(item.language || "auto");
    setActiveAction(item.action);
    setResult(item.result);
    setSubmittedCode(item.code);
    setMessages([{ id: item.id, original: item.code, result: item.result }]);
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
      className="relative flex h-screen w-full max-h-screen overflow-hidden transition-colors duration-500"
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
        currentUser={currentUser}
        onSignIn={() => setIsSignInOpen(true)}
        onSignOut={handleLogout}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="relative flex w-full items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Left Title: ChatGPT-Style OptiCode Model Dropdown */}
          <PreferencesDropdown
            explainDepth={explainDepth}
            onExplainDepthChange={setExplainDepth}
            humanizeMode={humanizeMode}
            onHumanizeModeChange={setHumanizeMode}
          />

          {/* Right Header Navigation — account moved to sidebar Settings */}
          <div className="flex items-center gap-3" />
        </header>

        {/* BeeBot Layout Workspace */}
        {!(submittedCode || result || loading) ? (
          /* BeeBot Greeting & Input View */
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-4 max-w-4xl mx-auto w-full overflow-y-auto no-scrollbar h-full min-h-0">
            <section className="text-center mb-6 space-y-2.5">
              <h1 className="font-headings text-3xl sm:text-5xl font-bold tracking-tight text-[var(--text-on-dark-primary)]">
                {currentUser ? `Welcome back, ${currentUser.email?.split("@")[0] || currentUser.full_name || "Developer"}` : "Paste your code — let's clean it up"}
              </h1>
              <p className="text-sm sm:text-base text-[var(--text-on-dark-primary)]/80 max-w-xl mx-auto">
                Transform, explain, prettify, or optimize any snippet instantly with AI.
              </p>
            </section>

            <div className="w-full">
              <CodeInputBar
                code={code}
                onChange={setCode}
                language={language}
                onLanguageChange={setLanguage}
                onSubmit={handleSubmit}
                loading={loading}
                activeAction={activeAction}
                onSelectAction={handleSelectAction}
              />
            </div>
          </div>
        ) : (
          /* Active Response View (BeeBot Output + Attached Bottom Bar) */
          <div className="flex-1 flex flex-col justify-between min-h-0 h-full overflow-y-auto relative">
            <main className="flex-1 px-4 sm:px-8 pt-4 pb-36 max-w-4xl mx-auto w-full">
              <ResultsPanel messages={messages} original={submittedCode} result={result} loading={loading} error={error} />
              <div ref={messagesEndRef} />
            </main>

            {/* Floating Scroll to Bottom Button */}
            {messages.length > 1 && (
              <button
                type="button"
                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                title="Scroll to latest response"
                className="absolute bottom-28 right-8 z-40 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-warm-lg hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer animate-pop-in border border-white/30 backdrop-blur-md"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                <span>Latest</span>
              </button>
            )}

            {/* Sticky Bottom Input Bar with Embedded Feature Chips */}
            <div className="sticky bottom-0 z-30 w-full bg-gradient-to-t from-[var(--app-gradient)] via-white/20 to-transparent dark:from-[#0c0c0e]/95 dark:via-[#0c0c0e]/60 dark:to-transparent backdrop-blur-md py-4 px-4 sm:px-8 transition-colors duration-300">
              <div className="max-w-4xl mx-auto">
                <CodeInputBar
                  code={code}
                  onChange={setCode}
                  language={language}
                  onLanguageChange={setLanguage}
                  onSubmit={handleSubmit}
                  loading={loading}
                  activeAction={activeAction}
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

