import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { BarChart3, Clock, FileCode, Sparkles } from "lucide-react";

import type { HistoryItem } from "../sidebar/SidebarHistory";

interface DashboardCardsProps {
  totalSessions: number;
  totalLines: number;
  history: HistoryItem[];
  recentAction?: string;
}

const ACTION_LABELS: Record<string, string> = {
  explain: "Explain",
  humanize: "Humanize",
  prettify: "Prettify",
  shorten: "Shorten",
  "seo-optimize": "SEO Optimize",
  alternatives: "Alternatives",
};

export function DashboardCards({ totalSessions, totalLines, recentAction, history }: DashboardCardsProps) {
  const cards = [
    {
      title: "Sessions",
      value: totalSessions,
      icon: BarChart3,
      accent: "from-orange-500/15 to-pink-500/10",
    },
    {
      title: "Lines of code",
      value: totalLines,
      icon: FileCode,
      accent: "from-pink-500/15 to-orange-500/10",
    },
    {
      title: "Last action",
      value: recentAction ? ACTION_LABELS[recentAction] || recentAction : "—",
      icon: recentAction ? Clock : Sparkles,
      accent: "from-orange-400/15 to-pink-400/10",
    },
  ];

  // Prepare chart data for the last 7 days
  const chartData = (() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    // Initialize array with last 7 days
    const data: { date: string; sessions: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      data.push({ date: label, sessions: 0 });
    }
    // Count sessions per day
    history.forEach(item => {
      const d = new Date(item.timestamp);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const entry = data.find(d => d.date === label);
      if (entry) entry.sessions += 1;
    });
    return data;
  })();

  return (
    <>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 sm:px-6 py-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
        }}
      >
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              className="relative rounded-xl border border-border bg-card/60 backdrop-blur-sm p-3.5 overflow-hidden hover:border-primary/30 transition-colors"
              variants={{
                hidden: { opacity: 0, y: -8, scale: 0.98 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
              }}
              whileHover={{ y: -2 }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-60 pointer-events-none`} />
              <img
                src="/assets/image_2.png"
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover opacity-[0.06] pointer-events-none mix-blend-overlay"
              />
              <div className="relative flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    {card.title}
                  </div>
                  <div className="text-base font-semibold text-foreground truncate">{card.value}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      {/* Sessions chart */}
      <motion.div
        className="mt-4 px-4 sm:px-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { duration: 0.5 } },
        }}
      >
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="sessions" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </>
  );
}
