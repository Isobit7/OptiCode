import { useCallback, useEffect, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { CodeInputBar } from "../input/CodeInputBar";
import { Thread } from "./Thread";
import { ActionPills } from "../input/ActionPills";
import { type ChatMessage } from "../results/ResultsPanel";
import { SidebarHistory, type HistoryItem } from "../sidebar/SidebarHistory";
import { AnalyticsModal } from "../modals/AnalyticsModal";
import { KeyboardShortcutsModal } from "../modals/KeyboardShortcutsModal";
import { PreferencesDropdown, type ExplainDepth, type HumanizeMode } from "../modals/PreferencesDropdown";
import { useSettings } from "@/hooks/useSettings";
import { runAction, fetchCurrentUser, logoutUser, fetchHistory, saveHistoryEntry, type ActionId, type ActionResult } from "@/api/backend";
import { Sparkles, UserRound, ShieldCheck, Terminal, LogOut, ArrowDown } from "lucide-react";

import { TranslateModal } from "../modals/TranslateModal";
import { RightDashboardPanel } from "../sidebar/RightDashboardPanel";

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

  // Theme state: light or dark (SSR safe)
  const [theme, setTheme] = useState<"light" | "dark">("light");

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
        const res = await actionMutation.mutateAsync({
          action,
          code: inputSnippet,
          language,
          options: { explainDepth, humanizeMode, targetLanguage: targetLang },
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
        // Save to server if user is signed in
        if (currentUser?.user_id && res.output) {
          saveHistoryEntry(currentUser.user_id, inputSnippet, action, res.output).catch(void 0);
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
    [code, language, loading, explainDepth, humanizeMode, actionMutation],
  );

  const handleSelectAction = (id: ActionId) => {
    setActiveAction(id);
    if (id === "translate") {
      setIsTranslateOpen(true);
    } else if (code.trim()) {
      run(id);
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

          <div className="flex items-center gap-3" />
        </header>

        {/* Layout Workspace — ChatGPT / Claude / Cursor Pattern */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {messages.length === 0 ? (
            /* Empty State / Greeting View */
            <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 max-w-[760px] mx-auto w-full overflow-y-auto no-scrollbar">
              <section className="text-center mb-8 space-y-3">
                <h1 className="font-headings text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
                  Paste your code — let's clean it up
                </h1>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto font-normal">
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
              <div className="sticky bottom-0 z-30 w-full bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)] to-transparent pt-6 pb-4 px-4 sm:px-6 border-t border-[var(--border-subtle)]">
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
          if (code.trim()) run("translate");
        }}
      />
    </div>
  );
}

