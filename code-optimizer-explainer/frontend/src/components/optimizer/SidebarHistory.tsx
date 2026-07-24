import { useState } from "react";
import {
  Search,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  Clock,
  Sparkles,
  BookOpen,
  UserRound,
  Minimize2,
  Shuffle,
  Star,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Download,
  BarChart3,
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
  onDeleteHistory: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
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
  onDeleteHistory,
  onClearAll,
  theme,
  onToggleTheme,
  currentUser,
  onSignIn,
  onSignOut,
}: Props) {
  const [activeTab, setActiveTab] = useState<"all" | "templates">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const safeHistory = Array.isArray(history) ? history : [];
  const filteredHistory = safeHistory.filter((item) => {
    if (!item) return false;
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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(safeHistory, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `code_companion_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const totalLines = safeHistory.reduce((acc, item) => acc + (item?.code ? item.code.split("\n").length : 0), 0);

  const todayTs = new Date().setHours(0, 0, 0, 0);
  const sevenDaysTs = todayTs - 7 * 86400 * 1000;
  const todayItems = filteredHistory.filter((i) => i.timestamp >= todayTs);
  const weekItems = filteredHistory.filter((i) => i.timestamp < todayTs && i.timestamp >= sevenDaysTs);
  const olderItems = filteredHistory.filter((i) => i.timestamp < sevenDaysTs);

  const renderGroup = (title: string, items: HistoryItem[]) => {
    if (items.length === 0 || collapsed) return null;
    return (
      <div key={title} className="space-y-1 mt-2">
        <div className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider px-1 pt-1">
          {title} ({items.length})
        </div>
        {items.map((item) => {
          const Icon = ACTION_ICONS[item.action] || BookOpen;
          const isSelected = activeId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onSelectHistory(item)}
              className={[
                "relative flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-all duration-200 cursor-pointer text-left backdrop-blur-md hover:translate-x-0.5 shadow-xs",
                isSelected
                  ? "bg-accent/20 text-accent border-accent/40 font-medium"
                  : "bg-transparent hover:bg-muted/30 hover:text-foreground/80",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-accent" : "text-muted-foreground"}`} />
                <div className="min-w-0 flex-1 flex items-center gap-1.5 text-xs">
                  <span className="font-medium text-foreground/90 shrink-0">{ACTION_LABELS[item.action]}</span>
                  <span className="text-[10px] text-muted-foreground/70 font-mono truncate flex-1 min-w-0">{item.code.trim() || ""}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] text-muted-foreground/50 font-mono hidden sm:inline">{formatTime(item.timestamp)}</span>
                <button
                  type="button"
                  onClick={(e) => onDeleteHistory(item.id, e)}
                  title="Delete"
                  className="p-1 transition-all hover:bg-destructive/10 hover:text-destructive"
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

  return (
    <aside
      className={[
        "sticky top-0 h-screen flex flex-col transition-all duration-300 ease-in-out border-r border-border/50 dark:border-border/10 text-foreground dark:text-background/90 shadow-md z-30 shrink-0",
        "bg-background/45 dark:bg-background/10 backdrop-blur-2xl backdrop-saturate-150",
        collapsed ? "w-12" : "w-52 sm:w-56",
      ].join(" ")}
    >
      <div className="flex items-center justify-between p-2 border-b border-border/30 dark:border-border/10 bg-background/20 dark:bg-background/10/80 backdrop-blur-md">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-6 w-6 rounded-lg object-cover shadow-xs border border-border/30" />
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="p-1 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-2">
        <button
          type="button"
          onClick={onNewSession}
          title="New session"
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors py-2 px-2.5 hover:-translate-y-0.5 active:scale-95 border border-accent/20 backdrop-blur-md"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v7m0 0l3-3m-3 3-3-3"/></svg>
          {!collapsed && <span className="text-xs font-medium">New</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-8 pr-2 py-1 text-xs bg-transparent placeholder:text-muted-foreground/60 focus:outline-none focus:text-foreground"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1.5 scrollbar-thin">
        {filteredHistory.length === 0 ? (
else {
          <div className="mt-auto p-2 flex flex-col items-center gap-2 border-t border-border/20 dark:border-border/10 bg-background/10 dark:bg-background/5 backdrop-blur-md">
            <button
              type="button"
              onClick={(e) => onToggleTheme(e)}
            }
          }
        )
            <div className="text-center py-8 px-4 text-xs text-muted-foreground/60 space-y-2">
              {searchQuery ? (
                <>
                  <Search className="h-6 w-6 mx-auto text-muted-foreground/40 animate-pulse" />
                  <p className="mt-2">No matches found</p>
                  <p className="text-[9px]">Try a different search term</p>
                </>
              ) : (
                <>
                  <History className="h-6 w-6 mx-auto text-muted-foreground/40 animate-pulse" />
                  <p className="mt-2">No history yet</p>
                  <p className="text-[9px]">Run an optimization to record your session here</p>
                </>
              )}
            </div>
          )
        ) : (
          <>
            {todayItems.length > 0 && renderGroup("Today", todayItems)}
            {weekItems.length > 0 && renderGroup("Last 7 Days", weekItems)}
            {olderItems.length > 0 && renderGroup("Older", olderItems)}
          </>
        )}
        
        {!collapsed && (
          <div className="p-2 border-t border-border/20 dark:border-border/10 bg-background/10 dark:bg-background/5 backdrop-blur-md space-y-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={[
                "w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 cursor-pointer border backdrop-blur-md text-xs font-medium shadow-xs",
                activeTab === "all"
                  ? "bg-accent/10 text-accent border-accent/40 shadow-sm"
                  : "bg-transparent hover:bg-muted/30 hover:text-foreground/80",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-accent" />
                <span>History</span>
              </div>
              <span className="text-[9px] text-muted-foreground/60 font-mono rounded-full px-1.5 py-0.5 bg-accent/20 text-accent">{safeHistory.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={[
                "w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 cursor-pointer border backdrop-blur-md text-xs font-medium shadow-xs",
                activeTab === "templates"
                  ? "bg-accent/10 text-accent border-accent/40 shadow-sm"
                  : "bg-transparent hover:bg-muted/30 hover:text-foreground/80",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-3 w-3 text-accent" />
                <span>Templates</span>
              </div>
              <span className="text-[9px] text-muted-foreground/60 font-mono rounded-full px-1.5 py-0.5 bg-accent/20 text-accent">{TEMPLATES.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex w-full items-center justify-between p-2 rounded-lg bg-transparent hover:bg-muted/30 hover:text-foreground/80 transition"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-3 w-3 text-muted-foreground group-hover:rotate-90 transition-transform duration-300" />
                <span>Settings</span>
              </div>
            </button>

            {isSettingsOpen && (
              <div className="space-y-2 pt-1 animate-fade-in-up border-t border-border/10">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/20">
                  <span className="text-xs font-medium text-muted-foreground">Account</span>
                  <button onClick={onSignOut}>
                    {currentUser ? (
                      <div className="flex items-center gap-1">
                        <UserRound className="h-2.5 w-2.5 text-accent" />
                        <span className="text-[9px] font-medium">{currentUser.email?.split("@")[0] || currentUser.full_name || "User"}</span>
                      </div>
                    ) : (
                      <button onClick={onSignIn}>
                        <UserRound className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[9px] font-medium">Sign in</span>
                      </button>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/20">
                  <span className="text-xs font-medium text-muted-foreground">Theme</span>
                  <button onClick={(e) => onToggleTheme(e)}>
                    {theme === "dark" ? (
                      <>
                        <Moon className="h-2.5 w-2.5 text-accent" />
                        <span className="text-[9px] font-medium">Dark</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-2.5 w-2.5 text-accent" />
                        <span className="text-[9px] font-medium">Light</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/20">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-2.5 w-2.5 text-muted-foreground" />
                    <span>{safeHistory.length} runs</span>
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground">{totalLines} lines</div>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                  {safeHistory.length > 0 && (
                    <button onClick={exportHistoryJSON} className="flex-1 flex items-center justify-center gap-1 text-[9px] font-medium text-muted-foreground bg-muted/30 hover:bg-muted/40 py-1 px-2 rounded-lg transition">
                      <Download className="h-2.5 w-2.5" />
                      <span>Export</span>
                    </button>
                  )}
                  {safeHistory.length > 0 && (
                    <button onClick={onClearAll} className="flex-1 flex items-center justify-center gap-1 text-[9px] font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 py-1 px-2 rounded-lg transition">
                      <Trash2 className="h-2.5 w-2.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>
)}
          </div>

        {!collapsed && (
          <div className="mt-auto p-2 flex flex-col items-center gap-2 border-t border-border/20 dark:border-border/10 bg-background/10 dark:bg-background/5 backdrop-blur-md">
            <button
              type="button"
              onClick={(e) => onToggleTheme(e)}
              title={theme === "dark" ? "Light theme" : "Dark theme"}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Moon className="h-3 w-3 text-accent" /> : <Sun className="h-3 w-3 text-accent" />}
            </button>
          </div>
        )}
      </aside>
    );
  }