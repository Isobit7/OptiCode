import { useState } from "react";
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
  prettify: Sparkles,
  shorten: Minimize2,
  "seo-optimize": Search,
  alternatives: Shuffle,
};

const ACTION_LABELS: Record<ActionId, string> = {
  explain: "Explain",
  humanize: "Humanize",
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
        "sticky top-0 h-screen flex flex-col transition-all duration-300 ease-in-out border-r border-white/50 dark:border-white/10 text-zinc-900 dark:text-[#FAFAFA] shadow-warm-md z-30 shrink-0",
        "bg-white/45 dark:bg-[#0C0C0E]/90 backdrop-blur-2xl backdrop-saturate-150",
        collapsed ? "w-14" : "w-56 sm:w-64",
      ].join(" ")}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between p-2.5 border-b border-white/30 dark:border-white/10 bg-white/20 dark:bg-[#121215]/80 backdrop-blur-md">
        {!collapsed ? (
          <div className="flex items-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-7 w-7 rounded-lg object-cover shadow-xs border border-white/30"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand Dashboard"
            className="grid h-9 w-9 mx-auto place-items-center rounded-lg bg-white/40 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 shadow-xs border border-white/40 dark:border-white/15 hover:scale-105 transition cursor-pointer"
          >
            <PanelLeftOpen className="h-4.5 w-4.5" />
          </button>
        )}

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="p-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* New Session Button */}
      <div className="p-2.5">
        <button
          type="button"
          onClick={onNewSession}
          title="New Optimization Session"
          className={[
            "w-full flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900/90 text-white hover:bg-zinc-950 font-medium py-2 px-2.5 transition-all duration-200 shadow-warm-sm cursor-pointer hover:-translate-y-0.5 active:scale-95 border border-white/20 backdrop-blur-md",
            collapsed ? "aspect-square p-0" : "",
          ].join(" ")}
        >
          <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
          {!collapsed && <span className="text-xs font-semibold">New Session</span>}
        </button>
      </div>

      {/* Search Input (visible when expanded) */}
      {!collapsed && (
        <div className="px-2.5 pb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3 w-3 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "starred" ? "Search starred items..." : "Search history..."}
              className="w-full bg-white/25 border border-white/40 backdrop-blur-md rounded-xl pl-7 pr-2.5 py-1 text-[11px] text-zinc-950 placeholder:text-zinc-500 outline-none focus:border-white focus:bg-white/50 shadow-2xs transition"
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
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1 pt-1">
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
                          "group relative flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-left backdrop-blur-md hover:translate-x-0.5 shadow-2xs",
                          isSelected
                            ? "bg-zinc-900/90 text-white border-zinc-700/80 shadow-sm font-semibold"
                            : "bg-white/30 border-white/40 text-zinc-900 hover:bg-white/60 hover:border-white/70 hover:shadow-xs",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Icon
                            className={
                              isSelected ? "h-3.5 w-3.5 shrink-0 text-orange-400" : "h-3.5 w-3.5 shrink-0 text-orange-600"
                            }
                          />
                          <div className="min-w-0 flex-1 flex items-center gap-1.5 text-xs">
                            <span className="font-semibold text-zinc-950 dark:text-white shrink-0">
                              {ACTION_LABELS[item.action]}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono truncate flex-1 min-w-0">
                              {item.code.trim() || "Empty snippet"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                            {formatTime(item.timestamp)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => onToggleStar(item.id, e)}
                            title={item.starred ? "Unstar item" : "Star item"}
                            className="p-1 transition cursor-pointer"
                          >
                            <Star
                              className={[
                                "h-3 w-3 transition",
                                item.starred
                                  ? "fill-amber-400 text-amber-500"
                                  : isSelected
                                    ? "text-white/40 hover:text-amber-300"
                                    : "text-zinc-400 hover:text-amber-500",
                              ].join(" ")}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => onDeleteHistory(item.id, e)}
                            title="Delete item"
                            className={
                              isSelected
                                ? "p-1 opacity-0 group-hover:opacity-100 hover:text-red-300 text-white/50 transition cursor-pointer"
                                : "p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 text-zinc-500 transition cursor-pointer"
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

      {/* Footer Navigation Bar Section (History, Saved, & Settings) */}
      {!collapsed ? (
        <div className="p-2.5 border-t border-white/20 dark:border-white/10 bg-white/15 dark:bg-black/20 backdrop-blur-md space-y-1.5">
          {/* History Bar */}
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={[
              "w-full flex items-center justify-between p-2 rounded-xl transition-all duration-200 cursor-pointer border backdrop-blur-md text-xs font-semibold shadow-2xs",
              activeTab === "all"
                ? "bg-white/80 dark:bg-white/15 text-zinc-950 dark:text-white border-white/90 dark:border-white/20 shadow-warm-sm"
                : "bg-white/30 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 border-white/40 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span>History</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-orange-500/15 text-orange-600 dark:text-orange-300 font-bold border border-orange-500/20">
              {safeHistory.length}
            </span>
          </button>

          {/* Saved Bar */}
          <button
            type="button"
            onClick={() => setActiveTab("starred")}
            className={[
              "w-full flex items-center justify-between p-2 rounded-xl transition-all duration-200 cursor-pointer border backdrop-blur-md text-xs font-semibold shadow-2xs",
              activeTab === "starred"
                ? "bg-white/80 dark:bg-white/15 text-zinc-950 dark:text-white border-white/90 dark:border-white/20 shadow-warm-sm"
                : "bg-white/30 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 border-white/40 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <span>Saved</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold border border-amber-500/20">
              {starredItemsCount}
            </span>
          </button>

          {/* Settings Bar Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="flex w-full items-center justify-between p-2 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md border border-white/70 dark:border-white/15 text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-white/80 dark:hover:bg-white/20 transition cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-orange-500 group-hover:rotate-90 transition-transform duration-300" />
              <span>Settings</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-500 font-mono">
                {isSettingsOpen ? "Hide" : "Open"}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isSettingsOpen ? "rotate-180 text-orange-500" : "text-zinc-400"}`} />
            </div>
          </button>

          {/* Expandable Settings Drawer */}
          {isSettingsOpen && (
            <div className="space-y-2 pt-1 animate-pop-in border-t border-white/10">

              {/* Account Section inside Settings */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/10 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                  <UserRound className="h-3.5 w-3.5 text-orange-500" />
                  <span className="font-semibold">
                    {currentUser ? (currentUser.email?.split("@")[0] || currentUser.full_name || "User") : "Account"}
                  </span>
                </div>
                {currentUser ? (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex items-center gap-1 rounded-lg bg-red-500/15 px-2 py-1 border border-red-500/25 text-red-600 dark:text-red-400 hover:bg-red-500/25 transition cursor-pointer"
                  >
                    <LogOut className="h-3 w-3" />
                    <span className="text-[10px] font-semibold">Sign out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="flex items-center gap-1 rounded-lg bg-orange-500/15 px-2 py-1 border border-orange-500/25 text-orange-600 dark:text-orange-400 hover:bg-orange-500/25 transition cursor-pointer"
                  >
                    <span className="text-[10px] font-semibold">Sign in</span>
                  </button>
                )}
              </div>

              {/* Theme Selector inside Settings */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/10 text-xs font-medium">
                <span className="text-zinc-700 dark:text-zinc-300 font-semibold">Theme</span>
                <button
                  type="button"
                  onClick={(e) => onToggleTheme(e)}
                  className="flex items-center gap-1.5 rounded-lg bg-black/10 dark:bg-black/40 px-2 py-1 border border-black/5 dark:border-white/10 hover:scale-105 transition cursor-pointer"
                >
                  {theme === "dark" ? (
                    <>
                      <Moon className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-[11px] font-mono font-medium text-amber-400">Dark</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[11px] font-mono font-medium text-amber-600">Light</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center justify-between text-[10px] text-zinc-800 dark:text-zinc-200 bg-white/40 dark:bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/40 dark:border-white/10 font-medium">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
                  <span>{history.length} Runs</span>
                </div>
                <div className="font-mono text-zinc-700 dark:text-zinc-300">{totalLines} lines</div>
              </div>

              {/* Export & Clear Actions */}
              <div className="flex items-center justify-between gap-1.5 pt-0.5">
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={exportHistoryJSON}
                    title="Export history to JSON file"
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-zinc-900 dark:text-zinc-100 bg-white/50 dark:bg-white/10 backdrop-blur-md border border-white/70 dark:border-white/15 hover:bg-white/80 dark:hover:bg-white/20 py-1 px-2 rounded-lg transition cursor-pointer shadow-2xs"
                  >
                    <Download className="h-3 w-3" />
                    <span>Export</span>
                  </button>
                )}

                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-white/50 dark:bg-white/10 backdrop-blur-md border border-white/70 dark:border-white/15 hover:bg-red-500 hover:text-white py-1 px-2 rounded-lg transition cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-auto p-2.5 flex flex-col items-center gap-2 border-t border-white/20 dark:border-white/10 bg-white/15 dark:bg-black/20 backdrop-blur-md">
          <button
            type="button"
            onClick={(e) => onToggleTheme(e)}
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/50 dark:bg-white/10 border border-white/70 dark:border-white/15 text-zinc-800 dark:text-zinc-200 hover:bg-white/80 dark:hover:bg-white/20 transition cursor-pointer shadow-2xs group"
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
            ) : (
              <Sun className="h-4 w-4 text-amber-600 group-hover:rotate-45 transition-transform duration-300" />
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
