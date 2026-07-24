import React from "react";

export function GeneratingLoader() {
  const letters = ["G", "e", "n", "e", "r", "a", "t", "i", "n", "g"];

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full user-select-none">
        {/* Animated Rotating Gradient Glow Ring */}
        <div
          className="absolute inset-0 rounded-full animate-spin duration-3000"
          style={{
            boxShadow:
              "0 10px 20px 0 #fff inset, 0 20px 30px 0 #f97316 inset, 0 60px 60px 0 #ea580c inset",
          }}
        />

        {/* Letter by Letter Bouncing Text */}
        <div className="relative z-10 flex gap-1 font-mono text-base font-bold text-white tracking-widest">
          {letters.map((letter, idx) => (
            <span
              key={idx}
              className="inline-block animate-bounce text-orange-200 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-4 font-mono text-xs text-zinc-400 animate-pulse">
        Deep AI code analysis in progress...
      </p>
    </div>
  );
}
