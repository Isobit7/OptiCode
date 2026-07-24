import { useCallback, useEffect, useState, useRef } from "react";
import { CodeInputBar } from "./CodeInputBar";
import { ActionPills } from "./ActionPills";
import { ResultsPanel, type ChatMessage } from "./ResultsPanel";
import { SidebarHistory, type HistoryItem } from "./SidebarHistory";
import { SignInModal } from "./SignInModal";
import { PreferencesDropdown, type ExplainDepth, type HumanizeMode } from "./PreferencesDropdown";
import { runAction, fetchCurrentUser, logoutUser, fetchHistory, type ActionId, type ActionResult } from "@/api/backend";
import { Sun, Moon, PanelLeft, LogOut, UserRound } from "lucide-react";

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
  const [explainDepth, setExplainDepth] = useState<ExplainDepth>("intermediate");
  const [humanizeMode, setHumanizeMode] = useState<HumanizeMode>("de-ai");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("opticode_theme");
      if (saved === "dark") setTheme("dark");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("opticode_theme", theme); } catch { /* ignore */ }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

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

  useEffect(() => { checkUserSession(); }, [checkUserSession]);

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
    } catch { /* ignore */ }
  }, []);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
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

      setCode("");
      setLoading(true);
      setError(null);
      setResult(null);
      setSubmittedCode(inputSnippet);

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
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, result: res, loading: false } : m))
        );
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
          try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
          return updated;
        });
      } catch {
        const errText = "Something went wrong. Check your connection and try again.";
        setError(errText);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, loading: false, error: errText } : m))
        );
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    [code, language, loading, explainDepth, humanizeMode],
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
    saveHistory(history.filter((item) => item.id !== id));
    if (activeHistoryId === id) setActiveHistoryId(null);
  };

  const handleClearAllHistory = () => {
    saveHistory([]);
    setActiveHistoryId(null);
  };

  const hasActiveContent = !!(submittedCode || result || loading || messages.length > 0);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <SidebarHistory
        history={Array.isArray(history) ? history : []}
        activeId={activeHistoryId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNewSession={handleNewSession}
        onSelectHistory={handleSelectHistory}
        onDeleteHistory={handleDeleteHistory}
        onClearAll={handleClearAllHistory}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentUser={currentUser}
        onSignIn={() => setIsSignInOpen(true)}
        onSignOut={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Toggle sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <PreferencesDropdown
              explainDepth={explainDepth}
              onExplainDepthChange={setExplainDepth}
              humanizeMode={humanizeMode}
              onHumanizeModeChange={setHumanizeMode}
            />
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {currentUser.email?.split("@")[0] || "User"}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSignInOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <UserRound className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {!hasActiveContent ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 max-w-3xl mx-auto w-full gap-8">
            <div className="text-center space-y-2">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight flex items-center justify-center gap-2">
                <span className="text-primary">Opti</span>
                <span>Code</span>
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Paste your code below. Explain, humanize, prettify, shorten, optimize SEO, or explore alternatives.
              </p>
            </div>

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
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              <div className="max-w-3xl mx-auto">
                <ResultsPanel messages={messages} original={submittedCode} result={result} loading={loading} error={error} />
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 sm:px-6 py-4">
              <div className="max-w-3xl mx-auto">
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