import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, FileCode } from 'lucide-react';

interface DashboardCardsProps {
  totalSessions: number;
  totalLines: number;
  recentAction?: string;
}

export function DashboardCards({ totalSessions, totalLines, recentAction }: DashboardCardsProps) {
  const cards = [
    {
      title: 'Sessions',
      value: totalSessions,
      icon: <BarChart3 className="h-5 w-5 text-primary" />, // chart icon
    },
    {
      title: 'Lines of code',
      value: totalLines,
      icon: <FileCode className="h-5 w-5 text-primary" />, // code icon
    },
    ...(recentAction
      ? [{
          title: 'Last action',
          value: recentAction,
          icon: <Clock className="h-5 w-5 text-primary" />, // clock icon
        }]
      : []),
  ];

  return (
    <motion.div
      className="grid gap-4 md:grid-cols-3 mb-6"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
      }}
    >
      {cards.map((card, idx) => (
        <motion.div
          key={idx}
          className="relative rounded-xl bg-muted/10 border border-muted/20 p-4 overflow-hidden"
          variants={{
            hidden: { opacity: 0, y: -10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
          }}
        >
          {/* Optional decorative background */}
          <img
            src="/assets/image_2.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
          />
          <div className="relative flex items-center gap-3">
            <div>{card.icon}</div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{card.title}</div>
              <div className="text-lg font-bold text-foreground">{card.value}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
