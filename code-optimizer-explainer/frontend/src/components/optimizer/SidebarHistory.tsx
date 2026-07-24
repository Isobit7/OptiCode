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
}: Props) {
  const [activeTab, setActiveTab] = useState<"all" | "starred" | "templates">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredHistory = history.filter((item) => {
    if (activeTab === "starred" && !item.starred) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.code.toLowerCase().includes(query) ||
      ACTION_LABELS[item.action]?.toLowerCase().includes(query) ||
      item.language.toLowerCase().includes(query)
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
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `code_companion_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const totalLines = history.reduce((acc, item) => acc + item.code.split("\n").length, 0);

  return (
    <aside
      className={[
        "sticky top-0 h-screen flex flex-col transition-all duration-300 ease-in-out border-r border-white/40 dark:border-zinc-800/90 text-zinc-900 dark:text-[#FAFAFA] shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] z-30 shrink-0",
        "bg-white/35 dark:bg-[#0C0C0E]/95 backdrop-blur-2xl backdrop-saturate-150",
        collapsed ? "w-16" : "w-72 sm:w-80",
      ].join(" ")}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-white/20 dark:border-zinc-800 bg-white/15 dark:bg-[#121215]/80 backdrop-blur-md">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 text-zinc-950 dark:text-white font-semibold tracking-tight">
            <img
              src="/logo.png"
              alt="OptiCode Logo"
              className="h-8 w-8 rounded-xl object-cover shadow-md border border-white/20"
            />
            <div className="flex flex-col">
              <span className="font-headings text-sm font-bold leading-tight">OptiCode</span>
              <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono font-medium flex items-center gap-1">
                Dashboard ({history.length})
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand Dashboard"
            className="grid h-9 w-9 mx-auto place-items-center rounded-xl bg-white/40 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 shadow-sm border border-white/40 dark:border-white/15 hover:scale-105 transition cursor-pointer"
          >
            <PanelLeftOpen className="h-4.5 w-4.5" />
          </button>
        )}

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="p-1.5 rounded-xl text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <PanelLeftClose className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {/* New Session Button */}
      <div className="p-3">
        <button
          type="button"
          onClick={onNewSession}
          title="New Optimization Session"
          className={[
            "w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900/90 text-white hover:bg-zinc-950 font-medium py-2.5 px-3 transition-all duration-200 shadow-md cursor-pointer hover:shadow-lg active:scale-98 border border-white/20 backdrop-blur-md",
            collapsed ? "aspect-square p-0" : "",
          ].join(" ")}
        >
          <Plus className="h-4.5 w-4.5 shrink-0 stroke-[2.5]" />
          {!collapsed && <span className="text-sm font-semibold">New Session</span>}
        </button>
      </div>

      {/* Navigation Tabs (Expanded mode) */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="flex p-1 bg-white/20 rounded-xl border border-white/30 backdrop-blur-md text-xs font-medium text-zinc-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={[
                "flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center",
                activeTab === "all"
                  ? "bg-white/70 text-zinc-950 shadow-sm font-semibold border border-white/80"
                  : "hover:text-zinc-950 hover:bg-white/20",
              ].join(" ")}
            >
              History
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("starred")}
              className={[
                "flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1",
                activeTab === "starred"
                  ? "bg-white/70 text-zinc-950 shadow-sm font-semibold border border-white/80"
                  : "hover:text-zinc-950 hover:bg-white/20",
              ].join(" ")}
            >
              <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
              <span>Starred</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={[
                "flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1",
                activeTab === "templates"
                  ? "bg-white/70 text-zinc-950 shadow-sm font-semibold border border-white/80"
                  : "hover:text-zinc-950 hover:bg-white/20",
              ].join(" ")}
            >
              <FileCode2 className="h-3 w-3 text-orange-500" />
              <span>Templates</span>
            </button>
          </div>
        </div>
      )}

      {/* Search Input (visible when expanded & history view) */}
      {!collapsed && activeTab !== "templates" && (
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history & tags..."
              className="w-full bg-white/25 border border-white/40 backdrop-blur-md rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-950 placeholder:text-zinc-500 outline-none focus:border-white focus:bg-white/50 shadow-2xs transition"
            />
          </div>
        </div>
      )}

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1.5 scrollbar-thin">
        {/* Templates Tab */}
        {!collapsed && activeTab === "templates" ? (
          <div className="space-y-2 p-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 px-1">
              Sample Code Templates
            </div>
            {TEMPLATES.map((tmpl, idx) => (
              <div
                key={idx}
                onClick={() => onSelectTemplate(tmpl.code, tmpl.language)}
                className="group p-2.5 rounded-xl border border-white/40 bg-white/25 backdrop-blur-md hover:bg-white/50 hover:border-orange-300 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer text-left"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-950 group-hover:text-orange-600 transition">
                  <div className="flex items-center gap-1.5">
                    <FileCode2 className="h-3.5 w-3.5 text-orange-500" />
                    <span>{tmpl.title}</span>
                  </div>
                  <span className="text-[10px] font-mono font-normal bg-white/40 text-zinc-800 px-1.5 py-0.5 rounded border border-white/40">
                    {tmpl.language}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-700 mt-1 line-clamp-1">{tmpl.description}</p>
              </div>
            ))}
          </div>
        ) : /* History / Starred View */
        filteredHistory.length === 0 ? (
          !collapsed && (
            <div className="text-center py-12 px-4 text-xs text-zinc-600 space-y-2">
              <Flame className="h-8 w-8 mx-auto text-zinc-500" />
              <p>
                {activeTab === "starred"
                  ? "No starred items yet. Click the star icon on any run to bookmark it!"
                  : searchQuery
                    ? "No matching history found"
                    : "No history yet. Run an optimization to get started!"}
              </p>
            </div>
          )
        ) : (
          filteredHistory.map((item) => {
            const Icon = ACTION_ICONS[item.action] || Code2;
            const isSelected = activeId === item.id;

            if (collapsed) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectHistory(item)}
                  title={`${ACTION_LABELS[item.action]}: ${item.code.slice(0, 40)}...`}
                  className={[
                    "w-10 h-10 mx-auto grid place-items-center rounded-xl transition cursor-pointer relative backdrop-blur-md",
                    isSelected
                      ? "bg-zinc-900/90 text-white shadow-md border border-white/20"
                      : "bg-white/25 text-zinc-800 border border-white/40 hover:bg-white/50 hover:text-zinc-950",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {item.starred && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            }

            return (
              <div
                key={item.id}
                onClick={() => onSelectHistory(item)}
                className={[
                  "group relative flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-left backdrop-blur-md",
                  isSelected
                    ? "bg-zinc-900/85 text-white border-zinc-700/80 shadow-lg"
                    : "bg-white/25 border-white/40 text-zinc-900 hover:bg-white/50 hover:border-white/70 hover:shadow-md",
                ].join(" ")}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Icon
                      className={
                        isSelected ? "h-3.5 w-3.5 text-orange-400" : "h-3.5 w-3.5 text-orange-600"
                      }
                    />
                    <span>{ACTION_LABELS[item.action]}</span>
                    <span
                      className={
                        isSelected
                          ? "text-[10px] text-white/60 font-mono"
                          : "text-[10px] text-zinc-600 font-mono"
                      }
                    >
                      ({item.language})
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => onToggleStar(item.id, e)}
                      title={item.starred ? "Unstar item" : "Star item"}
                      className="p-1 transition cursor-pointer"
                    >
                      <Star
                        className={[
                          "h-3.5 w-3.5 transition",
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
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  className={
                    isSelected
                      ? "text-[11px] font-mono text-zinc-200 line-clamp-2 break-all bg-black/40 p-2 rounded-lg border border-white/10"
                      : "text-[11px] font-mono text-zinc-800 line-clamp-2 break-all bg-white/40 p-2 rounded-lg border border-white/50 shadow-2xs"
                  }
                >
                  {item.code.trim() || "Empty snippet"}
                </div>

                <div
                  className={
                    isSelected
                      ? "flex items-center justify-between text-[10px] text-white/50 pt-0.5"
                      : "flex items-center justify-between text-[10px] text-zinc-600 pt-0.5"
                  }
                >
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTime(item.timestamp)}
                  </span>
                  <span>{item.code.split("\n").length} lines</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Analytics, Export & Settings Footer */}
      {!collapsed ? (
        <div className="p-3 border-t border-white/20 dark:border-white/10 bg-white/15 dark:bg-black/20 backdrop-blur-md space-y-2">
          {/* Quick Stats */}
          <div className="flex items-center justify-between text-[11px] text-zinc-800 dark:text-zinc-200 bg-white/40 dark:bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/50 dark:border-white/10 shadow-2xs font-medium">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
              <span>{history.length} Runs</span>
            </div>
            <div className="font-mono text-zinc-700 dark:text-zinc-300">{totalLines} lines</div>
          </div>

          {/* Theme Settings Button */}
          <button
            type="button"
            onClick={(e) => onToggleTheme(e)}
            className="flex w-full items-center justify-between p-2 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md border border-white/70 dark:border-white/15 text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-white/80 dark:hover:bg-white/20 transition cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-zinc-700 dark:text-zinc-300 group-hover:rotate-45 transition-transform duration-300" />
              <span>Theme</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-black/10 dark:bg-black/40 px-2 py-0.5 border border-black/5 dark:border-white/10">
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
            </div>
          </button>

          <div className="flex items-center justify-between gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={exportHistoryJSON}
                title="Export history to JSON file"
                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 bg-white/50 dark:bg-white/10 backdrop-blur-md border border-white/70 dark:border-white/15 hover:bg-white/80 dark:hover:bg-white/20 py-1.5 px-2 rounded-lg transition cursor-pointer shadow-2xs"
              >
                <Download className="h-3 w-3" />
                <span>Export</span>
              </button>
            )}

            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-white/50 dark:bg-white/10 backdrop-blur-md border border-white/70 dark:border-white/15 hover:bg-red-500 hover:text-white py-1.5 px-2 rounded-lg transition cursor-pointer shadow-2xs"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-auto p-3 flex flex-col items-center gap-2 border-t border-white/20 dark:border-white/10 bg-white/15 dark:bg-black/20 backdrop-blur-md">
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
