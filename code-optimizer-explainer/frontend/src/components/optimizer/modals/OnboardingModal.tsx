import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Code,
  User,
  Zap,
  LogIn,
} from "lucide-react";
import type { ExplainDepth, HumanizeMode } from "./PreferencesDropdown";
import type { ActionId } from "@/api/backend";

export interface OnboardingPreferences {
  userRole: string;
  primaryGoal: ActionId | "all";
  languages: string[];
  humanizerTypes: string[];
  explainDepth: ExplainDepth;
  saveHistory: boolean;
  completedAt: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (prefs: OnboardingPreferences) => void;
  onOpenLogin: () => void;
}

const TOTAL_STEPS = 6;

export function OnboardingModal({
  isOpen,
  onClose,
  onComplete,
  onOpenLogin,
}: OnboardingModalProps) {
  const [step, setStep] = useState(1);

  // State for all 6 questions
  const [userRole, setUserRole] = useState("Professional Developer");
  const [primaryGoal, setPrimaryGoal] = useState<ActionId | "all">("explain");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([
    "JavaScript / TypeScript",
    "Python",
  ]);
  const [humanizerTypes, setHumanizerTypes] = useState<string[]>([
    "Make AI-generated code look human-written",
    "Add natural, human-style comments",
  ]);
  const [explainDepth, setExplainDepth] = useState<ExplainDepth>("intermediate");
  const [saveHistoryChoice, setSaveHistoryChoice] = useState(false);

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const toggleHumanizerType = (ht: string) => {
    setHumanizerTypes((prev) =>
      prev.includes(ht) ? prev.filter((t) => t !== ht) : [...prev, ht]
    );
  };

  const handleFinish = (wantsLogin = saveHistoryChoice) => {
    const prefs: OnboardingPreferences = {
      userRole,
      primaryGoal,
      languages: selectedLanguages,
      humanizerTypes,
      explainDepth,
      saveHistory: wantsLogin,
      completedAt: new Date().toISOString(),
    };
    onComplete(prefs);
    if (wantsLogin) {
      onOpenLogin();
    }
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else handleFinish();
  };

  const prevStep = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] bg-[#0d0d0f] text-zinc-100 border border-zinc-800 shadow-2xl p-0 overflow-hidden rounded-2xl">
        {/* Header Banner & Stepper Progress */}
        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent p-6 pb-4 border-b border-zinc-800/80 relative">
          <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider mb-2 pr-8">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="truncate">Welcome to OptiCode Setup</span>
            <span className="ml-auto text-zinc-400 text-[11px] font-medium shrink-0">
              Step {step} of {TOTAL_STEPS}
            </span>
          </div>

          <DialogTitle className="text-xl font-black text-white">
            {step === 1 && "What best describes you?"}
            {step === 2 && "What do you primarily want help with today?"}
            {step === 3 && "Which programming language(s) do you mainly work with?"}
            {step === 4 && "What type of humanizing do you need?"}
            {step === 5 && "How much detail do you want in explanations?"}
            {step === 6 && "Would you like to save your history?"}
          </DialogTitle>
          
          <DialogDescription className="text-xs text-zinc-400 mt-1">
            Personalizing your workspace takes less than 20 seconds.
          </DialogDescription>

          {/* Stepper Progress Bar */}
          <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 rounded-full"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto no-scrollbar">
          {/* QUESTION 1 */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { label: "Student", desc: "Learning to code & studying concepts", icon: User },
                { label: "Professional Developer", desc: "Building & optimizing production code", icon: Code },
                { label: "Non-coder / Beginner", desc: "Need plain-English explanations", icon: Sparkles },
                { label: "Just exploring", desc: "Testing out AI capabilities", icon: Zap },
              ].map(({ label, desc, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setUserRole(label);
                    nextStep();
                  }}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition cursor-pointer ${
                    userRole === label
                      ? "border-orange-500 bg-orange-500/10 text-white shadow-sm"
                      : "border-zinc-800/90 bg-[#141417] text-zinc-300 hover:border-zinc-700 hover:bg-[#1a1a1f]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Icon className="h-4 w-4 text-orange-400" />
                    {userRole === label && <Check className="h-4 w-4 text-orange-400" />}
                  </div>
                  <span className="text-xs font-bold text-white">{label}</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* QUESTION 2 */}
          {step === 2 && (
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: "explain" as ActionId, label: "Explain my code in simple terms", desc: "Plain-language walkthrough" },
                { id: "shorten" as ActionId, label: "Optimize / shorten my code", desc: "Remove clutter & minify snippet" },
                { id: "humanize" as ActionId, label: "Make AI-written code look more human", desc: "Natural style, comments & variables" },
                { id: "seo-optimize" as ActionId, label: "Make my code SEO-friendly", desc: "HTML meta tags & semantic structure" },
                { id: "alternatives" as ActionId, label: "Get alternative ways to write my code", desc: "Different implementations" },
                { id: "all" as const, label: "Not sure yet — show me everything", desc: "Explore all features & power tools" },
              ].map(({ id, label, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setPrimaryGoal(id);
                    nextStep();
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                    primaryGoal === id
                      ? "border-orange-500 bg-orange-500/10 text-white"
                      : "border-zinc-800/90 bg-[#141417] text-zinc-300 hover:border-zinc-700 hover:bg-[#1a1a1f]"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{label}</div>
                    <div className="text-[10px] text-zinc-400">{desc}</div>
                  </div>
                  {primaryGoal === id && <Check className="h-4 w-4 text-orange-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* QUESTION 3 */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">Select all that apply:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "JavaScript / TypeScript",
                  "Python",
                  "Java",
                  "C / C++",
                  "HTML / CSS",
                  "Other / Any language",
                ].map((lang) => {
                  const isChecked = selectedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                        isChecked
                          ? "border-orange-500 bg-orange-500/10 text-white"
                          : "border-zinc-800/90 bg-[#141417] text-zinc-300 hover:border-zinc-700 hover:bg-[#1a1a1f]"
                      }`}
                    >
                      <span>{lang}</span>
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center transition ${
                          isChecked ? "border-orange-500 bg-orange-500 text-white" : "border-zinc-700"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* QUESTION 4 */}
          {step === 4 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400">Select your preferred humanizer styles:</p>
              {[
                "Make AI-generated code look human-written (natural variable names & structure)",
                "Simplify code into plain-English explanations",
                "Add natural, human-style comments",
                "Rewrite code in a more casual/conversational coding style",
                "Explain code like I'm a beginner (ELI5 style)",
                "Explain code like I'm an experienced developer (concise, technical)",
              ].map((ht) => {
                const isChecked = humanizerTypes.includes(ht);
                return (
                  <button
                    key={ht}
                    type="button"
                    onClick={() => toggleHumanizerType(ht)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-medium transition cursor-pointer ${
                      isChecked
                        ? "border-orange-500 bg-orange-500/10 text-white"
                        : "border-zinc-800/90 bg-[#141417] text-zinc-300 hover:border-zinc-700 hover:bg-[#1a1a1f]"
                    }`}
                  >
                    <span className="pr-2">{ht}</span>
                    <div
                      className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition ${
                        isChecked ? "border-orange-500 bg-orange-500 text-white" : "border-zinc-700"
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* QUESTION 5 */}
          {step === 5 && (
            <div className="grid grid-cols-1 gap-2.5">
              {[
                {
                  id: "beginner" as ExplainDepth,
                  label: "Short and simple",
                  desc: "High-level summary with zero jargon.",
                },
                {
                  id: "intermediate" as ExplainDepth,
                  label: "Balanced (default)",
                  desc: "Step-by-step breakdown of logic and key concepts.",
                },
                {
                  id: "advanced" as ExplainDepth,
                  label: "Detailed and in-depth",
                  desc: "Comprehensive deep-dive including complexity & edge cases.",
                },
              ].map(({ id, label, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setExplainDepth(id)}
                  className={`flex items-start justify-between p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    explainDepth === id
                      ? "border-orange-500 bg-orange-500/10 text-white"
                      : "border-zinc-800/90 bg-[#141417] text-zinc-300 hover:border-zinc-700 hover:bg-[#1a1a1f]"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{label}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{desc}</div>
                  </div>
                  {explainDepth === id && <Check className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          )}

          {/* QUESTION 6 */}
          {step === 6 && (
            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSaveHistoryChoice(true);
                  handleFinish(true);
                }}
                className="flex items-center gap-3 p-4 rounded-xl border border-orange-500/40 bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-left hover:border-orange-500 transition cursor-pointer group"
              >
                <div className="h-10 w-10 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <LogIn className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-orange-400 transition">
                    Yes, let me log in
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Sync your optimizations & code history across all devices.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSaveHistoryChoice(false);
                  handleFinish(false);
                }}
                className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800/90 bg-[#141417] text-left hover:border-zinc-700 hover:bg-[#1a1a1f] transition cursor-pointer group"
              >
                <div className="h-10 w-10 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">No, just let me use it now</div>
                  <div className="text-[10px] text-zinc-400">
                    Jump straight into the workspace (no account needed).
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between p-4 bg-[#0a0a0c] border-t border-zinc-800/80">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={prevStep}
              className="gap-1.5 text-xs text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleFinish(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Skip Setup
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={nextStep}
            className="gap-1.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20"
          >
            <span>{step === TOTAL_STEPS ? "Finish Setup" : "Next"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
