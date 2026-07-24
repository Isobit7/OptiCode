import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

interface DashboardProps {
  totalSessions: number;
  totalLines: number;
  recentAction?: string;
}

export function Dashboard({ totalSessions, totalLines, recentAction }: DashboardProps) {
  return (
    <motion.div
      className="relative rounded-xl bg-muted/10 border border-muted/20 overflow-hidden mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >

      <div className="relative p-4 sm:p-6">
        <h2 className="text-lg font-medium text-foreground flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" /> Dashboard
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-sm">
            <span className="font-semibold text-primary">Sessions:</span> {totalSessions}
          </div>
          <div className="text-sm">
            <span className="font-semibold text-primary">Lines of code:</span> {totalLines}
          </div>
          {recentAction && (
            <div className="col-span-2 text-sm">
              <span className="font-semibold text-primary">Last action:</span> {recentAction}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
