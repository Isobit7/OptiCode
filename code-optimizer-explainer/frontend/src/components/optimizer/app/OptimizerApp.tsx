import { useCallback, useEffect, useState, useRef, lazy, Suspense } from "react";
import { useMutation } from "@tanstack/react-query";
import { CodeInputBar } from "../input/CodeInputBar";
import { Thread } from "./Thread";
import { ActionPills } from "../input/ActionPills";
import { type ChatMessage } from "../results/ResultsPanel";
import { SidebarHistory, type HistoryItem } from "../sidebar/SidebarHistory";
import { PreferencesDropdown, type ExplainDepth, type HumanizeMode } from "../modals/PreferencesDropdown";
import { useSettings } from "@/hooks/useSettings";
import { runAction, fetchCurrentUser, logoutUser, fetchHistory, saveHistoryEntry, type ActionId, type ActionResult } from "@/api/backend";
import { Sparkles, UserRound, ShieldCheck, Terminal, LogOut, ArrowDown, ArrowRight } from "lucide-react";
import { RightDashboardPanel } from "../sidebar/RightDashboardPanel";

const AnalyticsModal = lazy(() => import("../modals/AnalyticsModal").then(m => ({ default: m.AnalyticsModal })));
const KeyboardShortcutsModal = lazy(() => import("../modals/KeyboardShortcutsModal").then(m => ({ default: m.KeyboardShortcutsModal })));
const TranslateModal = lazy(() => import("../modals/TranslateModal").then(m => ({ default: m.TranslateModal })));
const SignInModal = lazy(() => import("../modals/SignInModal").then(m => ({ default: m.SignInModal })));

const LOCAL_STORAGE_KEY = "code_companion_history";
const ONBOARDING_KEY = "opticode_user_onboarding_prefs";

export function OptimizerApp() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("auto");
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [submittedCode, setSubmittedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const [targetLang, setTargetLang] = useState("TypeScript");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Preference states for Explainer Depth & Humanizer Mode
  const [explainDepth, setExplainDepth] = useState<ExplainDepth>("intermediate");
  const [humanizeMode, setHumanizeMode] = useState<HumanizeMode>("de-ai");

  // Global user settings (font size, copy-on-submit, etc.) — persisted in localStorage
  const { settings, updateSetting } = useSettings();

  // Theme state: light or dark (SSR safe) - Defaults to dark for all users
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  type RunActionInput = {
    action: ActionId;
    code: string;
    language: string;
    options: { explainDepth: ExplainDepth; humanizeMode: HumanizeMode; targetLanguage?: string };
  };
  const actionMutation = useMutation({
    mutationFn: ({ action, code, language, options }: RunActionInput) =>
      runAction(action, code, language, options),
    retry: (failureCount, error) => {
      const isNetwork =
        typeof error === "object" && error !== null && "message" in error
          ? /fetch|network|Failed/i.test((error as Error).message)
          : false;
      return isNetwork && failureCount < 1;
    },
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("opticode_theme");
      if (saved === "light") {
        setTheme("light");
      } else {
        setTheme("dark");
        if (!saved) localStorage.setItem("opticode_theme", "dark");
      }
    } catch (err) {
      setTheme("dark");
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

  // Developer Console Easter Egg
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log(
        "%c 🚀 OptiCode AI %c Code Optimizer & Explainer \n%c Built for developers. Type '/' in the composer to supercharge your workflow!\n%c Repository: https://github.com/Isobit7/OptiCode.git",
        "color: #f97316; font-size: 14px; font-weight: bold; padding: 4px 0;",
        "color: #8b93a7; font-size: 12px; font-weight: bold;",
        "color: #565d70; font-size: 11px;",
        "color: #6b6b6b; font-size: 10px; font-style: italic;"
      );
    }
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable;
      if (e.key === "?" && !isInInput && !isAnalyticsOpen) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isAnalyticsOpen]);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
      let animationFrameId: number;
      let cancelled = false;

      import("lenis")
        .then(({ default: Lenis }) => {
          if (cancelled) return;
          lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
          });

          function raf(time: number) {
            lenis?.raf(time);
            animationFrameId = requestAnimationFrame(raf);
          }

          animationFrameId = requestAnimationFrame(raf);
        })
        .catch(() => void 0);

      return () => {
        cancelled = true;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (lenis) lenis.destroy();
      };
    }
  }, []);

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
  const [isSignInOpen, setIsSignInOpen] = useState(false);

function getGuestUserId(): string {
  if (typeof window === "undefined") return "guest_anon";
  try {
    let guestId = localStorage.getItem("opticode_guest_id");
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("opticode_guest_id", guestId);
    }
    return guestId;
  } catch {
    return "guest_anon";
  }
}

  const checkUserSession = useCallback(async () => {
    const user = await fetchCurrentUser();
    setCurrentUser(user);
    const targetUserId = user?.user_id || getGuestUserId();

    // Read existing local storage history cache memory
    let localCacheHistory: HistoryItem[] = [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localCacheHistory = parsed;
      }
    } catch {
      // Ignore read errors
    }

    if (targetUserId) {
      const serverHistory = await fetchHistory(targetUserId);
      const serverMapped: HistoryItem[] = (serverHistory && Array.isArray(serverHistory))
        ? serverHistory.map((h: any) => ({
            id: h.id || `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: h.created_at ? new Date(h.created_at).getTime() : Date.now(),
            action: h.feature_used as ActionId,
            code: h.input_code,
            language: "auto",
            result: {
              action: h.feature_used as ActionId,
              output: h.output,
              isProse: h.feature_used === "explain",
            },
          }))
        : [];

      // If user is authenticated, automatically sync unsynced local guest cache history to user account
      if (user?.user_id && localCacheHistory.length > 0) {
        const serverOutputs = new Set(serverMapped.map((s) => s.result.output));
        for (const item of localCacheHistory) {
          if (item.result?.output && !serverOutputs.has(item.result.output)) {
            // Persist guest/local cache history item to Supabase database under user account
            saveHistoryEntry(user.user_id, item.code, item.action, item.result.output).catch(void 0);
            serverMapped.push(item);
          }
        }
      }

      // Merge and deduplicate by result output, keeping newest timestamp entries
      const combinedMap = new Map<string, HistoryItem>();
      [...serverMapped, ...localCacheHistory].forEach((item) => {
        const key = item.result?.output ? `${item.action}_${item.result.output.slice(0, 100)}` : item.id;
        if (!combinedMap.has(key)) {
          combinedMap.set(key, item);
        }
      });

      const mergedList = Array.from(combinedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
      if (mergedList.length > 0) {
        saveHistory(mergedList);
      }
    }
  }, []);

  useEffect(() => {
    checkUserSession();
    const handleAuthChange = () => {
      checkUserSession();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("opticode_auth_change", handleAuthChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("opticode_auth_change", handleAuthChange);
      }
    };
  }, [checkUserSession]);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    window.dispatchEvent(new Event("opticode_auth_change"));
  };

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

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

  const applyOnboardingPreferences = (prefs: any) => {
    if (prefs.explainDepth) setExplainDepth(prefs.explainDepth);
    if (prefs.primaryGoal && prefs.primaryGoal !== "all") {
      setActiveAction(prefs.primaryGoal);
    }
    // Auto-configure Humanize Mode based on preference selections
    if (prefs.humanizerTypes && prefs.humanizerTypes.length > 0) {
      const typesStr = prefs.humanizerTypes.join(" ").toLowerCase();
      if (typesStr.includes("simplify") || typesStr.includes("eli5")) {
        setHumanizeMode("simplify");
      } else if (typesStr.includes("casual") || typesStr.includes("conversational")) {
        setHumanizeMode("idiomatic");
      } else {
        setHumanizeMode("de-ai");
      }
    }
    // Auto-configure default language
    if (prefs.languages && prefs.languages.length > 0) {
      const primaryLang = prefs.languages[0].toLowerCase();
      if (primaryLang.includes("python")) setLanguage("python");
      else if (primaryLang.includes("typescript") || primaryLang.includes("javascript")) setLanguage("javascript");
      else if (primaryLang.includes("java")) setLanguage("java");
      else if (primaryLang.includes("c++") || primaryLang.includes("c /")) setLanguage("cpp");
      else if (primaryLang.includes("html") || primaryLang.includes("css")) setLanguage("html");
    }
  };

  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem(ONBOARDING_KEY);
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        applyOnboardingPreferences(parsed);
      }
    } catch {
      // ignore errors
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
    async (action: ActionId, codeOverride?: string, targetLangOverride?: string) => {
      const inputSnippet = (codeOverride ?? code).trim();
      if (!inputSnippet || loading) return;
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
        const res = await actionMutation.mutateAsync({
          action,
          code: inputSnippet,
          language,
          options: { explainDepth, humanizeMode, targetLanguage: targetLangOverride ?? targetLang },
        });
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
        // Save to Supabase history database for both logged in users and guest sessions
        const targetUserId = currentUser?.user_id || getGuestUserId();
        if (targetUserId && res.output) {
          saveHistoryEntry(targetUserId, inputSnippet, action, res.output).catch(void 0);
        }
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
    [code, language, loading, explainDepth, humanizeMode, targetLang, actionMutation],
  );

  const handleSelectAction = (id: ActionId) => {
    setActiveAction(id);
    const targetCode = code.trim() || submittedCode.trim() || (messages.length > 0 ? messages[messages.length - 1].original : "");
    if (id === "translate") {
      setIsTranslateOpen(true);
    } else if (targetCode) {
      run(id, targetCode);
    }
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
      className="relative flex h-screen w-full max-h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-200"
    >
      {/* Mobile sidebar overlay backdrop */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}
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
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-[var(--bg-base)]">
        {/* Top Header Bar */}
        <header className="relative flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          {/* Left Title: OptiCode Model Dropdown */}
          <PreferencesDropdown
            explainDepth={explainDepth}
            onExplainDepthChange={setExplainDepth}
            humanizeMode={humanizeMode}
            onHumanizeModeChange={setHumanizeMode}
            settings={settings}
            onSettingChange={updateSetting}
          />

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-surface-alt)] px-3 py-1.5 border border-[var(--border-default)]">
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="User Avatar" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                    {(currentUser.full_name || currentUser.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {currentUser.full_name || currentUser.email?.split("@")[0] || "Account"}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSignInOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                <UserRound className="h-3.5 w-3.5" />
                <span>Sign In / Account</span>
              </button>
            )}
          </div>
        </header>

        {/* Layout Workspace — ChatGPT / Claude / Cursor Pattern */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {messages.length === 0 ? (
            /* Empty State / Greeting View */
            <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 max-w-[760px] mx-auto w-full overflow-y-auto no-scrollbar space-y-6">
              <section className="text-center space-y-3">
                <h1 className="font-headings text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
                  Transform Any Code <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] via-amber-500 to-orange-600">
                    Line-by-Line with Zero Setup
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
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
                  fontSize={settings.fontSize}
                />
              </div>
            </div>
          ) : (
            /* Thread View (Scrolling Centered Column + Pinned Bottom Composer) */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              {/* Scrolling Centered Thread Column (max-width ~760px) */}
              <div className="flex-1 overflow-y-auto pb-32">
                <Thread
                  messages={messages.map((m) => ({
                    id: m.id,
                    original: m.original,
                    action: activeAction || "explain",
                    language,
                    result: m.result,
                    loading: m.loading,
                    error: m.error,
                  }))}
                  onRetry={(msg) => run(msg.action)}
                />
              </div>

              {/* Pinned Bottom Composer with Fade Mask */}
              <div className="sticky bottom-0 z-30 w-full bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)] to-transparent pt-6 pb-4 px-4 sm:px-6">
                <CodeInputBar
                  code={code}
                  onChange={setCode}
                  language={language}
                  onLanguageChange={setLanguage}
                  onSubmit={handleSubmit}
                  loading={loading}
                  activeAction={activeAction}
                  onSelectAction={handleSelectAction}
                  fontSize={settings.fontSize}
                  targetLanguage={targetLang}
                  onSelectTargetLanguage={setTargetLang}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side Dashboard Panel */}
      <RightDashboardPanel
        activeAction={activeAction}
        loading={loading}
        onSelectAction={handleSelectAction}
        targetLanguage={targetLang}
        onSelectTargetLanguage={setTargetLang}
        codeLength={code.length}
      />

      <Suspense fallback={null}>
        <AnalyticsModal
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          history={Array.isArray(history) ? history : []}
        />

        <KeyboardShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />

        <TranslateModal
          isOpen={isTranslateOpen}
          onClose={() => setIsTranslateOpen(false)}
          onSelectTarget={(targetLanguage) => {
            setTargetLang(targetLanguage);
            const targetCode = code.trim() || submittedCode.trim() || (messages.length > 0 ? messages[messages.length - 1].original : "");
            if (targetCode) run("translate", targetCode, targetLanguage);
          }}
        />

        <SignInModal
          isOpen={isSignInOpen}
          onClose={() => setIsSignInOpen(false)}
          onSuccess={() => checkUserSession()}
        />
      </Suspense>
    </div>
  );
}

