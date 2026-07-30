import { useState } from "react";
import logoWebp from "@/assets/logo.webp";
import logoPng from "@/assets/logo.png";
import {
  Plus,
  Search,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  Code2,
  Clock,
  Sparkles,
  BookOpen,
  UserRound,
  Minimize2,
  Shuffle,
  Star,
  Download,
  FileCode2,
  BarChart3,
  Flame,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Keyboard,
  ShieldCheck,
  Languages,
  FileText,
  GitBranch,
} from "lucide-react";
import type { ActionId, ActionResult } from "@/api/backend";

export interface HistoryItem {
  id: string;
  timestamp: number;
  action: ActionId;
  code: string;
  language: string;
  result: ActionResult;
  starred?: boolean;
}

export interface TemplateItem {
  title: string;
  language: string;
  description: string;
  code: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    title: "React Async Hook",
    language: "typescript",
    description: "Custom hook with state, error, and loading handling",
    code: `import { useState, useEffect } from 'react';

export function useFetchData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(url);
        if (!res.ok) throw new Error(\`HTTP error! status: \${res.status}\`);
        const json = await res.json();
        if (isMounted) setData(json);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to fetch');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [url]);

  return { data, loading, error };
}`,
  },
  {
    title: "Python Data Processor",
    language: "python",
    description: "Pandas dataframe cleaning and summary analytics",
    code: `import pandas as pd
import numpy as np

def clean_and_summarize(df: pd.DataFrame) -> dict:
    """Cleans missing values and returns aggregated data metrics."""
    df_clean = df.dropna(subset=['id', 'value']).copy()
    df_clean['value'] = pd.to_numeric(df_clean['value'], errors='coerce')
    
    summary = {
        'total_rows': len(df_clean),
        'mean_value': df_clean['value'].mean(),
        'median_value': df_clean['value'].median(),
        'std_dev': df_clean['value'].std(),
    }
    return summary`,
  },
  {
    title: "Express API Middleware",
    language: "javascript",
    description: "JWT authentication & error handling middleware",
    code: `const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };`,
  },
  {
    title: "CSS Glassmorphism Card",
    language: "css",
    description: "Modern translucent blurred card styling",
    code: `.glass-card {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  padding: 24px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.25);
}`,
  },
];

const ACTION_ICONS: Record<ActionId, typeof BookOpen> = {
  explain: BookOpen,
  humanize: UserRound,
  "security-audit": ShieldCheck,
  translate: Languages,
  "pr-review": FileText,
  flowchart: GitBranch,
  "diff-story": GitBranch,
  prettify: Sparkles,
  shorten: Minimize2,
  "seo-optimize": Search,
  alternatives: Shuffle,
};

const ACTION_LABELS: Record<ActionId, string> = {
  explain: "Explain",
  humanize: "Humanize",
  "security-audit": "Security",
  translate: "Translate",
  "pr-review": "PR Review",
  flowchart: "Flowchart",
  "diff-story": "Diff Story",
  prettify: "Prettify",
  shorten: "Shorten",
  "seo-optimize": "SEO",
  alternatives: "Alternatives",
};

interface Props {
  history: HistoryItem[];
  activeId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNewSession: () => void;
  onSelectHistory: (item: HistoryItem) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onDeleteHistory: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
  onSelectTemplate: (code: string, language: string) => void;
  theme: "light" | "dark";
  onToggleTheme: (e?: React.MouseEvent) => void;
  currentUser?: { email?: string; full_name?: string } | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onOpenAnalytics?: () => void;
  onOpenShortcuts?: () => void;
}

export function SidebarHistory({
  history,
  activeId,
  collapsed,
  onToggleCollapse,
  onNewSession,
  onSelectHistory,
  onToggleStar,
  onDeleteHistory,
  onClearAll,
  onSelectTemplate,
  theme,
  onToggleTheme,
  currentUser,
  onSignIn,
  onSignOut,
  onOpenAnalytics,
  onOpenShortcuts,
}: Props) {
  const [activeTab, setActiveTab] = useState<"all" | "starred" | "templates">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const safeHistory = Array.isArray(history) ? history : [];
  const starredItemsCount = safeHistory.filter((i) => i?.starred).length;

  const filteredHistory = safeHistory.filter((item) => {
    if (!item) return false;
    if (activeTab === "starred" && !item.starred) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (item.code && item.code.toLowerCase().includes(query)) ||
      (item.action && ACTION_LABELS[item.action]?.toLowerCase().includes(query)) ||
      (item.language && item.language.toLowerCase().includes(query))
    );
  });

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const exportHistoryJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(safeHistory, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `code_companion_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const totalLines = safeHistory.reduce((acc, item) => acc + (item?.code ? item.code.split("\n").length : 0), 0);

  return (
    <aside
      className={[
        "h-screen flex flex-col transition-all duration-300 ease-in-out border-r border-[var(--border-default)] text-[var(--text-primary)] shadow-xs z-30 shrink-0",
        "bg-[var(--bg-surface)]",
        // Desktop: sticky inline sidebar
        "md:sticky md:top-0",
        // Mobile: fixed drawer that slides in/out
        "fixed top-0 left-0 md:relative",
        collapsed ? "w-14 -translate-x-full md:translate-x-0" : "w-64 translate-x-0",
      ].join(" ")}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between p-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {!collapsed ? (
          <div className="flex items-center">
            <picture>
              <source srcSet={logoWebp} type="image/webp" />
              <img
                src={logoPng}
                alt="OptiCode Logo"
                width={28}
                height={28}
                decoding="async"
                className="h-7 w-7 object-contain"
              />
            </picture>
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="grid h-9 w-9 mx-auto place-items-center rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)] hover:bg-[var(--bg-base)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* New Session Button */}
      <div className="p-2.5">
        <button
          type="button"
          onClick={onNewSession}
          title="New Optimization Session"
          aria-label="Start new optimization session"
          className={[
            "w-full flex items-center justify-center gap-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-primary)] hover:bg-[var(--border-default)] font-medium py-2 px-2.5 transition-colors duration-150 shadow-xs cursor-pointer border border-[var(--border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
            collapsed ? "aspect-square p-0" : "",
          ].join(" ")}
        >
          <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden="true" />
          {!collapsed && <span className="text-xs font-semibold">New Session</span>}
        </button>
      </div>

      {/* Search Input (visible when expanded) */}
      {!collapsed && (
        <div className="px-2.5 pb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={activeTab === "starred" ? "Search saved items" : "Search history"}
              placeholder={activeTab === "starred" ? "Search saved items..." : "Search history..."}
              className="w-full bg-[var(--bg-surface-alt)] border border-[var(--border-default)] rounded-md pl-7 pr-2.5 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] focus-visible:ring-1 focus-visible:ring-[var(--accent)] transition-colors"
            />
          </div>
        </div>
      )}

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1.5 scrollbar-thin">
        {filteredHistory.length === 0 ? (
          !collapsed && (
            <div className="text-center py-12 px-4 text-xs text-zinc-600 space-y-2.5">
              {activeTab === "starred" ? (
                <>
                  <Star className="h-8 w-8 mx-auto fill-amber-400/30 text-amber-500 animate-pulse" />
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">No starred items yet</p>
                  <p className="text-[11px] text-zinc-500">Click the star icon on any code result to pin it to this tab!</p>
                </>
              ) : (
                <>
                  <Flame className="h-8 w-8 mx-auto text-zinc-500" />
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">
                    {searchQuery ? "No matching history found" : "No history yet"}
                  </p>
                  <p className="text-[11px] text-zinc-500">Run an optimization to record your session here!</p>
                </>
              )}
            </div>
          )
        ) : (
          (() => {
            const todayTs = new Date().setHours(0, 0, 0, 0);
            const sevenDaysTs = todayTs - 7 * 86400 * 1000;

            const todayItems = filteredHistory.filter((i) => i.timestamp >= todayTs);
            const weekItems = filteredHistory.filter((i) => i.timestamp < todayTs && i.timestamp >= sevenDaysTs);
            const olderItems = filteredHistory.filter((i) => i.timestamp < sevenDaysTs);

            const renderGroup = (title: string, items: HistoryItem[]) => {
              if (items.length === 0 || collapsed) return null;
              return (
                <div key={title} className="space-y-1 mt-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1 pt-1 font-mono">
                    {title} ({items.length})
                  </div>
                  {items.map((item) => {
                    const Icon = ACTION_ICONS[item.action] || Code2;
                    const isSelected = activeId === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectHistory(item)}
                        className={[
                          "sidebar-history-item",
                          "group relative flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors duration-150 cursor-pointer text-left shadow-2xs",
                          isSelected
                            ? "bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)] font-bold shadow-xs"
                            : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-alt)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Icon
                            className={
                              isSelected ? "h-3.5 w-3.5 shrink-0 text-[var(--accent)]" : "h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                            }
                          />
                          <div className="min-w-0 flex-1 flex items-center gap-1.5 text-xs">
                            <span className={isSelected ? "font-bold text-[var(--accent)] shrink-0" : "font-semibold text-[var(--text-primary)] shrink-0"}>
                              {ACTION_LABELS[item.action]}
                            </span>
                            <span className={isSelected ? "text-[11px] text-[var(--accent)] opacity-90 font-mono truncate flex-1 min-w-0" : "text-[11px] text-[var(--text-secondary)] font-mono truncate flex-1 min-w-0"}>
                              {item.code.trim() || "Empty snippet"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-[var(--text-muted)] font-mono hidden sm:inline">
                            {formatTime(item.timestamp)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => onToggleStar(item.id, e)}
                            title={item.starred ? "Unstar item" : "Star item"}
                            aria-label={item.starred ? "Unstar item" : "Star item"}
                            className="p-1 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 rounded"
                          >
                            <Star
                              className={[
                                "h-3 w-3 transition",
                                item.starred
                                  ? "fill-amber-400 text-amber-500"
                                  : isSelected
                                    ? "text-[var(--accent)] hover:text-amber-400"
                                    : "text-[var(--text-muted)] hover:text-amber-500",
                              ].join(" ")}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => onDeleteHistory(item.id, e)}
                            title="Delete item"
                            aria-label="Delete item"
                            className={
                              isSelected
                                ? "p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 text-[var(--accent)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 rounded"
                                : "p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 text-[var(--text-muted)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 rounded"
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            };

            return [
              renderGroup("Today", todayItems),
              renderGroup("Last 7 Days", weekItems),
              renderGroup("Older", olderItems),
            ];
          })()
        )}
      </div>

      {/* Footer Navigation Section per DESIGN.md */}
      {!collapsed ? (
        <div className="p-3 border-t border-[var(--border-default)] bg-[var(--bg-surface)] space-y-1">
          <div className="flex items-center justify-between gap-1">
            {/* History Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={[
                "flex-1 flex items-center justify-between px-3 py-1.5 rounded-md transition-colors text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
                activeTab === "all"
                  ? "bg-[var(--accent-muted)] text-[var(--accent)] font-semibold"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-alt)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>History</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">{safeHistory.length}</span>
            </button>

            {/* Saved Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("starred")}
              className={[
                "flex-1 flex items-center justify-between px-3 py-1.5 rounded-md transition-colors text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
                activeTab === "starred"
                  ? "bg-[var(--accent-muted)] text-[var(--accent)] font-semibold"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-alt)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" />
                <span>Saved</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">{starredItemsCount}</span>
            </button>

            {/* Single Icon Trigger for Settings per DESIGN.md */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="Settings"
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>

          {/* Settings Drawer */}
          {isSettingsOpen && (
            <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)] mt-2">
              {onOpenAnalytics && (
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--border-default)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span>Usage Insights</span>
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">Stats</span>
                </button>
              )}

              {onOpenShortcuts && (
                <button
                  type="button"
                  onClick={onOpenShortcuts}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--border-default)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                >
                  <span className="flex items-center gap-2">
                    <Keyboard className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span>Keyboard Shortcuts</span>
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">?</span>
                </button>
              )}

              <div className="flex items-center justify-between p-2 rounded-md bg-[var(--bg-surface-alt)] text-xs">
                <span className="text-[var(--text-secondary)]">Theme</span>
                <button
                  type="button"
                  onClick={(e) => onToggleTheme(e)}
                  className="p-1 rounded text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                >
                  {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </button>
              </div>

              {currentUser ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-red-500/10 text-red-500 text-xs font-medium hover:bg-red-500/20 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                >
                  <span>Sign out ({currentUser.email?.split("@")[0] || "User"})</span>
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="w-full flex items-center justify-center p-2 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--border-default)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                >
                  <span>Sign in</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-2 border-t border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            title="Toggle theme"
            className="p-2 rounded-md hover:bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      )}
    </aside>
  );
}
