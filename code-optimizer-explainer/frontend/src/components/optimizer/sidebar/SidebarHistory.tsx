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
                  : "bg-transparent hover:gradient-primary hover:text-foreground/80",
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

  if (collapsed) {
    return (
      <aside className="w-14 h-full shrink-0 border-r border-primary/30 gradient-primary backdrop-blur-md flex flex-col items-center py-3 gap-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand sidebar"
          className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNewSession}
          title="New session"
          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
        </button>
        <div className="mt-auto flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            title="Toggle theme"
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 h-full shrink-0 border-r border-primary/30 gradient-primary backdrop-blur-md flex flex-col overflow-hidden">
      <div className="p-4 border-b border-primary/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">OptiCode</span>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history…"
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg gradient-primary border border-primary/30 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
            />
          </div>
          <button
            type="button"
            onClick={onNewSession}
            title="New session"
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 p-0.5 gradient-primary rounded-lg">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 text-xs px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "all" ? "gradient-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex-1 text-xs px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "templates" ? "gradient-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Templates
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {activeTab === "all" ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                {filteredHistory.length} sessions · {totalLines} lines
              </span>
              {safeHistory.length > 0 && (
                <button
                  type="button"
                  onClick={exportHistoryJSON}
                  title="Export history"
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-3 w-3" />
                </button>
              )}
            </div>
            {safeHistory.length === 0 ? (
              <div className="text-center py-10 px-3">
                <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground/60">No history yet</p>
              </div>
            ) : (
              <>
                {renderGroup("Today", todayItems)}
                {renderGroup("This week", weekItems)}
                {renderGroup("Older", olderItems)}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {TEMPLATES.map((tpl, idx) => (
              <div
                key={idx}
                onClick={() =>
                  onSelectHistory({
                    id: `tpl_${Date.now()}_${idx}`,
                    timestamp: Date.now(),
                    action: "explain",
                    code: tpl.code,
                    language: tpl.language,
                    result: { action: "explain", output: "" },
                  } as HistoryItem)
                }
                className="p-3 rounded-lg border border-primary/30 gradient-primary hover:gradient-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-foreground">{tpl.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/70 line-clamp-2">{tpl.description}</p>
                <div className="mt-1.5 inline-block px-1.5 py-0.5 text-[9px] font-mono rounded gradient-primary text-muted-foreground">
                  {tpl.language}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-primary/30 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{safeHistory.length} sessions</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleTheme}
              title="Toggle theme"
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            {safeHistory.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                title="Clear all"
                className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {currentUser ? (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground truncate">{currentUser.email?.split("@")[0] || currentUser.full_name || "User"}</span>
            <button
              type="button"
              onClick={onSignOut}
              title="Sign out"
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <UserRound className="h-3.5 w-3.5" />
            Sign in
          </button>
        )}
      </div>
    </aside>
  );
}