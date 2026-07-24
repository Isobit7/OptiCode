import { motion, AnimatePresence } from "framer-motion";
import { X, Moon, Sun, UserRound, LogOut, Settings } from "lucide-react";
import type { ActionId } from "@/api/backend";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  currentUser: any;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function SettingsModal({ isOpen, onClose, theme, onToggleTheme, currentUser, onSignIn, onSignOut }: SettingsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md bg-background rounded-t-2xl shadow-xl border"
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } }}
            exit={{ y: 200, opacity: 0 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-medium text-foreground">Settings</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-muted/20 transition-colors text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Account */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Account</span>
                {currentUser ? (
                  <button onClick={onSignOut} className="flex items-center gap-1 text-sm text-primary">
                    <UserRound className="h-4 w-4" />
                    <span>{currentUser.email?.split("@")[0] || currentUser.full_name || "User"}</span>
                  </button>
                ) : (
                  <button onClick={onSignIn} className="flex items-center gap-1 text-sm text-primary">
                    <UserRound className="h-4 w-4" />
                    <span>Sign in</span>
                  </button>
                )}
              </div>
              {/* Theme */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Theme</span>
                <button
                  onClick={onToggleTheme}
                  className="flex items-center gap-1 text-sm text-primary"
                >
                  {theme === "dark" ? (
                    <><Moon className="h-4 w-4" /><span>Dark</span></>
                  ) : (
                    <><Sun className="h-4 w-4" /><span>Light</span></>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
